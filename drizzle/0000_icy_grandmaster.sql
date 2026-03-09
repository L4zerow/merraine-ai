CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"pearch_id" text NOT NULL,
	"name" text,
	"headline" text,
	"location" text,
	"summary" text,
	"experience" jsonb,
	"education" jsonb,
	"skills" text[],
	"email" text,
	"phone" text,
	"linkedin_url" text,
	"picture_url" text,
	"score" real,
	"insights" text,
	"is_enriched" boolean DEFAULT false,
	"enriched_at" timestamp,
	"enrichment_options" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "candidates_pearch_id_unique" UNIQUE("pearch_id")
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"operation" text NOT NULL,
	"credits" integer NOT NULL,
	"details" text,
	"search_id" integer,
	"candidate_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"notes" text DEFAULT '',
	"saved_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "search_candidates" (
	"search_id" integer NOT NULL,
	"candidate_id" integer NOT NULL,
	"score" real,
	"position" integer,
	CONSTRAINT "search_candidates_search_id_candidate_id_pk" PRIMARY KEY("search_id","candidate_id")
);
--> statement-breakpoint
CREATE TABLE "searches" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"query" text NOT NULL,
	"location" text,
	"options" jsonb NOT NULL,
	"thread_id" text,
	"total_results" integer DEFAULT 0,
	"credits_used" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_search_id_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."searches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_candidates" ADD CONSTRAINT "saved_candidates_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_candidates" ADD CONSTRAINT "search_candidates_search_id_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_candidates" ADD CONSTRAINT "search_candidates_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_saved_candidate" ON "saved_candidates" USING btree ("candidate_id");