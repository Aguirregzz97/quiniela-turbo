CREATE TABLE "prediction_edit_history" (
	"id" text PRIMARY KEY NOT NULL,
	"predictionId" text NOT NULL,
	"quinielaId" text NOT NULL,
	"targetUserId" text NOT NULL,
	"editedByUserId" text NOT NULL,
	"externalFixtureId" text NOT NULL,
	"externalRound" text NOT NULL,
	"previousHomeScore" integer,
	"previousAwayScore" integer,
	"newHomeScore" integer,
	"newAwayScore" integer,
	"reason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quiniela_settings" ALTER COLUMN "moneyToEnter" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "quiniela_settings" ALTER COLUMN "prizeDistribution" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "quiniela_settings" ADD COLUMN "moneyPerRoundToEnter" integer;--> statement-breakpoint
ALTER TABLE "quiniela_settings" ADD COLUMN "prizeDistributionPerRound" jsonb;--> statement-breakpoint
ALTER TABLE "prediction_edit_history" ADD CONSTRAINT "prediction_edit_history_predictionId_predictions_id_fk" FOREIGN KEY ("predictionId") REFERENCES "public"."predictions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_edit_history" ADD CONSTRAINT "prediction_edit_history_quinielaId_quiniela_id_fk" FOREIGN KEY ("quinielaId") REFERENCES "public"."quiniela"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_edit_history" ADD CONSTRAINT "prediction_edit_history_targetUserId_user_id_fk" FOREIGN KEY ("targetUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_edit_history" ADD CONSTRAINT "prediction_edit_history_editedByUserId_user_id_fk" FOREIGN KEY ("editedByUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint