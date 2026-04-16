import { describe, expect, test, mock, beforeEach } from "bun:test";

import { handleDownloadsRequest } from "../routes/downloads.ts";
import {
  setupMocks,
  clearMocks,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockSelect,
  setAuthResult,
} from "./helpers/test-mocks.ts";

mock.module("node:fs/promises", () => ({
  mkdir: () => Promise.resolve(),
  unlink: () => Promise.resolve(),
}));

const mockBunWrite = mock(() => Promise.resolve(0));
const mockBunFileExists = mock(() => Promise.resolve(true));

const originalWrite = Bun.write;
const originalFile = Bun.file;

setupMocks();

function makeUploadRequest(
  fields: Record<string, string>,
  fileContent = "fake binary content",
  filename = "app-1.0.0.zip",
) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  formData.append(
    "file",
    new File([fileContent], filename, { type: "application/zip" }),
  );

  return new Request("http://localhost/downloads/upload", {
    method: "POST",
    body: formData,
  });
}

describe("Downloads Admin Endpoints", () => {
  beforeEach(() => {
    clearMocks();

    (Bun as unknown as Record<string, unknown>).write = mockBunWrite;
    (Bun as unknown as Record<string, unknown>).file = (_path: string) => ({
      exists: mockBunFileExists,
    });

    mockBunWrite.mockClear();
    mockBunFileExists.mockClear();
  });

  test("POST /downloads/upload should upload a new file", async () => {
    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ id: "prod_123", name: "App" }]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }));

    mockInsert.mockImplementation(() => ({ values: () => Promise.resolve() }));
    mockBunWrite.mockImplementation(() => Promise.resolve(0));

    const req = makeUploadRequest({ productId: "prod_123", version: "1.0.0" });
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      id: string;
      sha256: string;
    };
    expect(body.success).toBe(true);
    expect(body.id).toBeDefined();
    expect(body.sha256).toHaveLength(64); // SHA256 hex
    expect(mockInsert).toHaveBeenCalled();
  });

  test("POST /downloads/upload should overwrite existing file for same version", async () => {
    const existingId = "existing-uuid-1234";

    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ id: "prod_123", name: "App" }]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  id: existingId,
                  productId: "prod_123",
                  version: "1.0.0",
                  filename: "old.zip",
                  filePath: "./uploads/prod_123/1.0.0/old.zip",
                  sha256: "oldsha",
                },
              ]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }));

    mockUpdate.mockImplementation(() => ({
      set: () => ({ where: () => Promise.resolve() }),
    }));
    mockBunWrite.mockImplementation(() => Promise.resolve(0));

    const req = makeUploadRequest({ productId: "prod_123", version: "1.0.0" });
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; id: string };
    expect(body.success).toBe(true);
    expect(body.id).toBe(existingId);
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  test("POST /downloads/upload should return 400 when productId is missing", async () => {
    const formData = new FormData();
    formData.append("version", "1.0.0");
    formData.append(
      "file",
      new File(["content"], "app.zip", { type: "application/zip" }),
    );

    const req = new Request("http://localhost/downloads/upload", {
      method: "POST",
      body: formData,
    });

    const res = await handleDownloadsRequest(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Missing productId");
  });

  test("POST /downloads/upload should return 400 when version is missing", async () => {
    const formData = new FormData();
    formData.append("productId", "prod_123");
    formData.append(
      "file",
      new File(["content"], "app.zip", { type: "application/zip" }),
    );

    const req = new Request("http://localhost/downloads/upload", {
      method: "POST",
      body: formData,
    });

    const res = await handleDownloadsRequest(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Missing version");
  });

  test("POST /downloads/upload should return 400 when file is missing", async () => {
    const formData = new FormData();
    formData.append("productId", "prod_123");
    formData.append("version", "1.0.0");

    const req = new Request("http://localhost/downloads/upload", {
      method: "POST",
      body: formData,
    });

    const res = await handleDownloadsRequest(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Missing file");
  });

  test("POST /downloads/upload should return 404 for non-existent product", async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
        limit: () => ({ offset: () => Promise.resolve([]) }),
      }),
    }));

    mockBunWrite.mockImplementation(() => Promise.resolve(0));

    const req = makeUploadRequest({
      productId: "nonexistent",
      version: "1.0.0",
    });
    const res = await handleDownloadsRequest(req);
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("not found");
  });

  test("POST /downloads/upload should return 400 for wrong content-type", async () => {
    const req = new Request("http://localhost/downloads/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: "prod_123", version: "1.0.0" }),
    });

    const res = await handleDownloadsRequest(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("multipart/form-data");
  });

  test("POST /downloads/delete should delete a download entry", async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              {
                id: "dl_123",
                productId: "prod_123",
                version: "1.0.0",
                filename: "app.zip",
                filePath: "./uploads/prod_123/1.0.0/app.zip",
                sha256: "abc123",
              },
            ]),
        }),
        limit: () => ({ offset: () => Promise.resolve([]) }),
      }),
    }));

    mockBunFileExists.mockImplementation(() => Promise.resolve(false));

    const req = new Request("http://localhost/downloads/delete", {
      method: "POST",
      body: JSON.stringify({ id: "dl_123" }),
    });

    const res = await handleDownloadsRequest(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; id: string };
    expect(body.success).toBe(true);
    expect(body.id).toBe("dl_123");
    expect(mockDelete).toHaveBeenCalled();
  });

  test("POST /downloads/delete should return 400 for missing id", async () => {
    const req = new Request("http://localhost/downloads/delete", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await handleDownloadsRequest(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Missing id");
  });

  test("POST /downloads/delete should return 404 for non-existent entry", async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
        limit: () => ({ offset: () => Promise.resolve([]) }),
      }),
    }));

    const req = new Request("http://localhost/downloads/delete", {
      method: "POST",
      body: JSON.stringify({ id: "nonexistent" }),
    });

    const res = await handleDownloadsRequest(req);
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("not found");
  });

  test("GET /downloads/list should return paginated list", async () => {
    const files = [
      {
        id: "dl_1",
        productId: "prod_1",
        version: "1.0.0",
        filename: "app-1.0.0.zip",
        filePath: "./uploads/prod_1/1.0.0/app-1.0.0.zip",
        sha256: "sha1",
        createdAt: new Date("2024-01-01T00:00:00Z"),
      },
      {
        id: "dl_2",
        productId: "prod_1",
        version: "2.0.0",
        filename: "app-2.0.0.zip",
        filePath: "./uploads/prod_1/2.0.0/app-2.0.0.zip",
        sha256: "sha2",
        createdAt: new Date("2024-02-01T00:00:00Z"),
      },
    ];

    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          limit: () => ({
            offset: () => Promise.resolve(files),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          limit: () => ({
            offset: () => Promise.resolve([]),
          }),
        }),
      }));

    const req = new Request("http://localhost/downloads/list?limit=10&page=1");
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(body).toHaveLength(2);
    // filePath should NOT be exposed
    for (const item of body) {
      expect(item as Record<string, unknown>).not.toHaveProperty("filePath");
    }
  });

  test("GET /downloads/list should include regular and git downloads", async () => {
    const now = new Date("2024-03-01T00:00:00Z");

    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          limit: () => ({
            offset: () =>
              Promise.resolve([
                {
                  id: "dl_regular",
                  productId: "prod_1",
                  version: "1.0.0",
                  filename: "app.zip",
                  filePath: "./uploads/prod_1/1.0.0/app.zip",
                  sha256: "sha-regular",
                  createdAt: now,
                },
              ]),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          limit: () => ({
            offset: () =>
              Promise.resolve([
                {
                  id: "dl_git",
                  productId: "prod_1",
                  repoUrl: "https://github.com/acme/repo",
                  filePath: "dist/app.zip",
                  branch: "main",
                  commitSha: "abc123",
                  localPath: "./git-downloads/dl_git",
                  filename: "app.zip",
                  sha256: "sha-git",
                  lastSyncAt: now,
                  createdAt: now,
                },
              ]),
          }),
        }),
      }));

    const req = new Request("http://localhost/downloads/list?limit=10&page=1");
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>[];
    expect(body).toHaveLength(2);

    const regular = body.find((item) => item["id"] === "dl_regular");
    const git = body.find((item) => item["id"] === "dl_git");

    expect(regular?.["github"]).toBe(false);
    expect(git?.["github"]).toBe(true);
    expect(git?.["version"]).toBeUndefined();
    expect(git?.["displayVersion"]).toBe("abc123");
    expect(git?.["commitSha"]).toBe("abc123");
    expect(git?.["repoUrl"]).toBe("https://github.com/acme/repo");
  });
});

