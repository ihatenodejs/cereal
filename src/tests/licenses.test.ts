import { describe, expect, test, beforeEach } from "bun:test";

import { handleLicensesRequest } from "../routes/licenses.ts";
import { createMockLicense } from "./helpers/test-data.ts";
import {
  setupMocks,
  clearMocks,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockSelect,
} from "./helpers/test-mocks.ts";

setupMocks();

describe("Licenses Endpoints", () => {
  beforeEach(() => {
    clearMocks();
  });

  test("POST /licenses/add should create a license", async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              {
                id: "prod_123",
                name: "Product",
                availableTiers: null,
              },
            ]),
        }),
        limit: () => ({
          offset: () => Promise.resolve([]),
        }),
      }),
    }));

    const req = new Request("http://localhost/licenses/add", {
      method: "POST",
      body: JSON.stringify({ productId: "prod_123" }),
    });

    const res = await handleLicensesRequest(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; key: string };
    expect(body.success).toBe(true);
    expect(body.key).toBeDefined();

    expect(mockInsert).toHaveBeenCalled();
  });

  test("POST /licenses/add should fail without productId", async () => {
    const req = new Request("http://localhost/licenses/add", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await handleLicensesRequest(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Missing productId");
  });

  test("POST /licenses/add should create a license with tier", async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              {
                id: "prod_123",
                name: "Product",
                availableTiers: ["basic", "max"],
              },
            ]),
        }),
        limit: () => ({
          offset: () => Promise.resolve([]),
        }),
      }),
    }));

    const req = new Request("http://localhost/licenses/add", {
      method: "POST",
      body: JSON.stringify({ productId: "prod_123", tier: "max" }),
    });

    const res = await handleLicensesRequest(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; key: string };
    expect(body.success).toBe(true);
    expect(body.key).toBeDefined();

    expect(mockInsert).toHaveBeenCalled();
  });

  test("POST /licenses/add should fail with invalid tier", async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              {
                id: "prod_123",
                name: "Product",
                availableTiers: ["basic", "max"],
              },
            ]),
        }),
        limit: () => ({
          offset: () => Promise.resolve([]),
        }),
      }),
    }));

    const req = new Request("http://localhost/licenses/add", {
      method: "POST",
      body: JSON.stringify({ productId: "prod_123", tier: "invalid" }),
    });

    const res = await handleLicensesRequest(req);
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toContain("Invalid tier");
    expect(text).toContain("basic, max");
  });

  test("POST /licenses/edit should update a license", async () => {
    const license = createMockLicense({
      key: "lic_123",
      productId: "prod_456",
    });

    const currentLicense = {
      key: "lic_123",
      productId: "prod_456",
      tier: null,
      expirationDate: null,
      createdAt: new Date(),
    };

    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([currentLicense]),
          }),
          limit: () => ({
            offset: () => Promise.resolve([]),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  id: "prod_456",
                  name: "Product",
                  availableTiers: null,
                },
              ]),
          }),
          limit: () => ({
            offset: () => Promise.resolve([]),
          }),
        }),
      }));

    const req = new Request("http://localhost/licenses/edit", {
      method: "POST",
      body: JSON.stringify(license),
    });

    const res = await handleLicensesRequest(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);

    expect(mockUpdate).toHaveBeenCalled();
  });

  test("POST /licenses/edit should update a license tier", async () => {
    const currentLicense = {
      key: "lic_123",
      productId: "prod_123",
      tier: "basic",
      expirationDate: null,
      createdAt: new Date(),
    };

    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              {
                id: "prod_123",
                name: "Product",
                availableTiers: ["basic", "max"],
              },
            ]),
        }),
        limit: () => ({
          offset: () => Promise.resolve([]),
        }),
      }),
    }));

    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([currentLicense]),
          }),
          limit: () => ({
            offset: () => Promise.resolve([]),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  id: "prod_123",
                  name: "Product",
                  availableTiers: ["basic", "max"],
                },
              ]),
          }),
          limit: () => ({
            offset: () => Promise.resolve([]),
          }),
        }),
      }));

    const req = new Request("http://localhost/licenses/edit", {
      method: "POST",
      body: JSON.stringify({ key: "lic_123", tier: "max" }),
    });

    const res = await handleLicensesRequest(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);

    expect(mockUpdate).toHaveBeenCalled();
  });

  test("POST /licenses/edit should fail with invalid tier", async () => {
    const currentLicense = {
      key: "lic_123",
      productId: "prod_123",
      tier: "basic",
      expirationDate: null,
      createdAt: new Date(),
    };

    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([currentLicense]),
          }),
          limit: () => ({
            offset: () => Promise.resolve([]),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  id: "prod_123",
                  name: "Product",
                  availableTiers: ["basic", "max"],
                },
              ]),
          }),
          limit: () => ({
            offset: () => Promise.resolve([]),
          }),
        }),
      }));

    const req = new Request("http://localhost/licenses/edit", {
      method: "POST",
      body: JSON.stringify({ key: "lic_123", tier: "premium" }),
    });

    const res = await handleLicensesRequest(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("Invalid tier");
  });

  test("POST /licenses/delete should delete a license", async () => {
    const req = new Request("http://localhost/licenses/delete", {
      method: "POST",
      body: JSON.stringify({ key: "lic_123" }),
    });

    const res = await handleLicensesRequest(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);

    expect(mockDelete).toHaveBeenCalled();
  });

  test("GET /licenses/list should return a list of licenses", async () => {
    const licenses = [
      createMockLicense({ key: "lic_1", productId: "prod_1" }),
      createMockLicense({ key: "lic_2", productId: "prod_2" }),
    ];

    // Mock the chain: select -> from -> limit -> offset -> resolve(licenses)
    mockSelect.mockImplementation(() => ({
      from: () => ({
        limit: () => ({
          offset: () => Promise.resolve(licenses),
        }),
      }),
    }));

    const req = new Request("http://localhost/licenses/list?limit=10&page=1");
    const res = await handleLicensesRequest(req);

    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(body).toHaveLength(2);
    expect(body).toHaveLength(2);
    expect(body[0]).toEqual({
      ...licenses[0],
      expirationDate: licenses[0]!.expirationDate.toISOString(),
    });
    expect(body[1]).toEqual({
      ...licenses[1],
      expirationDate: licenses[1]!.expirationDate.toISOString(),
    });

    expect(mockSelect).toHaveBeenCalled();
  });
});

