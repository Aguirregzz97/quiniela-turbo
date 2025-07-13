ALTER TABLE "account" ALTER COLUMN "type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "token_type" text;