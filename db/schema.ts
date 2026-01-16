import {
  boolean,
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { AdapterAccountType } from "@auth/core/adapters";
import { relations } from "drizzle-orm";
import { generateJoinCode } from "@/lib/utils";

const connectionString = "postgres://postgres:postgres@localhost:5432/drizzle";
const pool = postgres(connectionString, { max: 1 });

export const db = drizzle(pool);

// auth tables

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    {
      compoundKey: primaryKey({
        columns: [account.provider, account.providerAccountId],
      }),
    },
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    {
      compositePk: primaryKey({
        columns: [verificationToken.identifier, verificationToken.token],
      }),
    },
  ],
);

export const authenticators = pgTable(
  "authenticator",
  {
    credentialID: text("credentialID").notNull().unique(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("providerAccountId").notNull(),
    credentialPublicKey: text("credentialPublicKey").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credentialDeviceType").notNull(),
    credentialBackedUp: boolean("credentialBackedUp").notNull(),
    transports: text("transports"),
  },
  (authenticator) => [
    {
      compositePK: primaryKey({
        columns: [authenticator.userId, authenticator.credentialID],
      }),
    },
  ],
);

// app tables

export const quinielas = pgTable("quiniela", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ownerId: text("ownerId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  joinCode: text("joinCode")
    .notNull()
    .unique()
    .$defaultFn(() => generateJoinCode()),
  league: text("league").notNull(),
  externalLeagueId: text("externalLeagueId").notNull(),
  externalSeason: text("externalSeason").notNull(),
  roundsSelected: jsonb("roundsSelected")
    .$type<{ roundName: string; dates: string[] }[]>()
    .notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const quiniela_settings = pgTable("quiniela_settings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  quinielaId: text("quinielaId")
    .notNull()
    .unique()
    .references(() => quinielas.id, { onDelete: "cascade" }),
  moneyToEnter: integer("moneyToEnter").notNull(),
  prizeDistribution: jsonb("prizeDistribution")
    .$type<{ position: number; percentage: number }[]>()
    .notNull(),
  allowEditPredictions: boolean("allowEditPredictions").notNull().default(true),
  pointsForExactResultPrediction: integer("pointsForExactResultPrediction")
    .notNull()
    .default(2),
  pointsForCorrectResultPrediction: integer("pointsForCorrectResultPrediction")
    .notNull()
    .default(1),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const quiniela_participants = pgTable("quiniela_participants", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  quinielaId: text("quinielaId")
    .notNull()
    .references(() => quinielas.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const predictions = pgTable("predictions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  quinielaId: text("quinielaId").references(() => quinielas.id, {
    onDelete: "cascade",
  }),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  externalFixtureId: text("externalFixtureId").notNull(),
  externalRound: text("externalRound").notNull(),
  predictedHomeScore: integer("predictedHomeScore"),
  predictedAwayScore: integer("predictedAwayScore"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

// relations

export const userRelations = relations(users, ({ many }) => ({
  quinielas: many(quinielas),
  predictions: many(predictions),
  survivorGames: many(survivor_games),
  survivorGameParticipations: many(survivor_game_participants),
  survivorGamePicks: many(survivor_game_picks),
}));

export const quinielaRelations = relations(quinielas, ({ many, one }) => ({
  owner: one(users, {
    fields: [quinielas.ownerId],
    references: [users.id],
  }),
  settings: one(quiniela_settings, {
    fields: [quinielas.id],
    references: [quiniela_settings.quinielaId],
  }),
  participants: many(quiniela_participants),
  predictions: many(predictions),
}));

export const participantsRelations = relations(
  quiniela_participants,
  ({ one }) => ({
    quiniela: one(quinielas, {
      fields: [quiniela_participants.quinielaId],
      references: [quinielas.id],
    }),
    user: one(users, {
      fields: [quiniela_participants.userId],
      references: [users.id],
    }),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;

export type Authenticator = typeof authenticators.$inferSelect;
export type NewAuthenticator = typeof authenticators.$inferInsert;

// App types
export type Quiniela = typeof quinielas.$inferSelect;
export type NewQuiniela = typeof quinielas.$inferInsert;

export type QuinielaSetting = typeof quiniela_settings.$inferSelect;
export type NewQuinielaSetting = typeof quiniela_settings.$inferInsert;

export type QuinielaParticipant = typeof quiniela_participants.$inferSelect;
export type NewQuinielaParticipant = typeof quiniela_participants.$inferInsert;

export type Prediction = typeof predictions.$inferSelect;
export type NewPrediction = typeof predictions.$inferInsert;

// Survivor game tables

export const survivor_games = pgTable("survivor_game", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ownerId: text("ownerId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  joinCode: text("joinCode")
    .notNull()
    .unique()
    .$defaultFn(() => generateJoinCode()),
  league: text("league").notNull(),
  externalLeagueId: text("externalLeagueId").notNull(),
  externalSeason: text("externalSeason").notNull(),
  roundsSelected: jsonb("roundsSelected")
    .$type<{ roundName: string; dates: string[] }[]>()
    .notNull(),
  lives: integer("lives").notNull().default(1),
  moneyToEnter: integer("moneyToEnter").notNull().default(0),
  prizeDistribution: jsonb("prizeDistribution")
    .$type<{ position: number; percentage: number }[]>()
    .notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const survivor_game_participants = pgTable("survivor_game_participant", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  survivorGameId: text("survivorGameId")
    .notNull()
    .references(() => survivor_games.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  livesRemaining: integer("livesRemaining").notNull(),
  isEliminated: boolean("isEliminated").notNull().default(false),
  eliminatedAtRound: text("eliminatedAtRound"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const survivor_game_picks = pgTable("survivor_game_pick", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  survivorGameId: text("survivorGameId")
    .notNull()
    .references(() => survivor_games.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  externalFixtureId: text("externalFixtureId").notNull(),
  externalRound: text("externalRound").notNull(),
  externalPickedTeamId: text("externalPickedTeamId").notNull(),
  externalPickedTeamName: text("externalPickedTeamName").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

// Survivor game relations

export const survivorGameRelations = relations(
  survivor_games,
  ({ many, one }) => ({
    owner: one(users, {
      fields: [survivor_games.ownerId],
      references: [users.id],
    }),
    participants: many(survivor_game_participants),
    picks: many(survivor_game_picks),
  }),
);

export const survivorGameParticipantsRelations = relations(
  survivor_game_participants,
  ({ one }) => ({
    survivorGame: one(survivor_games, {
      fields: [survivor_game_participants.survivorGameId],
      references: [survivor_games.id],
    }),
    user: one(users, {
      fields: [survivor_game_participants.userId],
      references: [users.id],
    }),
  }),
);

export const survivorGamePicksRelations = relations(
  survivor_game_picks,
  ({ one }) => ({
    survivorGame: one(survivor_games, {
      fields: [survivor_game_picks.survivorGameId],
      references: [survivor_games.id],
    }),
    user: one(users, {
      fields: [survivor_game_picks.userId],
      references: [users.id],
    }),
  }),
);

// Survivor game types
export type SurvivorGame = typeof survivor_games.$inferSelect;
export type NewSurvivorGame = typeof survivor_games.$inferInsert;

export type SurvivorGameParticipant =
  typeof survivor_game_participants.$inferSelect;
export type NewSurvivorGameParticipant =
  typeof survivor_game_participants.$inferInsert;

export type SurvivorGamePick = typeof survivor_game_picks.$inferSelect;
export type NewSurvivorGamePick = typeof survivor_game_picks.$inferInsert;