describe("License Validation Endpoint", () => {
  beforeEach(() => {
    clearMocks();
  });

  test("POST /licenses/validate should return valid for existing non-expired license with tier", async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const license = {
      key: "550e8400-e29b-41d4-a716-446655440000",
      productId: "am-max",
      tier: "max",
      expirationDate: futureDate,
      createdAt: new Date("2025-02-10T12:00:00Z"),
    };

    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([license]),
        }),
        limit: () => ({
          offset: () => Promise.resolve([]),
        }),
      }),
    }));

    const req = new Request("http://localhost/licenses/validate", {
      method: "POST",
      body: JSON.stringify({ key: license.key }),
    });

    const res = await handleLicensesRequest(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      valid: boolean;
      productId: string;
      tier: string;
      expirationDate: string;
      createdAt: string;
    };

    expect(body.valid).toBe(true);
    expect(body.productId).toBe("am-max");
    expect(body.tier).toBe("max");
    expect(body.expirationDate).toBeDefined();
    expect(body.createdAt).toBeDefined();
  });

  test("POST /licenses/validate should return valid for existing non-expired license without tier", async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const license = {
      key: "550e8400-e29b-41d4-a716-446655440000",
      productId: "am-basic",
      tier: null,
      expirationDate: futureDate,
      createdAt: new Date("2025-02-10T12:00:00Z"),
    };

    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([license]),
        }),
        limit: () => ({
          offset: () => Promise.resolve([]),
        }),
      }),
    }));

    const req = new Request("http://localhost/licenses/validate", {
      method: "POST",
      body: JSON.stringify({ key: license.key }),
    });

    const res = await handleLicensesRequest(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      valid: boolean;
      productId: string;
      tier: string | null;
      expirationDate: string;
      createdAt: string;
    };

    expect(body.valid).toBe(true);
    expect(body.productId).toBe("am-basic");
    expect(body.tier).toBeNull();
    expect(body.expirationDate).toBeDefined();
    expect(body.createdAt).toBeDefined();
  });

  test("POST /licenses/validate should return valid for license with no expiration date", async () => {
    const license = {
      key: "550e8400-e29b-41d4-a716-446655440000",
      productId: "am-max",
      tier: "max",
      expirationDate: null,
      createdAt: new Date("2025-02-10T12:00:00Z"),
    };

    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([license]),
        }),
        limit: () => ({
          offset: () => Promise.resolve([]),
        }),
      }),
    }));

    const req = new Request("http://localhost/licenses/validate", {
      method: "POST",
      body: JSON.stringify({ key: license.key }),
    });

    const res = await handleLicensesRequest(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      valid: boolean;
      productId: string;
      tier: string;
      expirationDate: null;
      createdAt: string;
    };

    expect(body.valid).toBe(true);
    expect(body.productId).toBe("am-max");
    expect(body.tier).toBe("max");
    expect(body.expirationDate).toBeNull();
    expect(body.createdAt).toBeDefined();
  });

  test("POST /licenses/validate should return invalid for non-existent license", async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
        limit: () => ({
          offset: () => Promise.resolve([]),
        }),
      }),
    }));

    const req = new Request("http://localhost/licenses/validate", {
      method: "POST",
      body: JSON.stringify({ key: "non-existent-key" }),
    });

    const res = await handleLicensesRequest(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean; reason: string };

    expect(body.valid).toBe(false);
    expect(body.reason).toBe("License key not found");
  });

  test("POST /licenses/validate should return invalid for expired license", async () => {
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);

    const license = {
      key: "550e8400-e29b-41d4-a716-446655440000",
      productId: "am-max",
      tier: "max",
      expirationDate: pastDate,
      createdAt: new Date("2024-02-10T12:00:00Z"),
    };

    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([license]),
        }),
        limit: () => ({
          offset: () => Promise.resolve([]),
        }),
      }),
    }));

    const req = new Request("http://localhost/licenses/validate", {
      method: "POST",
      body: JSON.stringify({ key: license.key }),
    });

    const res = await handleLicensesRequest(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      valid: boolean;
      reason: string;
      expirationDate: string;
    };

    expect(body.valid).toBe(false);
    expect(body.reason).toBe("License has expired");
    expect(body.expirationDate).toBeDefined();
  });

  test("POST /licenses/validate should return 400 for missing key", async () => {
    const req = new Request("http://localhost/licenses/validate", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await handleLicensesRequest(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Missing key");
  });

  test("GET /licenses/validate should return 405 for wrong method", async () => {
    const req = new Request("http://localhost/licenses/validate", {
      method: "GET",
    });

    const res = await handleLicensesRequest(req);
    expect(res.status).toBe(405);
    expect(await res.text()).toBe("Method Not Allowed");
  });
});

