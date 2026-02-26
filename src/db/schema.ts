import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

export const applications = pgTable("applications", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  availableTiers: text("available_tiers").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const licenses = pgTable("licenses", {
  key: text("key").primaryKey(),
  productId: text("product_id")
    .references(() => applications.id)
    .notNull(),
  tier: text("tier"),
  expirationDate: timestamp("expiration_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiKeys = pgTable("api_keys", {
  key: text("key").primaryKey(),
  name: text("name"),
  expirationDate: timestamp("expiration_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const downloads = pgTable(
  "downloads",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .references(() => applications.id)
      .notNull(),
    version: text("version").notNull(),
    filename: text("filename").notNull(),
    filePath: text("file_path").notNull(),
    sha256: text("sha256").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("downloads_product_version_unique").on(
      table.productId,
      table.version,
    ),
  ],
);
