CREATE TABLE "chunk_embeddings" (
	"chunk_id" uuid PRIMARY KEY NOT NULL,
	"embedding" halfvec(1536) NOT NULL,
	"embedding_model" text NOT NULL,
	"embedded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"ord" integer NOT NULL,
	"text" text NOT NULL,
	"char_start" integer NOT NULL,
	"char_end" integer NOT NULL,
	"token_count" integer NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"canonical_url" text NOT NULL,
	"url" text,
	"title" text,
	"language" text,
	"category" text,
	"content_hash" text NOT NULL,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"first_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"indexed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "http_cache" (
	"url" text PRIMARY KEY NOT NULL,
	"etag" text,
	"last_modified" text,
	"body_hash" text,
	"status_code" integer,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_key" text NOT NULL,
	"url" text NOT NULL,
	"canonical_url" text NOT NULL,
	"title" text,
	"raw_content" text NOT NULL,
	"status" integer,
	"body_hash" text,
	"etag" text,
	"last_modified" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"not_modified" boolean DEFAULT false NOT NULL,
	"ingested_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "robots_cache" (
	"robots_url" text PRIMARY KEY NOT NULL,
	"body" text,
	"status_code" integer,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"trust" text,
	"ingestion_mode" text,
	"languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_category" text,
	"rights" text,
	"content_hash" text,
	"indexed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chunk_embeddings" ADD CONSTRAINT "chunk_embeddings_chunk_id_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chunk_embeddings_hnsw" ON "chunk_embeddings" USING hnsw ("embedding" halfvec_cosine_ops);--> statement-breakpoint
CREATE INDEX "chunk_embeddings_model_idx" ON "chunk_embeddings" USING btree ("embedding_model");--> statement-breakpoint
CREATE INDEX "chunks_source_idx" ON "chunks" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "chunks_document_idx" ON "chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "chunks_tags_gin" ON "chunks" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "documents_source_idx" ON "documents" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_source_canonical_url_uq" ON "documents" USING btree ("source_id","canonical_url");--> statement-breakpoint
CREATE INDEX "raw_documents_source_key_idx" ON "raw_documents" USING btree ("source_key");--> statement-breakpoint
CREATE INDEX "raw_documents_ingested_at_idx" ON "raw_documents" USING btree ("ingested_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_key_uq" ON "sources" USING btree ("key");