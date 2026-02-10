import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString =
  process.env.POSTGRES_URL ||
  "postgres://postgres:postgres@localhost:5432/cereal";

const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client);
