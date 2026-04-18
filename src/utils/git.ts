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

export interface GitReleaseDownloadResult {
  releaseId: string;
  releaseTag: string;
  localPath: string;
  filePath: string;
  sha256: string;
}

export interface GitReleaseSyncResult {
  releaseId: string;
  releaseTag: string;
  filePath: string;
  sha256: string;
  changed: boolean;
}

export interface GitError {
  message: string;
  code:
    | "CLONE_FAILED"
    | "FILE_NOT_FOUND"
    | "AUTH_FAILED"
    | "FETCH_FAILED"
    | "RELEASE_NOT_FOUND"
    | "ASSET_NOT_FOUND"
    | "DOWNLOAD_FAILED";
}

interface GitHubReleaseAsset {
  id: number;
  name: string;
  url: string;
}

interface GitHubRelease {
  id: number;
  tag_name: string;
  assets: GitHubReleaseAsset[];
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

function parseGitHubRepoUrl(
  repoUrl: string,
): { owner: string; repo: string } | null {
  try {
    const url = new URL(repoUrl);
    if (url.hostname !== "github.com") {
      return null;
    }

    const [owner, repoWithMaybeGit] = url.pathname
      .split("/")
      .filter((part) => part.length > 0);

    if (!owner || !repoWithMaybeGit) {
      return null;
    }

    const repo = repoWithMaybeGit.endsWith(".git")
      ? repoWithMaybeGit.slice(0, -4)
      : repoWithMaybeGit;

    if (!repo) {
      return null;
    }

    return { owner, repo };
  } catch {
    return null;
  }
}

function githubHeaders(extraHeaders?: Record<string, string>): Headers {
  const headers = new Headers({
    Accept: "application/vnd.github+json",
    "User-Agent": "cereal-api",
    "X-GitHub-Api-Version": "2022-11-28",
  });

  if (GITHUB_TOKEN) {
    headers.set("Authorization", `Bearer ${GITHUB_TOKEN}`);
  }

  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      headers.set(key, value);
    }
  }

  return headers;
}

async function getLatestRelease(
  owner: string,
  repo: string,
): Promise<GitHubRelease | GitError> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
    {
      headers: githubHeaders(),
    },
  );

  if (response.status === 401 || response.status === 403) {
    return {
      message: "Authentication failed. Check GITHUB_TOKEN for private repos.",
      code: "AUTH_FAILED",
    };
  }

  if (response.status === 404) {
    return {
      message: "Latest release not found for repository",
      code: "RELEASE_NOT_FOUND",
    };
  }

  if (!response.ok) {
    return {
      message: `Failed to fetch latest release: ${response.status} ${response.statusText}`,
      code: "DOWNLOAD_FAILED",
    };
  }

  const json = (await response.json()) as Partial<GitHubRelease>;
  if (
    typeof json.id !== "number" ||
    typeof json.tag_name !== "string" ||
    !Array.isArray(json.assets)
  ) {
    return {
      message: "Unexpected response from GitHub latest release API",
      code: "DOWNLOAD_FAILED",
    };
  }

  const assets = json.assets
    .map((asset) => {
      const candidate = asset as Partial<GitHubReleaseAsset>;
      if (
        typeof candidate.id !== "number" ||
        typeof candidate.name !== "string" ||
        typeof candidate.url !== "string"
      ) {
        return null;
      }

      return {
        id: candidate.id,
        name: candidate.name,
        url: candidate.url,
      };
    })
    .filter((asset): asset is GitHubReleaseAsset => asset !== null);

  return {
    id: json.id,
    tag_name: json.tag_name,
    assets,
  };
}

async function downloadReleaseAsset(
  assetUrl: string,
): Promise<ArrayBuffer | GitError> {
  const response = await fetch(assetUrl, {
    headers: githubHeaders({
      Accept: "application/octet-stream",
    }),
    redirect: "follow",
  });

  if (response.status === 401 || response.status === 403) {
    return {
      message: "Authentication failed. Check GITHUB_TOKEN for private repos.",
      code: "AUTH_FAILED",
    };
  }

  if (response.status === 404) {
    return {
      message: "Release asset not found",
      code: "ASSET_NOT_FOUND",
    };
  }

  if (!response.ok) {
    return {
      message: `Failed to download release asset: ${response.status} ${response.statusText}`,
      code: "DOWNLOAD_FAILED",
    };
  }

  return response.arrayBuffer();
}

export async function downloadLatestReleaseAsset(
  repoUrl: string,
  downloadId: string,
  assetName: string,
): Promise<GitReleaseDownloadResult | GitError> {
  const parsedRepo = parseGitHubRepoUrl(repoUrl);
  if (!parsedRepo) {
    return {
      message: "Invalid GitHub repository URL",
      code: "DOWNLOAD_FAILED",
    };
  }

  const localPath = join(GIT_DOWNLOADS_DIR, downloadId);

  try {
    await mkdir(localPath, { recursive: true });

    const latestRelease = await getLatestRelease(
      parsedRepo.owner,
      parsedRepo.repo,
    );
    if ("code" in latestRelease) {
      return latestRelease;
    }

    const matchingAsset = latestRelease.assets.find(
      (asset) => asset.name === assetName,
    );

    if (!matchingAsset) {
      return {
        message: `Release asset not found: ${assetName}`,
        code: "ASSET_NOT_FOUND",
      };
    }

    const downloaded = await downloadReleaseAsset(matchingAsset.url);
    if ("code" in downloaded) {
      return downloaded;
    }

    const buffer = Buffer.from(downloaded);
    const filePath = join(localPath, assetName);
    await Bun.write(filePath, buffer);

    const sha256 = createHash("sha256").update(buffer).digest("hex");

    return {
      releaseId: String(latestRelease.id),
      releaseTag: latestRelease.tag_name,
      localPath,
      filePath: assetName,
      sha256,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error during release asset download";
    return { message, code: "DOWNLOAD_FAILED" };
  }
}

export async function syncLatestReleaseAsset(
  repoUrl: string,
  localPath: string,
  assetName: string,
  previousReleaseId: string | null,
): Promise<GitReleaseSyncResult | GitError> {
  const parsedRepo = parseGitHubRepoUrl(repoUrl);
  if (!parsedRepo) {
    return {
      message: "Invalid GitHub repository URL",
      code: "DOWNLOAD_FAILED",
    };
  }

  try {
    await mkdir(localPath, { recursive: true });

    const latestRelease = await getLatestRelease(
      parsedRepo.owner,
      parsedRepo.repo,
    );
    if ("code" in latestRelease) {
      return latestRelease;
    }

    const matchingAsset = latestRelease.assets.find(
      (asset) => asset.name === assetName,
    );

    if (!matchingAsset) {
      return {
        message: `Release asset not found: ${assetName}`,
        code: "ASSET_NOT_FOUND",
      };
    }

    const downloaded = await downloadReleaseAsset(matchingAsset.url);
    if ("code" in downloaded) {
      return downloaded;
    }

    const buffer = Buffer.from(downloaded);
    const filePath = join(localPath, assetName);
    await Bun.write(filePath, buffer);

    const sha256 = createHash("sha256").update(buffer).digest("hex");

    return {
      releaseId: String(latestRelease.id),
      releaseTag: latestRelease.tag_name,
      filePath: assetName,
      sha256,
      changed: previousReleaseId !== String(latestRelease.id),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error during release asset sync";
    return { message, code: "DOWNLOAD_FAILED" };
  }
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
