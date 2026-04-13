import { describe, expect, test } from "bun:test";

import { handleSwaggerRoute, isSwaggerRoute } from "../routes/swagger.ts";

describe("Swagger Endpoints", () => {
  test("GET /swagger.json should return spec", async () => {
    const req = new Request("http://localhost/swagger.json");
    const res = handleSwaggerRoute(req);

    expect(res).not.toBeNull();
    expect(res!.status).toBe(200);
    const body = (await res!.json()) as { openapi: string };
    expect(body).toHaveProperty("openapi");
  });

  test("GET /swagger should return HTML", () => {
    const req = new Request("http://localhost/swagger");
    const res = handleSwaggerRoute(req);

    expect(res).not.toBeNull();
    expect(res!.status).toBe(200);
    expect(res!.headers.get("Content-Type")).toBe("text/html");
  });

  test("GET /swagger-init.js should return JS", () => {
    const req = new Request("http://localhost/swagger-init.js");
    const res = handleSwaggerRoute(req);

    expect(res).not.toBeNull();
    expect(res!.status).toBe(200);
    expect(res!.headers.get("Content-Type")).toBe("application/javascript");
  });

  test("GET /swagger-ui-assets/* should serve static assets", () => {
    const req = new Request(
      "http://localhost/swagger-ui-assets/swagger-ui.css",
    );
    const res = handleSwaggerRoute(req);

    expect(res).not.toBeNull();
  });

  test("GET /unknown should return null", () => {
    const req = new Request("http://localhost/unknown");
    const res = handleSwaggerRoute(req);

    expect(res).toBeNull();
  });
});

describe("isSwaggerRoute helper", () => {
  test("should return true for /swagger.json", () => {
    expect(isSwaggerRoute("/swagger.json")).toBe(true);
  });

  test("should return true for /swagger", () => {
    expect(isSwaggerRoute("/swagger")).toBe(true);
  });

  test("should return true for /swagger-init.js", () => {
    expect(isSwaggerRoute("/swagger-init.js")).toBe(true);
  });

  test("should return true for /swagger-ui-assets/* paths", () => {
    expect(isSwaggerRoute("/swagger-ui-assets/swagger-ui.css")).toBe(true);
    expect(isSwaggerRoute("/swagger-ui-assets/swagger-ui-bundle.js")).toBe(
      true,
    );
  });

  test("should return false for non-swagger paths", () => {
    expect(isSwaggerRoute("/health")).toBe(false);
    expect(isSwaggerRoute("/products")).toBe(false);
    expect(isSwaggerRoute("/licenses")).toBe(false);
    expect(isSwaggerRoute("/")).toBe(false);
    expect(isSwaggerRoute("/unknown")).toBe(false);
  });
});
