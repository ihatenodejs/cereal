import { describe, expect, test } from "bun:test";

import { handleSwaggerRoute } from "../routes/swagger.ts";

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

  test("GET /unknown should return null", () => {
    const req = new Request("http://localhost/unknown");
    const res = handleSwaggerRoute(req);

    expect(res).toBeNull();
  });
});
