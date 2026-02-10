import { db } from "../src/db/index.ts";
import { apiKeys } from "../src/db/schema.ts";

console.log("Generating a new API Key...");

const name = prompt("Enter a name for this API key (optional):");
const expiration = prompt("Enter an expiration date (YYYY-MM-DD, optional):");

const key = crypto.randomUUID();
const expirationDate = expiration ? new Date(expiration) : null;

await db.insert(apiKeys).values({
  key,
  name: name || null,
  expirationDate,
});

console.log("\nAPI Key created successfully!");
console.log(`Key: ${key}`);
if (name) console.log(`Name: ${name}`);
if (expirationDate) console.log(`Expires: ${expirationDate.toISOString()}`);
console.log("\nMake sure to save this key, it will not be shown again.");

process.exit(0);
