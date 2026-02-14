import { describe, expect, test, beforeEach } from "bun:test";

import { handleProductsRequest } from "../routes/products.ts";
import { createMockProduct } from "./helpers/test-data.ts";
import {
  setupMocks,
  clearMocks,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockSelect,
} from "./helpers/test-mocks.ts";

setupMocks();

describe("Products Endpoints", () => {
  beforeEach(() => {
    clearMocks();
  });

  test("POST /products/add should create a product", async () => {
    const product = createMockProduct({ id: "prod_123", name: "Cereal Box" });
    const req = new Request("http://localhost/products/add", {
      method: "POST",
      body: JSON.stringify(product),
    });

    const res = await handleProductsRequest(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; id: string };
    expect(body.success).toBe(true);
    expect(body.id).toBe(product.id);

    expect(mockInsert).toHaveBeenCalled();
  });

  test("POST /products/add should fail without id or name", async () => {
    const req = new Request("http://localhost/products/add", {
      method: "POST",
      body: JSON.stringify({ id: "prod_123" }), // Missing name
    });

    const res = await handleProductsRequest(req);
    expect(res.status).toBe(400);
  });

  test("POST /products/edit should update a product", async () => {
    const product = createMockProduct({
      id: "prod_123",
      name: "New Cereal Box",
    });
    const req = new Request("http://localhost/products/edit", {
      method: "POST",
      body: JSON.stringify(product),
    });

    const res = await handleProductsRequest(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);

    expect(mockUpdate).toHaveBeenCalled();
  });

  test("POST /products/delete should delete a product", async () => {
    const req = new Request("http://localhost/products/delete", {
      method: "POST",
      body: JSON.stringify({ id: "prod_123" }),
    });

    const res = await handleProductsRequest(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);

    expect(mockDelete).toHaveBeenCalled();
  });

  test("GET /products/list should return a list of products", async () => {
    const products = [
      createMockProduct({ id: "prod_1", name: "Product 1" }),
      createMockProduct({ id: "prod_2", name: "Product 2" }),
    ];

    // Mock the chain: select -> from -> limit -> offset -> resolve(products)
    mockSelect.mockImplementation(() => ({
      from: () => ({
        limit: () => ({
          offset: () => Promise.resolve(products),
        }),
      }),
    }));

    const req = new Request("http://localhost/products/list?limit=10&page=1");
    const res = await handleProductsRequest(req);

    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(body).toHaveLength(2);
    expect(body[0]).toEqual(products[0]);
    expect(body[1]).toEqual(products[1]);

    expect(mockSelect).toHaveBeenCalled();
  });

  test("POST /products/add should create a product with availableTiers", async () => {
    const product = createMockProduct({
      id: "prod_123",
      name: "Tiered Product",
      availableTiers: ["starter", "pro", "enterprise"],
    });
    const req = new Request("http://localhost/products/add", {
      method: "POST",
      body: JSON.stringify(product),
    });

    const res = await handleProductsRequest(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; id: string };
    expect(body.success).toBe(true);
    expect(body.id).toBe(product.id);

    expect(mockInsert).toHaveBeenCalled();
  });

  test("POST /products/add should fail with non-array availableTiers", async () => {
    const req = new Request("http://localhost/products/add", {
      method: "POST",
      body: JSON.stringify({
        id: "prod_123",
        name: "Test",
        availableTiers: "not-an-array",
      }),
    });

    const res = await handleProductsRequest(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("availableTiers must be an array");
  });

  test("POST /products/add should fail with empty string in availableTiers", async () => {
    const req = new Request("http://localhost/products/add", {
      method: "POST",
      body: JSON.stringify({
        id: "prod_123",
        name: "Test",
        availableTiers: ["basic", "", "pro"],
      }),
    });

    const res = await handleProductsRequest(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe(
      "availableTiers cannot contain empty strings",
    );
  });

  test("POST /products/add should fail with duplicate tiers", async () => {
    const req = new Request("http://localhost/products/add", {
      method: "POST",
      body: JSON.stringify({
        id: "prod_123",
        name: "Test",
        availableTiers: ["basic", "pro", "basic"],
      }),
    });

    const res = await handleProductsRequest(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("availableTiers cannot contain duplicates");
  });

  test("POST /products/edit should update product availableTiers", async () => {
    const req = new Request("http://localhost/products/edit", {
      method: "POST",
      body: JSON.stringify({
        id: "prod_123",
        availableTiers: ["basic", "premium"],
      }),
    });

    const res = await handleProductsRequest(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);

    expect(mockUpdate).toHaveBeenCalled();
  });

  test("POST /products/edit should clear availableTiers with empty array", async () => {
    const req = new Request("http://localhost/products/edit", {
      method: "POST",
      body: JSON.stringify({
        id: "prod_123",
        availableTiers: [],
      }),
    });

    const res = await handleProductsRequest(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);

    expect(mockUpdate).toHaveBeenCalled();
  });

  test("POST /products/edit should fail with invalid availableTiers", async () => {
    const req = new Request("http://localhost/products/edit", {
      method: "POST",
      body: JSON.stringify({
        id: "prod_123",
        availableTiers: ["basic", "basic", "pro"],
      }),
    });

    const res = await handleProductsRequest(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("availableTiers cannot contain duplicates");
  });
});
