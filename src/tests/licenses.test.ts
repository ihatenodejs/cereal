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
  });

  test("POST /licenses/edit should update a license", async () => {
    const license = createMockLicense({
      key: "lic_123",
      productId: "prod_456",
    });
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
