import { describe, expect, test, mock, beforeEach } from "bun:test";

import { handleDownloadsRequest } from "../routes/downloads.ts";
import {
  setupMocks,
  clearMocks,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockSelect,
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

    mockSelect.mockImplementation(() => ({
      from: () => ({
        limit: () => ({
          offset: () => Promise.resolve(files),
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
    expect(body[0]!.url).toContain("/downloads/get/dl_1");
    expect(body[0]!.url).toContain("licenseKey=valid-key-123");
    // filePath must not be exposed
    expect(body[0] as Record<string, unknown>).not.toHaveProperty("filePath");
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
      }));

    const req = new Request(
      "http://localhost/downloads/get/nonexistent?licenseKey=valid-key",
    );
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(404);
  });

  test("GET /downloads/get/:id should return 400 when licenseKey is missing", async () => {
    const req = new Request("http://localhost/downloads/get/dl_1");
    const res = await handleDownloadsRequest(req);

    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Missing licenseKey");
  });
});

(Bun as unknown as Record<string, unknown>).write = originalWrite;
(Bun as unknown as Record<string, unknown>).file = originalFile;
