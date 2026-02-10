import { swaggerSpec } from "../../swagger.ts";

/**
 * Handles the Swagger JSON spec endpoint
 */
export function handleSwaggerJson(_req: Request): Response {
  return Response.json(swaggerSpec);
}

/**
 * Handles the Swagger UI page
 */
export function handleSwaggerUI(_req: Request): Response {
  const file = Bun.file("./src/templates/swagger.html");
  return new Response(file, {
    headers: { "Content-Type": "text/html" },
  });
}

/**
 * Handles the Swagger initialization script
 */
export function handleSwaggerInit(_req: Request): Response {
  const file = Bun.file("./src/templates/swagger-init.js");
  return new Response(file, {
    headers: { "Content-Type": "application/javascript" },
  });
}

/**
 * Handles serving Swagger UI static assets from node_modules
 */
export function handleSwaggerAssets(req: Request): Response {
  const url = new URL(req.url);
  const assetPath = url.pathname.replace("/swagger-ui-assets/", "");
  const filePath = `./node_modules/swagger-ui-dist/${assetPath}`;
  const file = Bun.file(filePath);
  return new Response(file);
}

/**
 * Route matcher for Swagger-related endpoints
 */
export function isSwaggerRoute(pathname: string): boolean {
  return (
    pathname === "/swagger.json" ||
    pathname === "/swagger" ||
    pathname === "/swagger-init.js" ||
    pathname.startsWith("/swagger-ui-assets/")
  );
}

/**
 * Main router for all Swagger endpoints
 */
export function handleSwaggerRoute(req: Request): Response | null {
  const url = new URL(req.url);
  const { pathname } = url;

  if (pathname === "/swagger.json") {
    return handleSwaggerJson(req);
  }

  if (pathname === "/swagger") {
    return handleSwaggerUI(req);
  }

  if (pathname === "/swagger-init.js") {
    return handleSwaggerInit(req);
  }

  if (pathname.startsWith("/swagger-ui-assets/")) {
    return handleSwaggerAssets(req);
  }

  return null;
}
