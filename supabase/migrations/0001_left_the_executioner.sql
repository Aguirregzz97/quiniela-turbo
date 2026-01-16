CREATE TABLE "survivor_game_participant" (
	"id" text PRIMARY KEY NOT NULL,
	"survivorGameId" text NOT NULL,
	"userId" text NOT NULL,
	"livesRemaining" integer NOT NULL,
	"isEliminated" boolean DEFAULT false NOT NULL,
	"eliminatedAtRound" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survivor_game_pick" (
	"id" text PRIMARY KEY NOT NULL,
	"survivorGameId" text NOT NULL,
	"userId" text NOT NULL,
	"externalFixtureId" text NOT NULL,
	"externalRound" text NOT NULL,
	"externalPickedTeamId" text NOT NULL,
	"externalPickedTeamName" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survivor_game" (
	"id" text PRIMARY KEY NOT NULL,
	"ownerId" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"joinCode" text NOT NULL,
	"league" text NOT NULL,
	"externalLeagueId" text NOT NULL,
	"externalSeason" text NOT NULL,
	"roundsSelected" jsonb NOT NULL,
	"lives" integer DEFAULT 1 NOT NULL,
	"moneyToEnter" integer DEFAULT 0 NOT NULL,
	"prizeDistribution" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "survivor_game_joinCode_unique" UNIQUE("joinCode")
);
--> statement-breakpoint
ALTER TABLE "survivor_game_participant" ADD CONSTRAINT "survivor_game_participant_survivorGameId_survivor_game_id_fk" FOREIGN KEY ("survivorGameId") REFERENCES "public"."survivor_game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survivor_game_participant" ADD CONSTRAINT "survivor_game_participant_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survivor_game_pick" ADD CONSTRAINT "survivor_game_pick_survivorGameId_survivor_game_id_fk" FOREIGN KEY ("survivorGameId") REFERENCES "public"."survivor_game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survivor_game_pick" ADD CONSTRAINT "survivor_game_pick_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survivor_game" ADD CONSTRAINT "survivor_game_ownerId_user_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;