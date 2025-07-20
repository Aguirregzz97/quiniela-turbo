ALTER TABLE "matches" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quiniela_matches" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "predictions" DROP CONSTRAINT "predictions_quinielaMatchId_quiniela_matches_id_fk";
DROP TABLE "matches" CASCADE;--> statement-breakpoint
DROP TABLE "quiniela_matches" CASCADE;--> statement-breakpoint
--> statement-breakpoint
ALTER TABLE "predictions" ADD COLUMN "quinielaId" text;--> statement-breakpoint
ALTER TABLE "predictions" ADD COLUMN "externalFixtureId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "quiniela_settings" ADD COLUMN "prizeToWin" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "quiniela" ADD COLUMN "roundsSelected" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_quinielaId_quiniela_id_fk" FOREIGN KEY ("quinielaId") REFERENCES "public"."quiniela"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" DROP COLUMN "quinielaMatchId";