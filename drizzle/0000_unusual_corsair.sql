CREATE TABLE "api_keys" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text,
	"expiration_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"available_tiers" text[],
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "downloads" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"version" text NOT NULL,
	"filename" text NOT NULL,
	"file_path" text NOT NULL,
	"sha256" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "downloads_product_version_unique" UNIQUE("product_id","version")
);
--> statement-breakpoint
CREATE TABLE "git_downloads" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"repo_url" text NOT NULL,
	"file_path" text NOT NULL,
	"branch" text DEFAULT 'main' NOT NULL,
	"commit_sha" text NOT NULL,
	"local_path" text NOT NULL,
	"filename" text NOT NULL,
	"sha256" text NOT NULL,
	"last_sync_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "git_sync_history" (
	"id" text PRIMARY KEY NOT NULL,
	"git_download_id" text NOT NULL,
	"status" text NOT NULL,
	"error_message" text,
	"previous_commit_sha" text,
	"new_commit_sha" text,
	"synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "licenses" (
	"key" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"tier" text,
	"expiration_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_product_id_applications_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "git_downloads" ADD CONSTRAINT "git_downloads_product_id_applications_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "git_sync_history" ADD CONSTRAINT "git_sync_history_git_download_id_git_downloads_id_fk" FOREIGN KEY ("git_download_id") REFERENCES "public"."git_downloads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_product_id_applications_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;