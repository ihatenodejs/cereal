import { eq } from "drizzle-orm";

import { db } from "../db/index.ts";
import { apiKeys } from "../db/schema.ts";

export async function authenticate(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return false;
  }

  // Expecting "Bearer <key>" or just "<key>"
  const key = authHeader.replace("Bearer ", "").trim();

  if (!key) {
    return false;
  }

  const [apiKey] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.key, key))
    .limit(1);

  if (!apiKey) {
    return false;
  }

  if (apiKey.expirationDate && new Date() > apiKey.expirationDate) {
    return false;
  }

  return true;
}
