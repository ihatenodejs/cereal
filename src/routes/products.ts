import { eq } from "drizzle-orm";

import { db } from "../db/index.ts";
import { applications } from "../db/schema.ts";
import { authenticate } from "../middleware/auth.ts";

interface ProductRequestBody {
  id?: string;
  name?: string;
  availableTiers?: string[];
}

export async function handleProductsRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (!(await authenticate(req))) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (req.method === "GET") {
    if (url.pathname === "/products/list") {
      const limit = Number(url.searchParams.get("limit")) || 10;
      const page = Number(url.searchParams.get("page")) || 1;
      const offset = (page - 1) * limit;

      const productList = await db
        .select()
        .from(applications)
        .limit(Math.min(limit, 100))
        .offset(offset);

      return new Response(JSON.stringify(productList), {
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = (await req.json()) as ProductRequestBody;

    if (url.pathname === "/products/add") {
      const { id, name, availableTiers } = body;
      if (!id || !name) {
        return new Response("Missing id or name", { status: 400 });
      }

      if (availableTiers !== undefined) {
        if (!Array.isArray(availableTiers)) {
          return new Response("availableTiers must be an array", {
            status: 400,
          });
        }

        if (availableTiers.some((tier) => !tier || tier.trim() === "")) {
          return new Response("availableTiers cannot contain empty strings", {
            status: 400,
          });
        }

        const uniqueTiers = new Set(availableTiers);
        if (uniqueTiers.size !== availableTiers.length) {
          return new Response("availableTiers cannot contain duplicates", {
            status: 400,
          });
        }
      }

      await db.insert(applications).values({
        id,
        name,
        availableTiers: availableTiers || null,
      });
      return new Response(JSON.stringify({ success: true, id, name }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/products/edit") {
      const { id, name, availableTiers } = body;
      if (!id) {
        return new Response("Missing id", { status: 400 });
      }

      if (availableTiers !== undefined) {
        if (!Array.isArray(availableTiers)) {
          return new Response("availableTiers must be an array", {
            status: 400,
          });
        }

        if (availableTiers.some((tier) => !tier || tier.trim() === "")) {
          return new Response("availableTiers cannot contain empty strings", {
            status: 400,
          });
        }

        const uniqueTiers = new Set(availableTiers);
        if (uniqueTiers.size !== availableTiers.length) {
          return new Response("availableTiers cannot contain duplicates", {
            status: 400,
          });
        }
      }

      const updateData: { name?: string; availableTiers?: string[] | null } =
        {};
      if (name !== undefined) updateData.name = name;
      if (availableTiers !== undefined) {
        updateData.availableTiers = availableTiers.length
          ? availableTiers
          : null;
      }

      if (Object.keys(updateData).length > 0) {
        await db
          .update(applications)
          .set(updateData)
          .where(eq(applications.id, id));
      }

      return new Response(JSON.stringify({ success: true, id }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/products/delete") {
      const { id } = body;
      if (!id) {
        return new Response("Missing id", { status: 400 });
      }

      await db.delete(applications).where(eq(applications.id, id));
      return new Response(JSON.stringify({ success: true, id }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  } catch (error) {
    console.error("Product error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
