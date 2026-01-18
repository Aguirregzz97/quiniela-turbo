"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  survivor_game_picks,
  survivor_game_participants,
  survivor_games,
  NewSurvivorGamePick,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { calculateSurvivorStatus } from "@/lib/survivor/calculateSurvivorStatus";

export interface SurvivorPickInput {
  externalFixtureId: string;
  externalRound: string;
  externalPickedTeamId: string;
  externalPickedTeamName: string;
}

export async function saveSurvivorPick(
  survivorGameId: string,
  pick: SurvivorPickInput,
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, message: "Usuario no autenticado" };
    }

    // Check if user is a participant
    const participant = await db
      .select()
      .from(survivor_game_participants)
      .where(
        and(
          eq(survivor_game_participants.survivorGameId, survivorGameId),
          eq(survivor_game_participants.userId, session.user.id),
        ),
      )
      .limit(1);

    if (!participant.length) {
      return { success: false, message: "No eres participante de este Survivor" };
    }

    // Get game data for status calculation
    const game = await db
      .select({
        lives: survivor_games.lives,
        roundsSelected: survivor_games.roundsSelected,
        externalLeagueId: survivor_games.externalLeagueId,
        externalSeason: survivor_games.externalSeason,
      })
      .from(survivor_games)
      .where(eq(survivor_games.id, survivorGameId))
      .limit(1);

    if (!game.length) {
      return { success: false, message: "Juego no encontrado" };
    }

    // Get user's existing picks
    const existingPicks = await db
      .select({
        id: survivor_game_picks.id,
        externalFixtureId: survivor_game_picks.externalFixtureId,
        externalRound: survivor_game_picks.externalRound,
        externalPickedTeamId: survivor_game_picks.externalPickedTeamId,
        externalPickedTeamName: survivor_game_picks.externalPickedTeamName,
      })
      .from(survivor_game_picks)
      .where(
        and(
          eq(survivor_game_picks.survivorGameId, survivorGameId),
          eq(survivor_game_picks.userId, session.user.id),
        ),
      );

    // Calculate current status
    const status = await calculateSurvivorStatus(
      existingPicks,
      game[0].roundsSelected || [],
      game[0].lives,
      game[0].externalLeagueId,
      game[0].externalSeason,
    );

    // Check if user is eliminated
    if (status.isEliminated) {
      return { success: false, message: "Has sido eliminado de este Survivor" };
    }

    // Check if user has already picked this team in any round
    const existingTeamPick = await db
      .select()
      .from(survivor_game_picks)
      .where(
        and(
          eq(survivor_game_picks.survivorGameId, survivorGameId),
          eq(survivor_game_picks.userId, session.user.id),
          eq(survivor_game_picks.externalPickedTeamId, pick.externalPickedTeamId),
        ),
      )
      .limit(1);

    if (existingTeamPick.length > 0) {
      return {
        success: false,
        message: `Ya has seleccionado a ${pick.externalPickedTeamName} en una jornada anterior`,
      };
    }

    // Check if user already has a pick for this round
    const existingRoundPick = await db
      .select()
      .from(survivor_game_picks)
      .where(
        and(
          eq(survivor_game_picks.survivorGameId, survivorGameId),
          eq(survivor_game_picks.userId, session.user.id),
          eq(survivor_game_picks.externalRound, pick.externalRound),
        ),
      )
      .limit(1);

    if (existingRoundPick.length > 0) {
      // Update existing pick for this round
      await db
        .update(survivor_game_picks)
        .set({
          externalFixtureId: pick.externalFixtureId,
          externalPickedTeamId: pick.externalPickedTeamId,
          externalPickedTeamName: pick.externalPickedTeamName,
          updatedAt: new Date(),
        })
        .where(eq(survivor_game_picks.id, existingRoundPick[0].id));
    } else {
      // Create new pick
      const pickData: Omit<NewSurvivorGamePick, "id" | "createdAt" | "updatedAt"> =
        {
          survivorGameId,
          userId: session.user.id,
          externalFixtureId: pick.externalFixtureId,
          externalRound: pick.externalRound,
          externalPickedTeamId: pick.externalPickedTeamId,
          externalPickedTeamName: pick.externalPickedTeamName,
        };

      await db.insert(survivor_game_picks).values(pickData);
    }

    revalidatePath(`/survivor/${survivorGameId}`);
    revalidatePath(`/survivor/${survivorGameId}/seleccionar-equipo`);

    return {
      success: true,
      message: `Has seleccionado a ${pick.externalPickedTeamName} para esta jornada`,
    };
  } catch (error) {
    console.error("Error saving survivor pick:", error);
    return {
      success: false,
      message: "Error al guardar la selección",
    };
  }
}

