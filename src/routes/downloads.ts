import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { and, eq } from "drizzle-orm";

import { db } from "../db/index.ts";
import { applications, downloads, licenses } from "../db/schema.ts";
import { authenticate } from "../middleware/auth.ts";

const UPLOADS_DIR = process.env["UPLOADS_DIR"] ?? "./uploads";

function getFilePath(productId: string, version: string, filename: string) {
  return join(UPLOADS_DIR, productId, version, filename);
}

async function validateLicenseKey(
  licenseKey: string,
): Promise<
  { valid: false; response: Response } | { valid: true; productId: string }
> {
  const [license] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.key, licenseKey))
    .limit(1);

  if (!license) {
    return {
      valid: false,
      response: Response.json(
        { valid: false, reason: "License key not found" },
        { status: 403 },
      ),
    };
  }

  if (license.expirationDate && license.expirationDate < new Date()) {
    return {
      valid: false,
      response: Response.json(
        { valid: false, reason: "License has expired" },
        { status: 403 },
      ),
    };
  }

  return { valid: true, productId: license.productId };
}

export async function handleDownloadsRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // ── Public: list files for a licensed product ────────────────────────────
  if (url.pathname === "/downloads/files") {
    if (req.method !== "GET") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const licenseKey = url.searchParams.get("licenseKey");
    if (!licenseKey) {
      return new Response("Missing licenseKey", { status: 400 });
    }

    try {
      const result = await validateLicenseKey(licenseKey);
      if (!result.valid) {
        return result.response;
      }

      const files = await db
        .select()
        .from(downloads)
        .where(eq(downloads.productId, result.productId));

      const baseUrl = `${url.protocol}//${url.host}`;
      const fileList = files.map((file) => ({
        id: file.id,
        version: file.version,
        filename: file.filename,
        url: `${baseUrl}/downloads/get/${file.id}?licenseKey=${encodeURIComponent(licenseKey)}`,
        sha256: file.sha256,
        createdAt: file.createdAt,
      }));

      return Response.json(fileList);
    } catch (error) {
      console.error("Downloads files error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  // ── Public: download a specific file ────────────────────────────────────
  const getMatch = url.pathname.match(/^\/downloads\/get\/([^/]+)$/);
  if (getMatch) {
    if (req.method !== "GET") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const fileId = getMatch[1]!;
    const licenseKey = url.searchParams.get("licenseKey");
    if (!licenseKey) {
      return new Response("Missing licenseKey", { status: 400 });
    }

    try {
      const licenseResult = await validateLicenseKey(licenseKey);
      if (!licenseResult.valid) {
        return licenseResult.response;
      }

      const [file] = await db
        .select()
        .from(downloads)
        .where(
          and(
            eq(downloads.id, fileId),
            eq(downloads.productId, licenseResult.productId),
          ),
        )
        .limit(1);

      if (!file) {
        return new Response("File not found", { status: 404 });
      }

      const bunFile = Bun.file(file.filePath);
      if (!(await bunFile.exists())) {
        return new Response("File not found on disk", { status: 404 });
      }

      return new Response(bunFile, {
        headers: {
          "Content-Disposition": `attachment; filename="${file.filename}"`,
          "X-SHA256": file.sha256,
        },
      });
    } catch (error) {
      console.error("Downloads get error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  // ── Admin endpoints (require Bearer auth) ────────────────────────────────
  if (!(await authenticate(req))) {
    return new Response("Unauthorized", { status: 401 });
  }

  // ── Admin: list all uploads ──────────────────────────────────────────────
  if (req.method === "GET" && url.pathname === "/downloads/list") {
    const limit = Number(url.searchParams.get("limit")) || 10;
    const page = Number(url.searchParams.get("page")) || 1;
    const offset = (page - 1) * limit;

    const fileList = await db
      .select()
      .from(downloads)
      .limit(Math.min(limit, 100))
      .offset(offset);

    return Response.json(
      fileList.map((f) => ({
        id: f.id,
        productId: f.productId,
        version: f.version,
        filename: f.filename,
        sha256: f.sha256,
        createdAt: f.createdAt,
      })),
    );
  }

  // ── Admin: upload a file ─────────────────────────────────────────────────
  if (req.method === "POST" && url.pathname === "/downloads/upload") {
    try {
      const contentType = req.headers.get("content-type") ?? "";
      if (!contentType.includes("multipart/form-data")) {
        return new Response("Content-Type must be multipart/form-data", {
          status: 400,
        });
      }

      const formData = await req.formData();
      const productId = formData.get("productId");
      const version = formData.get("version");
      const file = formData.get("file");

      if (!productId || typeof productId !== "string") {
        return new Response("Missing productId", { status: 400 });
      }
      if (!version || typeof version !== "string") {
        return new Response("Missing version", { status: 400 });
      }
      if (!file || !(file instanceof File)) {
        return new Response("Missing file", { status: 400 });
      }

      const [product] = await db
        .select()
        .from(applications)
        .where(eq(applications.id, productId))
        .limit(1);

      if (!product) {
        return new Response(`Product '${productId}' not found`, {
          status: 404,
        });
      }

      const filename = file.name;
      const filePath = getFilePath(productId, version, filename);
      const dir = join(UPLOADS_DIR, productId, version);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const sha256 = createHash("sha256").update(buffer).digest("hex");

      await mkdir(dir, { recursive: true });
      await Bun.write(filePath, buffer);

      const [existing] = await db
        .select()
        .from(downloads)
        .where(
          and(
            eq(downloads.productId, productId),
            eq(downloads.version, version),
          ),
        )
        .limit(1);

      let id: string;
      if (existing) {
        ({ id } = existing);
        await db
          .update(downloads)
          .set({ filename, filePath, sha256 })
          .where(eq(downloads.id, id));
      } else {
        id = crypto.randomUUID();
        await db.insert(downloads).values({
          id,
          productId,
          version,
          filename,
          filePath,
          sha256,
        });
      }

      return Response.json({ success: true, id, sha256 });
    } catch (error) {
      console.error("Downloads upload error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  // ── Admin: delete a file ─────────────────────────────────────────────────
  if (req.method === "POST" && url.pathname === "/downloads/delete") {
    try {
      const body = (await req.json()) as { id?: string };
      const { id } = body;

      if (!id) {
        return new Response("Missing id", { status: 400 });
      }

      const [file] = await db
        .select()
        .from(downloads)
        .where(eq(downloads.id, id))
        .limit(1);

      if (!file) {
        return new Response(`Download '${id}' not found`, { status: 404 });
      }

      try {
        const fileExists = await Bun.file(file.filePath).exists();
        if (fileExists) {
          const { unlink } = await import("node:fs/promises");
          await unlink(file.filePath);
        }
      } catch {
        // Ignore filesystem errors
      }

      await db.delete(downloads).where(eq(downloads.id, id));

      return Response.json({ success: true, id });
    } catch (error) {
      console.error("Downloads delete error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  return new Response("Not Found", { status: 404 });
}
