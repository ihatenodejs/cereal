import packageJson from "../../package.json";

const serverStartTime = Date.now();

/**
 * Handles the root redirect to /health
 */
export function handleRoot(_req: Request): Response {
  return new Response(null, {
    status: 308,
    headers: { Location: "/health" },
  });
}

/**
 * Handles the health check endpoint
 * Returns server runtime and version information
 */
export function handleHealth(_req: Request): Response {
  return Response.json({
    runtime: Math.floor((Date.now() - serverStartTime) / 1000),
    version: packageJson.version,
  });
}
