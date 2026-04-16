import { beforeEach, describe, expect, mock, test } from "bun:test";

import {
  type GitCloneResult,
  type GitError,
  type GitSyncResult,
} from "../utils/git.ts";
import {
  clearMocks,
  mockInsert,
  mockSelect,
  mockUpdate,
  setAuthResult,
  setupMocks,
} from "./helpers/test-mocks.ts";

const mockCloneRepo = mock(
  (): Promise<GitCloneResult | GitError> =>
    Promise.resolve({
      commitSha: "commit-123",
      localPath: "./git-downloads/git-1",
      filePath: "./git-downloads/git-1/dist/app.zip",
      sha256: "sha-123",
    }),
);
const mockSyncRepo = mock(
  (): Promise<GitSyncResult | GitError> =>
    Promise.resolve({
      commitSha: "commit-456",
      sha256: "sha-456",
      changed: true,
    }),
);
const mockDeleteRepo = mock(() => Promise.resolve());

mock.module("../utils/git.ts", () => ({
  cloneRepo: mockCloneRepo,
  syncRepo: mockSyncRepo,
  deleteRepo: mockDeleteRepo,
}));

setupMocks();

const { handleGitDownloadsRequest } =
  await import("../routes/git-downloads.ts");

describe("Git Downloads Endpoints", () => {
  beforeEach(() => {
    clearMocks();
    mockCloneRepo.mockClear();
    mockSyncRepo.mockClear();
    mockDeleteRepo.mockClear();
  });

  test("POST /downloads/git/add should create a git download", async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: "prod_123", name: "App" }]),
        }),
        limit: () => ({ offset: () => Promise.resolve([]) }),
      }),
    }));

    const req = new Request("http://localhost/downloads/git/add", {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_123",
        repoUrl: "https://github.com/acme/repo",
        filePath: "dist/app.zip",
      }),
    });

    const res = await handleGitDownloadsRequest(req);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      success: boolean;
      id: string;
      commitSha: string;
      sha256: string;
    };

    expect(body.success).toBe(true);
    expect(body.id).toBeDefined();
    expect(body.commitSha).toBe("commit-123");
    expect(body.sha256).toBe("sha-123");
    expect(mockCloneRepo).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  test("POST /downloads/git/add should return 404 for missing product", async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
        limit: () => ({ offset: () => Promise.resolve([]) }),
      }),
    }));

    const req = new Request("http://localhost/downloads/git/add", {
      method: "POST",
      body: JSON.stringify({
        productId: "missing",
        repoUrl: "https://github.com/acme/repo",
        filePath: "dist/app.zip",
      }),
    });

    const res = await handleGitDownloadsRequest(req);
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("not found");
  });

  test("POST /downloads/git/add should return mapped status on clone errors", async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: "prod_123", name: "App" }]),
        }),
        limit: () => ({ offset: () => Promise.resolve([]) }),
      }),
    }));

    mockCloneRepo.mockResolvedValueOnce({
      code: "AUTH_FAILED",
      message: "Authentication failed",
    });

    const req = new Request("http://localhost/downloads/git/add", {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_123",
        repoUrl: "https://github.com/acme/repo",
        filePath: "dist/app.zip",
      }),
    });

    const res = await handleGitDownloadsRequest(req);
    expect(res.status).toBe(403);
    expect(await res.text()).toBe("Authentication failed");
  });

  test("POST /downloads/git/add should return 400 for missing fields", async () => {
    const req = new Request("http://localhost/downloads/git/add", {
      method: "POST",
      body: JSON.stringify({ repoUrl: "https://github.com/acme/repo" }),
    });

    const res = await handleGitDownloadsRequest(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Missing productId");
  });

  test("POST /downloads/git/refresh should refresh and write history", async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              {
                id: "git_1",
                productId: "prod_123",
                repoUrl: "https://github.com/acme/repo",
                filePath: "dist/app.zip",
                branch: "main",
                commitSha: "old-commit",
                localPath: "./git-downloads/git_1",
                filename: "app.zip",
                sha256: "old-sha",
                lastSyncAt: new Date(),
                createdAt: new Date(),
              },
            ]),
        }),
        limit: () => ({ offset: () => Promise.resolve([]) }),
      }),
    }));

    const req = new Request("http://localhost/downloads/git/refresh", {
      method: "POST",
      body: JSON.stringify({ id: "git_1" }),
    });

    const res = await handleGitDownloadsRequest(req);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      success: boolean;
      id: string;
      commitSha: string;
      sha256: string;
      changed: boolean;
    };
    expect(body.success).toBe(true);
    expect(body.id).toBe("git_1");
    expect(body.commitSha).toBe("commit-456");
    expect(body.sha256).toBe("sha-456");
    expect(body.changed).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  test("POST /downloads/git/refresh should map sync error status and log history", async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              {
                id: "git_1",
                productId: "prod_123",
                repoUrl: "https://github.com/acme/repo",
                filePath: "dist/app.zip",
                branch: "main",
                commitSha: "old-commit",
                localPath: "./git-downloads/git_1",
                filename: "app.zip",
                sha256: "old-sha",
                lastSyncAt: new Date(),
                createdAt: new Date(),
              },
            ]),
        }),
        limit: () => ({ offset: () => Promise.resolve([]) }),
      }),
    }));

    mockSyncRepo.mockResolvedValueOnce({
      code: "FILE_NOT_FOUND",
      message: "File not found in repository: dist/app.zip",
    });

    const req = new Request("http://localhost/downloads/git/refresh", {
      method: "POST",
      body: JSON.stringify({ id: "git_1" }),
    });

    const res = await handleGitDownloadsRequest(req);
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("File not found in repository");
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test("POST /downloads/git/refresh should return 404 for missing download", async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
        limit: () => ({ offset: () => Promise.resolve([]) }),
      }),
    }));

    const req = new Request("http://localhost/downloads/git/refresh", {
      method: "POST",
      body: JSON.stringify({ id: "missing" }),
    });

    const res = await handleGitDownloadsRequest(req);
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("not found");
  });

  test("GET /downloads/git/history should return history list", async () => {
    const history = [
      {
        id: "hist_2",
        gitDownloadId: "git_1",
        status: "success",
        errorMessage: null,
        previousCommitSha: "abc",
        newCommitSha: "def",
        syncedAt: new Date("2024-01-02T00:00:00Z"),
      },
      {
        id: "hist_1",
        gitDownloadId: "git_1",
        status: "failed",
        errorMessage: "Fetch failed",
        previousCommitSha: "aaa",
        newCommitSha: null,
        syncedAt: new Date("2024-01-01T00:00:00Z"),
      },
    ];

    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  id: "git_1",
                  productId: "prod_123",
                },
              ]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            orderBy: () => Promise.resolve(history),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }));

    const req = new Request("http://localhost/downloads/git/history?id=git_1");
    const res = await handleGitDownloadsRequest(req);

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>[];
    expect(body).toHaveLength(2);
    expect(body[0]?.["id"]).toBe("hist_2");
    expect(body[0]?.["status"]).toBe("success");
    expect(body[1]?.["id"]).toBe("hist_1");
    expect(body[1]?.["errorMessage"]).toBe("Fetch failed");
  });

  test("GET /downloads/git/history should return 404 for missing download", async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
        limit: () => ({ offset: () => Promise.resolve([]) }),
      }),
    }));

    const req = new Request(
      "http://localhost/downloads/git/history?id=missing-git",
    );
    const res = await handleGitDownloadsRequest(req);
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("not found");
  });

  test("GET /downloads/git/history should return 400 for missing id", async () => {
    const req = new Request("http://localhost/downloads/git/history");
    const res = await handleGitDownloadsRequest(req);

    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Missing id");
  });

  test("should return 401 when auth fails", async () => {
    setAuthResult(false);

    const req = new Request("http://localhost/downloads/git/add", {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_123",
        repoUrl: "https://github.com/acme/repo",
        filePath: "dist/app.zip",
      }),
    });

    const res = await handleGitDownloadsRequest(req);
    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Unauthorized");
  });

  test("should return 405 for unsupported methods", async () => {
    const req = new Request("http://localhost/downloads/git/add", {
      method: "PUT",
    });

    const res = await handleGitDownloadsRequest(req);
    expect(res.status).toBe(405);
    expect(await res.text()).toBe("Method Not Allowed");
  });
});
