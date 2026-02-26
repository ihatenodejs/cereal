import packageJson from "./package.json";
import { config } from "./src/config/server.ts";
import { handleDownloadsRequest } from "./src/routes/downloads.ts";
import { handleRoot, handleHealth } from "./src/routes/health.ts";
import { handleLicensesRequest } from "./src/routes/licenses.ts";
import { handleProductsRequest } from "./src/routes/products.ts";
import { handleSwaggerRoute } from "./src/routes/swagger.ts";

const server = Bun.serve({
  port: config.port,
  async fetch(req) {
    const url = new URL(req.url);

    // Root redirect
    if (url.pathname === "/") {
      return handleRoot(req);
    }

    // Health check endpoint
    if (url.pathname === "/health") {
      return handleHealth(req);
    }

    // Product endpoints
    if (url.pathname.startsWith("/products")) {
      return handleProductsRequest(req);
    }

    // License endpoints
    if (url.pathname.startsWith("/licenses")) {
      return handleLicensesRequest(req);
    }

    // Downloads endpoints
    if (url.pathname.startsWith("/downloads")) {
      return handleDownloadsRequest(req);
    }

    // Swagger documentation endpoints
    const swaggerResponse = handleSwaggerRoute(req);
    if (swaggerResponse) {
      return swaggerResponse;
    }

    // 404 for all other routes
    return new Response("Not Found", { status: 404 });
  },
  development: config.isDevelopment,
});

console.log(`Cereal v${packageJson.version}`);
console.log(`${"=".repeat(packageJson.version.length + 8)}\n`);
console.log(`Listening on http://localhost:${server.port}`);
