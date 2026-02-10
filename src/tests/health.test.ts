import { describe, expect, test } from "bun:test";

import { handleHealth, handleRoot } from "../routes/health.ts";

describe("Health Endpoints", () => {
  test("GET / should redirect to /health", () => {
    const req = new Request("http://localhost/");
    const res = handleRoot(req);

    expect(res.status).toBe(308);
    expect(res.headers.get("Location")).toBe("/health");
  });

  test("GET /health should return 200 with version", async () => {
    const req = new Request("http://localhost/health");
    const res = handleHealth(req);

    expect(res.status).toBe(200);

    const body = (await res.json()) as { version: string; runtime: number };
    expect(body).toHaveProperty("version");
    expect(body).toHaveProperty("runtime");
    expect(typeof body.runtime).toBe("number");
  });
});
