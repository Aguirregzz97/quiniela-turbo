import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  survivor_games,
  survivor_game_participants,
  survivor_game_picks,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { calculateSurvivorStatus } from "@/lib/survivor/calculateSurvivorStatus";

export interface SurvivorStatisticsResponse {
  // Overview
  totalGames: number;
  gamesWon: number;
  gamesLost: number;
  gamesActive: number;

  // Pick statistics
  totalPicks: number;
  successfulPicks: number; // Wins + Draws
  failedPicks: number; // Losses
  winPicks: number;
  drawPicks: number;
  lossPicks: number;
  missedPicks: number;

  // Rates
  pickSuccessRate: number; // % of picks that resulted in win/draw
  winRate: number; // % of games won

  // Teams
  mostPickedTeams: { teamName: string; count: number }[];

  // Per game breakdown
  gameBreakdowns: {
    gameId: string;
    gameName: string;
    league: string | null;
    externalLeagueId: string;
    livesRemaining: number;
    totalLives: number;
    isEliminated: boolean;
    picksCount: number;
  }[];
}

export async function GET() {
  const session = await auth();

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Fetch all survivor games the user participates in
  const userGames = await db
    .select({
      id: survivor_games.id,
      name: survivor_games.name,
      league: survivor_games.league,
      externalLeagueId: survivor_games.externalLeagueId,
      externalSeason: survivor_games.externalSeason,
      lives: survivor_games.lives,
      roundsSelected: survivor_games.roundsSelected,
    })
    .from(survivor_game_participants)
    .innerJoin(
      survivor_games,
      eq(survivor_game_participants.survivorGameId, survivor_games.id),
    )
    .where(eq(survivor_game_participants.userId, userId));

  if (userGames.length === 0) {
    return NextResponse.json({
      totalGames: 0,
      gamesWon: 0,
      gamesLost: 0,
      gamesActive: 0,
      totalPicks: 0,
      successfulPicks: 0,
      failedPicks: 0,
      winPicks: 0,
      drawPicks: 0,
      lossPicks: 0,
      missedPicks: 0,
      pickSuccessRate: 0,
      winRate: 0,
      mostPickedTeams: [],
      gameBreakdowns: [],
    } as SurvivorStatisticsResponse);
  }

  // Fetch all user's picks across all games
  const allPicks = await db
    .select({
      id: survivor_game_picks.id,
      survivorGameId: survivor_game_picks.survivorGameId,
      externalFixtureId: survivor_game_picks.externalFixtureId,
      externalRound: survivor_game_picks.externalRound,
      externalPickedTeamId: survivor_game_picks.externalPickedTeamId,
      externalPickedTeamName: survivor_game_picks.externalPickedTeamName,
    })
    .from(survivor_game_picks)
    .where(eq(survivor_game_picks.userId, userId));

  // Group picks by game
  const picksByGame = new Map<string, typeof allPicks>();
  for (const pick of allPicks) {
    const gamePicks = picksByGame.get(pick.survivorGameId) || [];
    gamePicks.push(pick);
    picksByGame.set(pick.survivorGameId, gamePicks);
  }

  // Calculate statistics for each game
  let gamesWon = 0;
  let gamesLost = 0;
  let gamesActive = 0;
  let totalWinPicks = 0;
  let totalDrawPicks = 0;
  let totalLossPicks = 0;
  let totalMissedPicks = 0;

  const gameBreakdowns: SurvivorStatisticsResponse["gameBreakdowns"] = [];
  const teamCounts = new Map<string, number>();

  for (const game of userGames) {
    const gamePicks = picksByGame.get(game.id) || [];

    // Count team picks
    for (const pick of gamePicks) {
      if (pick.externalPickedTeamName) {
        const count = teamCounts.get(pick.externalPickedTeamName) || 0;
        teamCounts.set(pick.externalPickedTeamName, count + 1);
      }
    }

    // Calculate status for this game
    const status = await calculateSurvivorStatus(
      gamePicks.map((p) => ({
        id: p.id,
        externalFixtureId: p.externalFixtureId,
        externalRound: p.externalRound,
        externalPickedTeamId: p.externalPickedTeamId,
        externalPickedTeamName: p.externalPickedTeamName,
      })),
      game.roundsSelected || [],
      game.lives,
      game.externalLeagueId,
      game.externalSeason,
    );

    // Count pick results from roundResults
    for (const roundResult of status.roundResults) {
      if (roundResult.result === "win") totalWinPicks++;
      else if (roundResult.result === "draw") totalDrawPicks++;
      else if (roundResult.result === "loss") totalLossPicks++;
      else if (roundResult.result === "no_pick") totalMissedPicks++;
      // "pending" picks are not counted yet
    }

    // Check if game is won (only player remaining), lost (eliminated), or active
    // For simplicity, we check if eliminated
    if (status.isEliminated) {
      gamesLost++;
    } else {
      // Check if there are other active participants
      const otherParticipants = await db
        .select()
        .from(survivor_game_participants)
        .where(
          and(
            eq(survivor_game_participants.survivorGameId, game.id),
          ),
        );

      // Calculate status for all participants to check for winner
      let activeCount = 0;
      for (const participant of otherParticipants) {
        const participantPicks = await db
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
              eq(survivor_game_picks.survivorGameId, game.id),
              eq(survivor_game_picks.userId, participant.userId),
            ),
          );

        const participantStatus = await calculateSurvivorStatus(
          participantPicks,
          game.roundsSelected || [],
          game.lives,
          game.externalLeagueId,
          game.externalSeason,
        );

        if (!participantStatus.isEliminated) {
          activeCount++;
        }
      }

      // If user is the only one active and others have been eliminated, they won
      if (activeCount === 1 && otherParticipants.length > 1) {
        gamesWon++;
      } else {
        gamesActive++;
      }
    }

    gameBreakdowns.push({
      gameId: game.id,
      gameName: game.name,
      league: game.league,
      externalLeagueId: game.externalLeagueId,
      livesRemaining: status.livesRemaining,
      totalLives: game.lives,
      isEliminated: status.isEliminated,
      picksCount: gamePicks.length,
    });
  }

  // Calculate rates
  const totalEvaluatedPicks = totalWinPicks + totalDrawPicks + totalLossPicks;
  const successfulPicks = totalWinPicks + totalDrawPicks;
  const pickSuccessRate =
    totalEvaluatedPicks > 0
      ? (successfulPicks / totalEvaluatedPicks) * 100
      : 0;

  const completedGames = gamesWon + gamesLost;
  const winRate = completedGames > 0 ? (gamesWon / completedGames) * 100 : 0;

  // Get top 5 most picked teams
  const mostPickedTeams = Array.from(teamCounts.entries())
    .map(([teamName, count]) => ({ teamName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return NextResponse.json({
    totalGames: userGames.length,
    gamesWon,
    gamesLost,
    gamesActive,
    totalPicks: allPicks.length,
    successfulPicks,
    failedPicks: totalLossPicks,
    winPicks: totalWinPicks,
    drawPicks: totalDrawPicks,
    lossPicks: totalLossPicks,
    missedPicks: totalMissedPicks,
    pickSuccessRate,
    winRate,
    mostPickedTeams,
    gameBreakdowns,
  } as SurvivorStatisticsResponse);
}

