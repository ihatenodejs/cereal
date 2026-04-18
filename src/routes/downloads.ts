import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { isAbsolute, join } from "node:path";

import { and, eq } from "drizzle-orm";

import {
  deleteGitDownload,
  getGitDownloadById,
  listAllGitDownloads,
  listGitDownloadsByProductId,
} from "./git-downloads.ts";
import { db } from "../db/index.ts";
import { applications, downloads, licenses } from "../db/schema.ts";
import { authenticate } from "../middleware/auth.ts";

const UPLOADS_DIR = process.env["UPLOADS_DIR"] ?? "./uploads";

function toShortCommitSha(commitSha: string): string {
  return commitSha.slice(0, 8);
}

function getFilePath(productId: string, version: string, filename: string) {
  return join(UPLOADS_DIR, productId, version, filename);
}

function getGitDiskFilePath(localPath: string, filePath: string): string {
  if (isAbsolute(filePath)) {
    return filePath;
  }

  if (filePath.startsWith(`${localPath}/`) || filePath === localPath) {
    return filePath;
  }

  return join(localPath, filePath);
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

      const [regularFiles, gitFiles] = await Promise.all([
        db
          .select()
          .from(downloads)
          .where(eq(downloads.productId, result.productId)),
        listGitDownloadsByProductId(result.productId),
      ]);

      const baseUrl = `${url.protocol}//${url.host}`;

      const regularFileList = regularFiles.map((file) => ({
        id: file.id,
        version: file.version,
        filename: file.filename,
        url: `${baseUrl}/downloads/get/${file.id}?licenseKey=${encodeURIComponent(licenseKey)}`,
        sha256: file.sha256,
        github: false,
        createdAt: file.createdAt,
      }));

      const gitFileList = gitFiles.map((file) => ({
        id: file.id,
        displayVersion: toShortCommitSha(file.commitSha),
        commitSha: file.commitSha,
        sourceType: file.sourceType,
        assetName: file.assetName,
        releaseTag: file.releaseTag,
        releaseId: file.releaseId,
        filename: file.filename,
        url: `${baseUrl}/downloads/get/${file.id}?licenseKey=${encodeURIComponent(licenseKey)}`,
        sha256: file.sha256,
        github: true,
        lastSyncAt: file.lastSyncAt,
        createdAt: file.createdAt,
      }));

      return Response.json([...regularFileList, ...gitFileList]);
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

      // Check regular downloads first
      const [regularFile] = await db
        .select()
        .from(downloads)
        .where(
          and(
            eq(downloads.id, fileId),
            eq(downloads.productId, licenseResult.productId),
          ),
        )
        .limit(1);

      let regularFileMissingOnDisk = false;

      if (regularFile) {
        const bunFile = Bun.file(regularFile.filePath);
        if (await bunFile.exists()) {
          const plaintext = url.searchParams.get("plaintext");
          if (plaintext === "true") {
            const content = await bunFile.text();
            return new Response(content, {
              headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Content-Disposition": `inline; filename="${regularFile.filename}"`,
                "X-SHA256": regularFile.sha256,
              },
            });
          }

          return new Response(bunFile, {
            headers: {
              "Content-Disposition": `attachment; filename="${regularFile.filename}"`,
              "X-SHA256": regularFile.sha256,
            },
          });
        }

        regularFileMissingOnDisk = true;
      }

      // Check git downloads
      const gitFile = await getGitDownloadById(fileId);
      if (!gitFile || gitFile.productId !== licenseResult.productId) {
        if (regularFileMissingOnDisk) {
          return new Response("File not found on disk", { status: 404 });
        }
        return new Response("File not found", { status: 404 });
      }

      const gitDiskFilePath = getGitDiskFilePath(
        gitFile.localPath,
        gitFile.filePath,
      );
      const bunFile = Bun.file(gitDiskFilePath);
      if (!(await bunFile.exists())) {
        return new Response("File not found on disk", { status: 404 });
      }

      const plaintext = url.searchParams.get("plaintext");
      if (plaintext === "true") {
        const content = await bunFile.text();
        return new Response(content, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Content-Disposition": `inline; filename="${gitFile.filename}"`,
            "X-SHA256": gitFile.sha256,
          },
        });
      }

      return new Response(bunFile, {
        headers: {
          "Content-Disposition": `attachment; filename="${gitFile.filename}"`,
          "X-SHA256": gitFile.sha256,
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

  // ── Admin: list all uploads (regular + git) ──────────────────────────────
  if (req.method === "GET" && url.pathname === "/downloads/list") {
    const limit = Number(url.searchParams.get("limit")) || 10;
    const page = Number(url.searchParams.get("page")) || 1;
    const offset = (page - 1) * limit;

    try {
      const [regularFiles, gitFiles] = await Promise.all([
        db.select().from(downloads).limit(Math.min(limit, 100)).offset(offset),
        listAllGitDownloads(Math.min(limit, 100), offset),
      ]);

      const regularFileList = regularFiles.map((f) => ({
        id: f.id,
        productId: f.productId,
        version: f.version,
        filename: f.filename,
        sha256: f.sha256,
        github: false,
        createdAt: f.createdAt,
      }));

      const gitFileList = gitFiles.map((f) => ({
        id: f.id,
        productId: f.productId,
        displayVersion: toShortCommitSha(f.commitSha),
        commitSha: f.commitSha,
        repoUrl: f.repoUrl,
        filePath: f.filePath,
        sourceType: f.sourceType,
        assetName: f.assetName,
        releaseTag: f.releaseTag,
        releaseId: f.releaseId,
        branch: f.branch,
        filename: f.filename,
        sha256: f.sha256,
        github: true,
        lastSyncAt: f.lastSyncAt,
        createdAt: f.createdAt,
      }));

      return Response.json([...regularFileList, ...gitFileList]);
    } catch (error) {
      console.error("Downloads list error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
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

      const [app] = await db
        .select()
        .from(applications)
        .where(eq(applications.id, productId))
        .limit(1);

      if (!app) {
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

      return Response.json({ success: true, id, sha256, github: false });
    } catch (error) {
      console.error("Downloads upload error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  // ── Admin: delete a file (regular or git) ────────────────────────────────
  if (req.method === "POST" && url.pathname === "/downloads/delete") {
    try {
      const body = (await req.json()) as { id?: string; github?: boolean };
      const { id, github } = body;

      if (!id) {
        return new Response("Missing id", { status: 400 });
      }

      if (github === true) {
        const deleted = await deleteGitDownload(id);
        if (!deleted) {
          return new Response(`Git download '${id}' not found`, {
            status: 404,
          });
        }
        return Response.json({ success: true, id, github: true });
      }

      const [file] = await db
        .select()
        .from(downloads)
        .where(eq(downloads.id, id))
        .limit(1);

      if (file) {
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
        return Response.json({ success: true, id, github: false });
      }

      const deleted = await deleteGitDownload(id);
      if (!deleted) {
        return new Response(`Download '${id}' not found`, { status: 404 });
      }

      return Response.json({ success: true, id, github: true });
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
