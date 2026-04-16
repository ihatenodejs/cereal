import { createHash } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const { GIT_DOWNLOADS_DIR = "./git-downloads" } = process.env;
const { GITHUB_TOKEN } = process.env;

export interface GitCloneResult {
  commitSha: string;
  localPath: string;
  filePath: string;
  sha256: string;
}

export interface GitSyncResult {
  commitSha: string;
  sha256: string;
  changed: boolean;
}

export interface GitError {
  message: string;
  code: "CLONE_FAILED" | "FILE_NOT_FOUND" | "AUTH_FAILED" | "FETCH_FAILED";
}

function isAuthenticatedGithubUrl(url: string): string {
  if (!GITHUB_TOKEN) {
    return url;
  }
  if (url.startsWith("https://github.com/")) {
    return url.replace(
      "https://github.com/",
      `https://${GITHUB_TOKEN}@github.com/`,
    );
  }
  return url;
}

async function runGitCommand(
  args: string[],
  cwd?: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["git", ...args], {
    cwd,
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
    },
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await proc.stdout.text();
  const stderr = await proc.stderr.text();
  const exitCode = await proc.exited;

  return {
    stdout,
    stderr,
    exitCode,
  };
}

export async function cloneRepo(
  repoUrl: string,
  branch: string,
  downloadId: string,
  filePath: string,
): Promise<GitCloneResult | GitError> {
  const localPath = join(GIT_DOWNLOADS_DIR, downloadId);
  const authenticatedUrl = isAuthenticatedGithubUrl(repoUrl);

  try {
    await mkdir(GIT_DOWNLOADS_DIR, { recursive: true });

    const cloneResult = await runGitCommand([
      "clone",
      "--depth=1",
      "--branch",
      branch,
      authenticatedUrl,
      localPath,
    ]);

    if (cloneResult.exitCode !== 0) {
      const stderr = cloneResult.stderr.toLowerCase();
      if (stderr.includes("authentication") || stderr.includes("403")) {
        return {
          message:
            "Authentication failed. Check GITHUB_TOKEN for private repos.",
          code: "AUTH_FAILED",
        };
      }
      if (stderr.includes("not found") || stderr.includes("404")) {
        return { message: "Repository not found", code: "CLONE_FAILED" };
      }
      return {
        message: `Clone failed: ${cloneResult.stderr}`,
        code: "CLONE_FAILED",
      };
    }

    const fullFilePath = join(localPath, filePath);
    const file = Bun.file(fullFilePath);
    if (!(await file.exists())) {
      await rm(localPath, { recursive: true, force: true });
      return {
        message: `File not found in repository: ${filePath}`,
        code: "FILE_NOT_FOUND",
      };
    }

    const commitResult = await runGitCommand(["rev-parse", "HEAD"], localPath);
    if (commitResult.exitCode !== 0) {
      await rm(localPath, { recursive: true, force: true });
      return { message: "Failed to get commit SHA", code: "CLONE_FAILED" };
    }

    const commitSha = commitResult.stdout.trim();
    const content = await file.arrayBuffer();
    const sha256 = createHash("sha256")
      .update(Buffer.from(content))
      .digest("hex");

    return {
      commitSha,
      localPath,
      filePath: fullFilePath,
      sha256,
    };
  } catch (error) {
    try {
      await rm(localPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    const message =
      error instanceof Error ? error.message : "Unknown error during clone";
    return { message, code: "CLONE_FAILED" };
  }
}

export async function syncRepo(
  localPath: string,
  branch: string,
  filePath: string,
): Promise<GitSyncResult | GitError> {
  try {
    const fetchResult = await runGitCommand(
      ["fetch", "origin", "--depth=1"],
      localPath,
    );

    if (fetchResult.exitCode !== 0) {
      const stderr = fetchResult.stderr.toLowerCase();
      if (stderr.includes("authentication") || stderr.includes("403")) {
        return {
          message: "Authentication failed during fetch",
          code: "AUTH_FAILED",
        };
      }
      return {
        message: `Fetch failed: ${fetchResult.stderr}`,
        code: "FETCH_FAILED",
      };
    }

    const currentCommitResult = await runGitCommand(
      ["rev-parse", "HEAD"],
      localPath,
    );
    if (currentCommitResult.exitCode !== 0) {
      return {
        message: "Failed to get current commit SHA",
        code: "FETCH_FAILED",
      };
    }
    const previousCommitSha = currentCommitResult.stdout.trim();

    const resetResult = await runGitCommand(
      ["reset", "--hard", `origin/${branch}`],
      localPath,
    );
    if (resetResult.exitCode !== 0) {
      return {
        message: `Reset failed: ${resetResult.stderr}`,
        code: "FETCH_FAILED",
      };
    }

    const newCommitResult = await runGitCommand(
      ["rev-parse", "HEAD"],
      localPath,
    );
    if (newCommitResult.exitCode !== 0) {
      return { message: "Failed to get new commit SHA", code: "FETCH_FAILED" };
    }
    const newCommitSha = newCommitResult.stdout.trim();

    const changed = previousCommitSha !== newCommitSha;

    const fullFilePath = join(localPath, filePath);
    const file = Bun.file(fullFilePath);
    if (!(await file.exists())) {
      return {
        message: `File not found in repository: ${filePath}`,
        code: "FILE_NOT_FOUND",
      };
    }

    const content = await file.arrayBuffer();
    const sha256 = createHash("sha256")
      .update(Buffer.from(content))
      .digest("hex");

    return {
      commitSha: newCommitSha,
      sha256,
      changed,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error during sync";
    return { message, code: "FETCH_FAILED" };
  }
}

export async function deleteRepo(localPath: string): Promise<void> {
  try {
    await rm(localPath, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

export function getGitDownloadsDir(): string {
  return GIT_DOWNLOADS_DIR;
}
