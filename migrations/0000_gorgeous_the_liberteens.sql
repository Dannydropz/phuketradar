CREATE TABLE "articles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"excerpt" text NOT NULL,
	"image_url" text,
	"image_urls" text[],
	"image_hash" text,
	"category" text NOT NULL,
	"source_url" text NOT NULL,
	"author" text DEFAULT 'Ploy Srisawat' NOT NULL,
	"journalist_id" varchar,
	"published_at" timestamp DEFAULT now() NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"original_language" text DEFAULT 'th',
	"translated_by" text DEFAULT 'openai',
	"embedding" real[],
	"facebook_post_id" text,
	"facebook_post_url" text,
	"event_type" text,
	"severity" text,
	"article_type" text DEFAULT 'breaking' NOT NULL,
	"interest_score" real,
	"related_article_ids" text[],
	"entities" json,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "articles_source_url_unique" UNIQUE("source_url"),
	CONSTRAINT "articles_facebook_post_id_unique" UNIQUE("facebook_post_id")
);
--> statement-breakpoint
CREATE TABLE "journalists" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nickname" text NOT NULL,
	"full_name" text NOT NULL,
	"surname" text NOT NULL,
	"headshot" text NOT NULL,
	"bio" text NOT NULL,
	"beat" text NOT NULL,
	"fun_fact" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduler_locks" (
	"lock_name" varchar PRIMARY KEY NOT NULL,
	"acquired_at" timestamp DEFAULT now() NOT NULL,
	"instance_id" varchar
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp (6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"subscribed_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"unsubscribe_token" varchar DEFAULT gen_random_uuid() NOT NULL,
	CONSTRAINT "subscribers_email_unique" UNIQUE("email"),
	CONSTRAINT "subscribers_unsubscribe_token_unique" UNIQUE("unsubscribe_token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "session" USING btree ("expire");