describe("Downloads User Endpoints", () => {
  beforeEach(() => {
    clearMocks();
    (Bun as unknown as Record<string, unknown>).file = (_path: string) => ({
      exists: mockBunFileExists,
    });
    mockBunFileExists.mockClear();
  });

  test("GET /downloads/files should return file list for valid license", async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const license = {
      key: "valid-key-123",
      productId: "prod_abc",
      tier: null,
      expirationDate: futureDate,
      createdAt: new Date(),
    };

    const files = [
      {
        id: "dl_1",
        productId: "prod_abc",
        version: "1.0.0",
        filename: "app-1.0.0.zip",
        filePath: "./uploads/prod_abc/1.0.0/app-1.0.0.zip",
        sha256: "abc123",
        createdAt: new Date("2024-01-01T00:00:00Z"),
      },
    ];

    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([license]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => Promise.resolve(files),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => Promise.resolve([]),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }));

    const req = new Request(
      "http://localhost/downloads/files?licenseKey=valid-key-123",
    );
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      id: string;
      version: string;
      filename: string;
      url: string;
      sha256: string;
    }[];
    expect(body).toHaveLength(1);
    expect(body[0]!.version).toBe("1.0.0");
    expect(body[0]!.filename).toBe("app-1.0.0.zip");
    expect(body[0]!.sha256).toBe("abc123");
    expect((body[0] as Record<string, unknown>)["github"]).toBe(false);
    expect(body[0]!.url).toContain("/downloads/get/dl_1");
    expect(body[0]!.url).toContain("licenseKey=valid-key-123");
    // filePath must not be exposed
    expect(body[0] as Record<string, unknown>).not.toHaveProperty("filePath");
  });

  test("GET /downloads/files should include git downloads", async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  key: "valid-git-files",
                  productId: "prod_abc",
                  expirationDate: futureDate,
                },
              ]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => Promise.resolve([]),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () =>
            Promise.resolve([
              {
                id: "git_1",
                productId: "prod_abc",
                repoUrl: "https://github.com/acme/repo",
                filePath: "dist/app.zip",
                branch: "main",
                commitSha: "deadbeef",
                localPath: "./git-downloads/git_1",
                filename: "app.zip",
                sha256: "sha-git",
                lastSyncAt: new Date("2024-01-02T00:00:00Z"),
                createdAt: new Date("2024-01-01T00:00:00Z"),
              },
            ]),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }));

    const req = new Request(
      "http://localhost/downloads/files?licenseKey=valid-git-files",
    );
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>[];
    expect(body).toHaveLength(1);
    expect(body[0]?.["id"]).toBe("git_1");
    expect(body[0]?.["github"]).toBe(true);
    expect(body[0]?.["version"]).toBeUndefined();
    expect(body[0]?.["displayVersion"]).toBe("deadbeef");
    expect(body[0]?.["commitSha"]).toBe("deadbeef");
    expect((body[0] as Record<string, unknown>)["url"]).toBeDefined();
  });

  test("GET /downloads/files should return 403 for invalid license", async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
        limit: () => ({ offset: () => Promise.resolve([]) }),
      }),
    }));

    const req = new Request(
      "http://localhost/downloads/files?licenseKey=bad-key",
    );
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(403);
    const body = (await res.json()) as { valid: boolean; reason: string };
    expect(body.valid).toBe(false);
    expect(body.reason).toBe("License key not found");
  });

  test("GET /downloads/files should return 403 for expired license", async () => {
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);

    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              {
                key: "expired-key",
                productId: "prod_abc",
                expirationDate: pastDate,
              },
            ]),
        }),
        limit: () => ({ offset: () => Promise.resolve([]) }),
      }),
    }));

    const req = new Request(
      "http://localhost/downloads/files?licenseKey=expired-key",
    );
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(403);
    const body = (await res.json()) as { valid: boolean; reason: string };
    expect(body.valid).toBe(false);
    expect(body.reason).toBe("License has expired");
  });

  test("GET /downloads/files should return 400 when licenseKey is missing", async () => {
    const req = new Request("http://localhost/downloads/files");
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Missing licenseKey");
  });

  test("POST /downloads/files should return 405 for wrong method", async () => {
    const req = new Request(
      "http://localhost/downloads/files?licenseKey=somekey",
      { method: "POST" },
    );
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(405);
  });

  test("GET /downloads/get/:id should stream file for valid license", async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const license = {
      key: "valid-key-123",
      productId: "prod_abc",
      tier: null,
      expirationDate: futureDate,
      createdAt: new Date(),
    };

    const file = {
      id: "dl_1",
      productId: "prod_abc",
      version: "1.0.0",
      filename: "app-1.0.0.zip",
      filePath: "./uploads/prod_abc/1.0.0/app-1.0.0.zip",
      sha256: "abc123",
      createdAt: new Date(),
    };

    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([license]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([file]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }));

    mockBunFileExists.mockImplementation(() => Promise.resolve(true));

    (Bun as unknown as Record<string, unknown>).file = (_path: string) => ({
      exists: () => Promise.resolve(true),
      stream: () => new ReadableStream(),
      type: "application/zip",
      size: 42,
    });

    const req = new Request(
      "http://localhost/downloads/get/dl_1?licenseKey=valid-key-123",
    );
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("app-1.0.0.zip");
    expect(res.headers.get("X-SHA256")).toBe("abc123");
  });

  test("GET /downloads/get/:id should return 403 for invalid license", async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
        limit: () => ({ offset: () => Promise.resolve([]) }),
      }),
    }));

    const req = new Request(
      "http://localhost/downloads/get/dl_1?licenseKey=bad-key",
    );
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(403);
  });

  test("GET /downloads/get/:id should return 404 when file id not found for this license's product", async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  key: "valid-key",
                  productId: "prod_abc",
                  expirationDate: futureDate,
                },
              ]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }));

    const req = new Request(
      "http://localhost/downloads/get/nonexistent?licenseKey=valid-key",
    );
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(404);
  });

  test("GET /downloads/get/:id should serve git download fallback", async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  key: "valid-git-download-key",
                  productId: "prod_git",
                  expirationDate: futureDate,
                },
              ]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  id: "git_dl_1",
                  productId: "prod_git",
                  repoUrl: "https://github.com/acme/repo",
                  filePath: "./git-downloads/git_dl_1/dist/release.zip",
                  branch: "main",
                  commitSha: "abc",
                  localPath: "./git-downloads/git_dl_1",
                  filename: "release.zip",
                  sha256: "git-sha",
                  lastSyncAt: new Date(),
                  createdAt: new Date(),
                },
              ]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }));

    (Bun as unknown as Record<string, unknown>).file = (_path: string) => ({
      exists: () => Promise.resolve(true),
      stream: () => new ReadableStream(),
      type: "application/zip",
      size: 128,
    });

    const req = new Request(
      "http://localhost/downloads/get/git_dl_1?licenseKey=valid-git-download-key",
    );
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("release.zip");
    expect(res.headers.get("X-SHA256")).toBe("git-sha");
  });

  test("GET /downloads/get/:id should serve git download when regular file is missing on disk", async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const fileId = "shared_dl_1";
    const regularPath = "./uploads/prod_git/1.0.0/release.zip";

    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  key: "valid-git-fallback-key",
                  productId: "prod_git",
                  expirationDate: futureDate,
                },
              ]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  id: fileId,
                  productId: "prod_git",
                  version: "1.0.0",
                  filename: "release.zip",
                  filePath: regularPath,
                  sha256: "regular-sha",
                  createdAt: new Date(),
                },
              ]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  id: fileId,
                  productId: "prod_git",
                  repoUrl: "https://github.com/acme/repo",
                  filePath: "dist/release.zip",
                  branch: "main",
                  commitSha: "abc",
                  localPath: "./git-downloads/shared_dl_1",
                  filename: "release.zip",
                  sha256: "git-sha",
                  lastSyncAt: new Date(),
                  createdAt: new Date(),
                },
              ]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }));

    (Bun as unknown as Record<string, unknown>).file = (path: string) => {
      if (path === regularPath) {
        return {
          exists: () => Promise.resolve(false),
        };
      }

      return {
        exists: () => Promise.resolve(true),
        stream: () => new ReadableStream(),
        type: "application/zip",
        size: 128,
      };
    };

    const req = new Request(
      `http://localhost/downloads/get/${fileId}?licenseKey=valid-git-fallback-key`,
    );
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("release.zip");
    expect(res.headers.get("X-SHA256")).toBe("git-sha");
  });

  test("GET /downloads/get/:id should reject git file from another product", async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  key: "valid-key-prod-a",
                  productId: "prod_a",
                  expirationDate: futureDate,
                },
              ]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  id: "git_dl_cross",
                  productId: "prod_b",
                  repoUrl: "https://github.com/acme/repo",
                  filePath: "dist/secret.zip",
                  branch: "main",
                  commitSha: "abc",
                  localPath: "./git-downloads/git_dl_cross",
                  filename: "secret.zip",
                  sha256: "sha-secret",
                  lastSyncAt: new Date(),
                  createdAt: new Date(),
                },
              ]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }));

    const req = new Request(
      "http://localhost/downloads/get/git_dl_cross?licenseKey=valid-key-prod-a",
    );
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(404);
    expect(await res.text()).toBe("File not found");
  });

  test("GET /downloads/get/:id should resolve git filePath relative to localPath", async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  key: "valid-relpath-key",
                  productId: "prod_rel",
                  expirationDate: futureDate,
                },
              ]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  id: "git_rel_1",
                  productId: "prod_rel",
                  repoUrl: "https://github.com/acme/repo",
                  filePath: "main.lua",
                  branch: "main",
                  commitSha: "abc",
                  localPath: "./git-downloads/git_rel_1",
                  filename: "main.lua",
                  sha256: "sha-rel",
                  lastSyncAt: new Date(),
                  createdAt: new Date(),
                },
              ]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }));

    (Bun as unknown as Record<string, unknown>).file = (path: string) => {
      if (path !== "git-downloads/git_rel_1/main.lua") {
        return {
          exists: () => Promise.resolve(false),
        };
      }

      return {
        exists: () => Promise.resolve(true),
        stream: () => new ReadableStream(),
        type: "text/plain",
        size: 64,
      };
    };

    const req = new Request(
      "http://localhost/downloads/get/git_rel_1?licenseKey=valid-relpath-key",
    );
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("main.lua");
    expect(res.headers.get("X-SHA256")).toBe("sha-rel");
  });

  test("GET /downloads/get/:id should return 400 when licenseKey is missing", async () => {
    const req = new Request("http://localhost/downloads/get/dl_1");
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Missing licenseKey");
  });

  test("GET /downloads/get/:id with plaintext=true should return file content as text", async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const license = {
      key: "valid-key-plaintext",
      productId: "prod_abc",
      tier: null,
      expirationDate: futureDate,
      createdAt: new Date(),
    };

    const file = {
      id: "dl_plaintext",
      productId: "prod_abc",
      version: "1.0.0",
      filename: "readme.txt",
      filePath: "./uploads/prod_abc/1.0.0/readme.txt",
      sha256: "plain123",
      createdAt: new Date(),
    };

    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([license]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([file]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }));

    (Bun as unknown as Record<string, unknown>).file = (_path: string) => ({
      exists: () => Promise.resolve(true),
      text: () => Promise.resolve("Hello, this is plaintext content!"),
      type: "text/plain",
      size: 30,
    });

    const req = new Request(
      "http://localhost/downloads/get/dl_plaintext?licenseKey=valid-key-plaintext&plaintext=true",
    );
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toContain("inline");
    expect(res.headers.get("Content-Disposition")).toContain("readme.txt");
    expect(res.headers.get("X-SHA256")).toBe("plain123");
    expect(await res.text()).toBe("Hello, this is plaintext content!");
  });

  test("GET /downloads/get/:id with plaintext=false should download as attachment", async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const license = {
      key: "valid-key-noplain",
      productId: "prod_abc",
      tier: null,
      expirationDate: futureDate,
      createdAt: new Date(),
    };

    const file = {
      id: "dl_noplain",
      productId: "prod_abc",
      version: "1.0.0",
      filename: "data.zip",
      filePath: "./uploads/prod_abc/1.0.0/data.zip",
      sha256: "zip456",
      createdAt: new Date(),
    };

    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([license]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([file]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }));

    (Bun as unknown as Record<string, unknown>).file = (_path: string) => ({
      exists: () => Promise.resolve(true),
      stream: () => new ReadableStream(),
      type: "application/zip",
      size: 100,
    });

    const req = new Request(
      "http://localhost/downloads/get/dl_noplain?licenseKey=valid-key-noplain&plaintext=false",
    );
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    expect(res.headers.get("Content-Disposition")).toContain("data.zip");
    expect(res.headers.get("X-SHA256")).toBe("zip456");
  });

  test("GET /downloads/get/:id should return 404 when file not found on disk", async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const license = {
      key: "valid-key-disk",
      productId: "prod_abc",
      tier: null,
      expirationDate: futureDate,
      createdAt: new Date(),
    };

    const file = {
      id: "dl_missing",
      productId: "prod_abc",
      version: "1.0.0",
      filename: "missing.zip",
      filePath: "./uploads/prod_abc/1.0.0/missing.zip",
      sha256: "abc123",
      createdAt: new Date(),
    };

    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([license]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([file]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }));

    (Bun as unknown as Record<string, unknown>).file = (_path: string) => ({
      exists: () => Promise.resolve(false),
    });

    const req = new Request(
      "http://localhost/downloads/get/dl_missing?licenseKey=valid-key-disk",
    );
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(404);
    expect(await res.text()).toBe("File not found on disk");
  });

  test("GET /downloads/files should work with perpetual license (null expiration)", async () => {
    const license = {
      key: "perpetual-key",
      productId: "prod_abc",
      tier: null,
      expirationDate: null,
      createdAt: new Date(),
    };

    const files = [
      {
        id: "dl_1",
        productId: "prod_abc",
        version: "1.0.0",
        filename: "app-1.0.0.zip",
        filePath: "./uploads/prod_abc/1.0.0/app-1.0.0.zip",
        sha256: "abc123",
        createdAt: new Date("2024-01-01T00:00:00Z"),
      },
    ];

    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([license]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => Promise.resolve(files),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => Promise.resolve([]),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }));

    const req = new Request(
      "http://localhost/downloads/files?licenseKey=perpetual-key",
    );
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(body).toHaveLength(1);
  });

  test("POST /downloads/delete should delete git entry when github=true", async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              {
                id: "git_delete_1",
                productId: "prod_123",
                repoUrl: "https://github.com/acme/repo",
                filePath: "dist/app.zip",
                branch: "main",
                commitSha: "abc",
                localPath: "./git-downloads/git_delete_1",
                filename: "app.zip",
                sha256: "sha",
                lastSyncAt: new Date(),
                createdAt: new Date(),
              },
            ]),
        }),
        limit: () => ({ offset: () => Promise.resolve([]) }),
      }),
    }));

    const req = new Request("http://localhost/downloads/delete", {
      method: "POST",
      body: JSON.stringify({ id: "git_delete_1", github: true }),
    });

    const res = await handleDownloadsRequest(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      id: string;
      github: boolean;
    };
    expect(body.success).toBe(true);
    expect(body.id).toBe("git_delete_1");
    expect(body.github).toBe(true);
    expect(mockDelete).toHaveBeenCalledTimes(2);
  });

  test("POST /downloads/delete should fallback to git when regular is missing", async () => {
    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  id: "git_fallback_1",
                  productId: "prod_123",
                  repoUrl: "https://github.com/acme/repo",
                  filePath: "dist/app.zip",
                  branch: "main",
                  commitSha: "abc",
                  localPath: "./git-downloads/git_fallback_1",
                  filename: "app.zip",
                  sha256: "sha",
                  lastSyncAt: new Date(),
                  createdAt: new Date(),
                },
              ]),
          }),
          limit: () => ({ offset: () => Promise.resolve([]) }),
        }),
      }));

    const req = new Request("http://localhost/downloads/delete", {
      method: "POST",
      body: JSON.stringify({ id: "git_fallback_1" }),
    });

    const res = await handleDownloadsRequest(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      id: string;
      github: boolean;
    };
    expect(body.success).toBe(true);
    expect(body.id).toBe("git_fallback_1");
    expect(body.github).toBe(true);
    expect(mockDelete).toHaveBeenCalledTimes(2);
  });

  test("should return 401 when authentication fails for admin endpoints", async () => {
    setAuthResult(false);

    const req = new Request("http://localhost/downloads/list?limit=10&page=1");
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Unauthorized");
  });
});

(Bun as unknown as Record<string, unknown>).write = originalWrite;
(Bun as unknown as Record<string, unknown>).file = originalFile;
