ALTER TABLE "quiniela" ADD COLUMN "joinCode" text NOT NULL;--> statement-breakpoint
ALTER TABLE "quiniela" ADD CONSTRAINT "quiniela_joinCode_unique" UNIQUE("joinCode");