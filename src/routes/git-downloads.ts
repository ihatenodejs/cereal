import { desc, eq } from "drizzle-orm";

import { db } from "../db/index.ts";
import { applications, gitDownloads, gitSyncHistory } from "../db/schema.ts";
import { authenticate } from "../middleware/auth.ts";
import {
  cloneRepo,
  deleteRepo,
  syncRepo,
  type GitError,
} from "../utils/git.ts";

function isGitError(result: unknown): result is GitError {
  return typeof result === "object" && result !== null && "code" in result;
}

export async function handleGitDownloadsRequest(
  req: Request,
): Promise<Response> {
  const url = new URL(req.url);

  if (!(await authenticate(req))) {
    return new Response("Unauthorized", { status: 401 });
  }

  // ── Admin: add a git download ────────────────────────────────────────────
  if (req.method === "POST" && url.pathname === "/downloads/git/add") {
    try {
      const body = (await req.json()) as {
        productId?: string;
        repoUrl?: string;
        filePath?: string;
        branch?: string;
      };

      const { productId, repoUrl, filePath, branch = "main" } = body;

      if (!productId || typeof productId !== "string") {
        return new Response("Missing productId", { status: 400 });
      }
      if (!repoUrl || typeof repoUrl !== "string") {
        return new Response("Missing repoUrl", { status: 400 });
      }
      if (!filePath || typeof filePath !== "string") {
        return new Response("Missing filePath", { status: 400 });
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

      const id = crypto.randomUUID();
      const cloneResult = await cloneRepo(repoUrl, branch, id, filePath);

      if (isGitError(cloneResult)) {
        const statusCode =
          cloneResult.code === "AUTH_FAILED"
            ? 403
            : cloneResult.code === "FILE_NOT_FOUND"
              ? 404
              : 400;
        return new Response(cloneResult.message, { status: statusCode });
      }

      const filename = filePath.split("/").pop() ?? filePath;
      const now = new Date();

      await db.insert(gitDownloads).values({
        id,
        productId,
        repoUrl,
        filePath,
        branch,
        commitSha: cloneResult.commitSha,
        localPath: cloneResult.localPath,
        filename,
        sha256: cloneResult.sha256,
        lastSyncAt: now,
        createdAt: now,
      });

      const historyId = crypto.randomUUID();
      await db.insert(gitSyncHistory).values({
        id: historyId,
        gitDownloadId: id,
        status: "success",
        previousCommitSha: null,
        newCommitSha: cloneResult.commitSha,
        syncedAt: now,
      });

      return Response.json({
        success: true,
        id,
        commitSha: cloneResult.commitSha,
        sha256: cloneResult.sha256,
      });
    } catch (error) {
      console.error("Git downloads add error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  // ── Admin: refresh a git download ────────────────────────────────────────
  if (req.method === "POST" && url.pathname === "/downloads/git/refresh") {
    try {
      const body = (await req.json()) as { id?: string };
      const { id } = body;

      if (!id) {
        return new Response("Missing id", { status: 400 });
      }

      const [gitDownload] = await db
        .select()
        .from(gitDownloads)
        .where(eq(gitDownloads.id, id))
        .limit(1);

      if (!gitDownload) {
        return new Response(`Git download '${id}' not found`, { status: 404 });
      }

      const previousCommitSha = gitDownload.commitSha;
      const syncResult = await syncRepo(
        gitDownload.localPath,
        gitDownload.branch,
        gitDownload.filePath,
      );

      if (isGitError(syncResult)) {
        const historyId = crypto.randomUUID();
        await db.insert(gitSyncHistory).values({
          id: historyId,
          gitDownloadId: id,
          status: "failed",
          errorMessage: syncResult.message,
          previousCommitSha,
          newCommitSha: null,
          syncedAt: new Date(),
        });

        const statusCode =
          syncResult.code === "AUTH_FAILED"
            ? 403
            : syncResult.code === "FILE_NOT_FOUND"
              ? 404
              : 400;
        return new Response(syncResult.message, { status: statusCode });
      }

      const now = new Date();
      await db
        .update(gitDownloads)
        .set({
          commitSha: syncResult.commitSha,
          sha256: syncResult.sha256,
          lastSyncAt: now,
        })
        .where(eq(gitDownloads.id, id));

      const historyId = crypto.randomUUID();
      await db.insert(gitSyncHistory).values({
        id: historyId,
        gitDownloadId: id,
        status: "success",
        previousCommitSha,
        newCommitSha: syncResult.commitSha,
        syncedAt: now,
      });

      return Response.json({
        success: true,
        id,
        commitSha: syncResult.commitSha,
        sha256: syncResult.sha256,
        changed: syncResult.changed,
      });
    } catch (error) {
      console.error("Git downloads refresh error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  // ── Admin: get sync history for a git download ───────────────────────────
  if (req.method === "GET" && url.pathname === "/downloads/git/history") {
    try {
      const id = url.searchParams.get("id");

      if (!id) {
        return new Response("Missing id", { status: 400 });
      }

      const [gitDownload] = await db
        .select()
        .from(gitDownloads)
        .where(eq(gitDownloads.id, id))
        .limit(1);

      if (!gitDownload) {
        return new Response(`Git download '${id}' not found`, { status: 404 });
      }

      const history = await db
        .select()
        .from(gitSyncHistory)
        .where(eq(gitSyncHistory.gitDownloadId, id))
        .orderBy(desc(gitSyncHistory.syncedAt));

      return Response.json(
        history.map((h) => ({
          id: h.id,
          status: h.status,
          errorMessage: h.errorMessage,
          previousCommitSha: h.previousCommitSha,
          newCommitSha: h.newCommitSha,
          syncedAt: h.syncedAt,
        })),
      );
    } catch (error) {
      console.error("Git downloads history error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  return new Response("Not Found", { status: 404 });
}

export async function getGitDownloadById(
  id: string,
): Promise<typeof gitDownloads.$inferSelect | null> {
  const [result] = await db
    .select()
    .from(gitDownloads)
    .where(eq(gitDownloads.id, id))
    .limit(1);
  return result ?? null;
}

export async function listGitDownloadsByProductId(
  productId: string,
): Promise<(typeof gitDownloads.$inferSelect)[]> {
  return db
    .select()
    .from(gitDownloads)
    .where(eq(gitDownloads.productId, productId));
}

export async function listAllGitDownloads(
  limit: number,
  offset: number,
): Promise<(typeof gitDownloads.$inferSelect)[]> {
  return db.select().from(gitDownloads).limit(limit).offset(offset);
}

export async function deleteGitDownload(id: string): Promise<boolean> {
  const [gitDownload] = await db
    .select()
    .from(gitDownloads)
    .where(eq(gitDownloads.id, id))
    .limit(1);

  if (!gitDownload) {
    return false;
  }

  await deleteRepo(gitDownload.localPath);

  await db.delete(gitSyncHistory).where(eq(gitSyncHistory.gitDownloadId, id));
  await db.delete(gitDownloads).where(eq(gitDownloads.id, id));

  return true;
}
