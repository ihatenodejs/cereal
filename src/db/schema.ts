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

export const gitDownloads = pgTable("git_downloads", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .references(() => applications.id)
    .notNull(),
  repoUrl: text("repo_url").notNull(),
  filePath: text("file_path").notNull(),
  sourceType: text("source_type").notNull().default("repo_file"),
  assetName: text("asset_name"),
  releaseTag: text("release_tag"),
  releaseId: text("release_id"),
  branch: text("branch").notNull().default("main"),
  commitSha: text("commit_sha").notNull(),
  localPath: text("local_path").notNull(),
  filename: text("filename").notNull(),
  sha256: text("sha256").notNull(),
  lastSyncAt: timestamp("last_sync_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gitSyncHistory = pgTable("git_sync_history", {
  id: text("id").primaryKey(),
  gitDownloadId: text("git_download_id")
    .references(() => gitDownloads.id)
    .notNull(),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  previousCommitSha: text("previous_commit_sha"),
  newCommitSha: text("new_commit_sha"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});
