ALTER TABLE "articles" DROP CONSTRAINT "articles_source_url_unique";--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "author" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "author" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "original_title" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "original_content" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "source_facebook_post_id" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "instagram_post_id" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "instagram_post_url" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "threads_post_id" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "threads_post_url" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "source_name" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "is_developing" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_source_facebook_post_id_unique" UNIQUE("source_facebook_post_id");