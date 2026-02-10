import { eq } from "drizzle-orm";

import { db } from "../db/index.ts";
import { licenses } from "../db/schema.ts";
import { authenticate } from "../middleware/auth.ts";

interface LicenseRequestBody {
  productId?: string;
  tier?: string;
  expirationDate?: string;
  key?: string;
}

export async function handleLicensesRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === "/licenses/validate") {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    try {
      const body = (await req.json()) as LicenseRequestBody;
      const { key } = body;

      if (!key) {
        return new Response("Missing key", { status: 400 });
      }

      const [license] = await db
        .select()
        .from(licenses)
        .where(eq(licenses.key, key))
        .limit(1);

      if (!license) {
        return Response.json({
          valid: false,
          reason: "License key not found",
        });
      }

      if (license.expirationDate && license.expirationDate < new Date()) {
        return Response.json({
          valid: false,
          reason: "License has expired",
          expirationDate: license.expirationDate,
        });
      }

      return Response.json({
        valid: true,
        productId: license.productId,
        tier: license.tier,
        expirationDate: license.expirationDate,
        createdAt: license.createdAt,
      });
    } catch (error) {
      console.error("License validation error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  if (!(await authenticate(req))) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (req.method === "GET") {
    if (url.pathname === "/licenses/list") {
      const limit = Number(url.searchParams.get("limit")) || 10;
      const page = Number(url.searchParams.get("page")) || 1;
      const offset = (page - 1) * limit;

      const licenseList = await db
        .select()
        .from(licenses)
        .limit(Math.min(limit, 100))
        .offset(offset);

      return new Response(JSON.stringify(licenseList), {
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = (await req.json()) as LicenseRequestBody;

    if (url.pathname === "/licenses/add") {
      const { productId, tier, expirationDate } = body;
      if (!productId) {
        return new Response("Missing productId", { status: 400 });
      }

      if (tier && tier !== "basic" && tier !== "max") {
        return new Response("Invalid tier value. Must be 'basic' or 'max'", {
          status: 400,
        });
      }

      const key = crypto.randomUUID();
      await db.insert(licenses).values({
        key,
        productId,
        tier: tier ? (tier as "basic" | "max") : null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
      });

      return new Response(JSON.stringify({ success: true, key }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/licenses/edit") {
      const { key, productId, tier, expirationDate } = body;
      if (!key) {
        return new Response("Missing key", { status: 400 });
      }

      if (tier && tier !== "basic" && tier !== "max") {
        return new Response("Invalid tier value. Must be 'basic' or 'max'", {
          status: 400,
        });
      }

      const updateData: {
        productId?: string;
        tier?: "basic" | "max" | null;
        expirationDate?: Date | null;
      } = {};

      if (productId !== undefined) updateData.productId = productId;
      if (tier !== undefined)
        updateData.tier = tier ? (tier as "basic" | "max") : null;
      if (expirationDate !== undefined)
        updateData.expirationDate = expirationDate
          ? new Date(expirationDate)
          : null;

      await db.update(licenses).set(updateData).where(eq(licenses.key, key));

      return new Response(JSON.stringify({ success: true, key }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/licenses/delete") {
      const { key } = body;
      if (!key) {
        return new Response("Missing key", { status: 400 });
      }

      await db.delete(licenses).where(eq(licenses.key, key));
      return new Response(JSON.stringify({ success: true, key }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  } catch (error) {
    console.error("License error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