describe("License Tier Validation", () => {
  beforeEach(() => {
    clearMocks();
  });

  test("POST /licenses/add should require tier for product with availableTiers", async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              {
                id: "prod_tiered",
                name: "Tiered Product",
                availableTiers: ["starter", "pro", "enterprise"],
              },
            ]),
        }),
        limit: () => ({
          offset: () => Promise.resolve([]),
        }),
      }),
    }));

    const req = new Request("http://localhost/licenses/add", {
      method: "POST",
      body: JSON.stringify({ productId: "prod_tiered" }),
    });

    const res = await handleLicensesRequest(req);
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toContain("requires a tier");
    expect(text).toContain("starter, pro, enterprise");
  });

  test("POST /licenses/add should allow tier for product without availableTiers", async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              {
                id: "prod_simple",
                name: "Simple Product",
                availableTiers: null,
              },
            ]),
        }),
        limit: () => ({
          offset: () => Promise.resolve([]),
        }),
      }),
    }));

    const req = new Request("http://localhost/licenses/add", {
      method: "POST",
      body: JSON.stringify({ productId: "prod_simple" }),
    });

    const res = await handleLicensesRequest(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; key: string };
    expect(body.success).toBe(true);
  });

  test("POST /licenses/add should accept valid tier for product with availableTiers", async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              {
                id: "prod_tiered",
                name: "Tiered Product",
                availableTiers: ["starter", "pro", "enterprise"],
              },
            ]),
        }),
        limit: () => ({
          offset: () => Promise.resolve([]),
        }),
      }),
    }));

    const req = new Request("http://localhost/licenses/add", {
      method: "POST",
      body: JSON.stringify({ productId: "prod_tiered", tier: "pro" }),
    });

    const res = await handleLicensesRequest(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; key: string };
    expect(body.success).toBe(true);
  });

  test("POST /licenses/add should return 404 for non-existent product", async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
        limit: () => ({
          offset: () => Promise.resolve([]),
        }),
      }),
    }));

    const req = new Request("http://localhost/licenses/add", {
      method: "POST",
      body: JSON.stringify({ productId: "non_existent" }),
    });

    const res = await handleLicensesRequest(req);
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("not found");
  });

  test("POST /licenses/edit should validate tier when changing productId", async () => {
    const currentLicense = {
      key: "lic_123",
      productId: "prod_old",
      tier: null,
      expirationDate: null,
      createdAt: new Date(),
    };

    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([currentLicense]),
          }),
          limit: () => ({
            offset: () => Promise.resolve([]),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  id: "prod_new",
                  name: "New Product",
                  availableTiers: ["basic", "premium"],
                },
              ]),
          }),
          limit: () => ({
            offset: () => Promise.resolve([]),
          }),
        }),
      }));

    const req = new Request("http://localhost/licenses/edit", {
      method: "POST",
      body: JSON.stringify({ key: "lic_123", productId: "prod_new" }),
    });

    const res = await handleLicensesRequest(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("requires a tier");
  });

  test("POST /licenses/edit should allow changing to product without tiers", async () => {
    const currentLicense = {
      key: "lic_123",
      productId: "prod_old",
      tier: "basic",
      expirationDate: null,
      createdAt: new Date(),
    };

    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([currentLicense]),
          }),
          limit: () => ({
            offset: () => Promise.resolve([]),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  id: "prod_new",
                  name: "New Product",
                  availableTiers: null,
                },
              ]),
          }),
          limit: () => ({
            offset: () => Promise.resolve([]),
          }),
        }),
      }));

    const req = new Request("http://localhost/licenses/edit", {
      method: "POST",
      body: JSON.stringify({ key: "lic_123", productId: "prod_new" }),
    });

    const res = await handleLicensesRequest(req);
    expect(res.status).toBe(200);
  });

  test("POST /licenses/edit should validate tier when changing both productId and tier", async () => {
    const currentLicense = {
      key: "lic_123",
      productId: "prod_old",
      tier: "basic",
      expirationDate: null,
      createdAt: new Date(),
    };

    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([currentLicense]),
          }),
          limit: () => ({
            offset: () => Promise.resolve([]),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  id: "prod_new",
                  name: "New Product",
                  availableTiers: ["standard", "deluxe"],
                },
              ]),
          }),
          limit: () => ({
            offset: () => Promise.resolve([]),
          }),
        }),
      }));

    const req = new Request("http://localhost/licenses/edit", {
      method: "POST",
      body: JSON.stringify({
        key: "lic_123",
        productId: "prod_new",
        tier: "deluxe",
      }),
    });

    const res = await handleLicensesRequest(req);
    expect(res.status).toBe(200);
  });

  test("POST /licenses/edit should return 404 for non-existent license", async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
        limit: () => ({
          offset: () => Promise.resolve([]),
        }),
      }),
    }));

    const req = new Request("http://localhost/licenses/edit", {
      method: "POST",
      body: JSON.stringify({ key: "non_existent", tier: "basic" }),
    });

    const res = await handleLicensesRequest(req);
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("not found");
  });
});
