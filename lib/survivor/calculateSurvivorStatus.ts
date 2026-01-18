import { fetchRoundFixtures } from "@/lib/api-football/fetchRoundFixtures";
import { FixtureData } from "@/types/fixtures";

export interface SurvivorPickData {
  id: string;
  externalFixtureId: string;
  externalRound: string;
  externalPickedTeamId: string;
  externalPickedTeamName: string | null;
}

export interface CalculatedSurvivorStatus {
  livesRemaining: number;
  isEliminated: boolean;
  eliminatedAtRound: string | null;
  roundResults: RoundResult[];
}

export interface RoundResult {
  roundName: string;
  pick: SurvivorPickData | null;
  result: "win" | "draw" | "loss" | "pending" | "no_pick";
  isRoundFinished: boolean;
}

// Check if a pick was successful (team won or drew)
// Uses the winner field: true = won, false = lost, null = draw
function evaluatePick(
  fixture: FixtureData,
  pickedTeamId: string,
): { success: boolean; finished: boolean; result: "win" | "draw" | "loss" | "pending" } {
  const status = fixture.fixture.status.short;

  // Match not finished yet
  if (!["FT", "AET", "PEN"].includes(status)) {
    return { success: false, finished: false, result: "pending" };
  }

  const homeTeamId = fixture.teams.home.id.toString();
  const isPickedTeamHome = pickedTeamId === homeTeamId;
  const pickedTeam = isPickedTeamHome ? fixture.teams.home : fixture.teams.away;

  // winner is null = draw (both teams survive)
  if (pickedTeam.winner === null) {
    return { success: true, finished: true, result: "draw" };
  }

  // winner is true = team won
  if (pickedTeam.winner === true) {
    return { success: true, finished: true, result: "win" };
  }

  // winner is false = team lost
  return { success: false, finished: true, result: "loss" };
}

// Check if a round is completely finished (all matches done)
function isRoundFinished(fixtures: FixtureData[]): boolean {
  if (fixtures.length === 0) return false;
  return fixtures.every((f) =>
    ["FT", "AET", "PEN"].includes(f.fixture.status.short),
  );
}

// Check if a round has started (at least one match is in progress or finished)
function hasRoundStarted(fixtures: FixtureData[]): boolean {
  if (fixtures.length === 0) return false;
  return fixtures.some((f) => f.fixture.status.short !== "NS");
}

/**
 * Calculate survivor status for a participant based on their picks and fixture results.
 * This replaces the stored livesRemaining/isEliminated/eliminatedAtRound fields.
 */
export async function calculateSurvivorStatus(
  picks: SurvivorPickData[],
  roundsSelected: { roundName: string; dates: string[] }[],
  totalLives: number,
  externalLeagueId: string,
  externalSeason: string,
): Promise<CalculatedSurvivorStatus> {
  let livesRemaining = totalLives;
  let isEliminated = false;
  let eliminatedAtRound: string | null = null;
  const roundResults: RoundResult[] = [];

  // Create a map of picks by round for quick lookup
  const picksByRound = new Map<string, SurvivorPickData>();
  for (const pick of picks) {
    picksByRound.set(pick.externalRound, pick);
  }

  // Process each round in order
  for (const round of roundsSelected) {
    const roundName = round.roundName;

    // If already eliminated, skip processing but still record the round
    if (isEliminated) {
      roundResults.push({
        roundName,
        pick: picksByRound.get(roundName) || null,
        result: "pending",
        isRoundFinished: false,
      });
      continue;
    }

    // Fetch fixtures for this round
    const fixtures = await fetchRoundFixtures(
      externalLeagueId,
      externalSeason,
      roundName,
    );

    const roundFinished = isRoundFinished(fixtures);
    const roundStarted = hasRoundStarted(fixtures);
    const pick = picksByRound.get(roundName);

    // If round hasn't finished yet
    if (!roundFinished) {
      // If user has no pick and round has started, they lose a life (can't pick anymore)
      if (!pick && roundStarted) {
        livesRemaining--;
        if (livesRemaining <= 0) {
          isEliminated = true;
          eliminatedAtRound = roundName;
        }
        roundResults.push({
          roundName,
          pick: null,
          result: "no_pick",
          isRoundFinished: false,
        });
        continue;
      }

      // Check if pick's specific match is finished (for partial round updates)
      if (pick) {
        const fixture = fixtures.find(
          (f) => f.fixture.id.toString() === pick.externalFixtureId,
        );

        if (fixture) {
          const evaluation = evaluatePick(fixture, pick.externalPickedTeamId);

          if (evaluation.finished) {
            // The specific match is finished, we can determine this pick's result
            if (!evaluation.success) {
              livesRemaining--;
              if (livesRemaining <= 0) {
                isEliminated = true;
                eliminatedAtRound = roundName;
              }
            }
            roundResults.push({
              roundName,
              pick,
              result: evaluation.result,
              isRoundFinished: false, // Round not fully finished, but pick is resolved
            });
            continue;
          }
        }
      }

      // Round not finished and pick not resolved yet (or round hasn't started)
      roundResults.push({
        roundName,
        pick: pick || null,
        result: "pending",
        isRoundFinished: false,
      });
      continue;
    }

    // Round is finished - evaluate the pick or penalize for no pick
    if (!pick) {
      // No pick made for a finished round = lose a life
      livesRemaining--;
      if (livesRemaining <= 0) {
        isEliminated = true;
        eliminatedAtRound = roundName;
      }
      roundResults.push({
        roundName,
        pick: null,
        result: "no_pick",
        isRoundFinished: true,
      });
      continue;
    }

    // Find the fixture for this pick
    const fixture = fixtures.find(
      (f) => f.fixture.id.toString() === pick.externalFixtureId,
    );

    if (!fixture) {
      // Fixture not found (shouldn't happen) - treat as loss
      livesRemaining--;
      if (livesRemaining <= 0) {
        isEliminated = true;
        eliminatedAtRound = roundName;
      }
      roundResults.push({
        roundName,
        pick,
        result: "loss",
        isRoundFinished: true,
      });
      continue;
    }

    // Evaluate the pick
    const evaluation = evaluatePick(fixture, pick.externalPickedTeamId);

    if (!evaluation.success) {
      livesRemaining--;
      if (livesRemaining <= 0) {
        isEliminated = true;
        eliminatedAtRound = roundName;
      }
    }

    roundResults.push({
      roundName,
      pick,
      result: evaluation.result,
      isRoundFinished: true,
    });
  }

  return {
    livesRemaining,
    isEliminated,
    eliminatedAtRound,
    roundResults,
  };
}

/**
 * Batch calculate survivor status for multiple participants.
 * More efficient than calling calculateSurvivorStatus for each participant
 * because it reuses fixture data.
 */
export async function calculateSurvivorStatusBatch(
  participantPicks: Map<string, SurvivorPickData[]>, // userId -> picks
  roundsSelected: { roundName: string; dates: string[] }[],
  totalLives: number,
  externalLeagueId: string,
  externalSeason: string,
): Promise<Map<string, CalculatedSurvivorStatus>> {
  const results = new Map<string, CalculatedSurvivorStatus>();

  // Pre-fetch all fixtures for all rounds
  const fixturesByRound = new Map<string, FixtureData[]>();
  for (const round of roundsSelected) {
    const fixtures = await fetchRoundFixtures(
      externalLeagueId,
      externalSeason,
      round.roundName,
    );
    fixturesByRound.set(round.roundName, fixtures);
  }

  // Calculate status for each participant
  for (const [userId, picks] of participantPicks) {
    let livesRemaining = totalLives;
    let isEliminated = false;
    let eliminatedAtRound: string | null = null;
    const roundResults: RoundResult[] = [];

    // Create a map of picks by round for quick lookup
    const picksByRound = new Map<string, SurvivorPickData>();
    for (const pick of picks) {
      picksByRound.set(pick.externalRound, pick);
    }

    // Process each round in order
    for (const round of roundsSelected) {
      const roundName = round.roundName;
      const fixtures = fixturesByRound.get(roundName) || [];

      // If already eliminated, skip processing but still record the round
      if (isEliminated) {
        roundResults.push({
          roundName,
          pick: picksByRound.get(roundName) || null,
          result: "pending",
          isRoundFinished: false,
        });
        continue;
      }

      const roundFinished = isRoundFinished(fixtures);
      const roundStarted = hasRoundStarted(fixtures);
      const pick = picksByRound.get(roundName);

      // If round hasn't finished yet
      if (!roundFinished) {
        // If user has no pick and round has started, they lose a life
        if (!pick && roundStarted) {
          livesRemaining--;
          if (livesRemaining <= 0) {
            isEliminated = true;
            eliminatedAtRound = roundName;
          }
          roundResults.push({
            roundName,
            pick: null,
            result: "no_pick",
            isRoundFinished: false,
          });
          continue;
        }

        if (pick) {
          const fixture = fixtures.find(
            (f) => f.fixture.id.toString() === pick.externalFixtureId,
          );

          if (fixture) {
            const evaluation = evaluatePick(fixture, pick.externalPickedTeamId);

            if (evaluation.finished) {
              if (!evaluation.success) {
                livesRemaining--;
                if (livesRemaining <= 0) {
                  isEliminated = true;
                  eliminatedAtRound = roundName;
                }
              }
              roundResults.push({
                roundName,
                pick,
                result: evaluation.result,
                isRoundFinished: false,
              });
              continue;
            }
          }
        }

        roundResults.push({
          roundName,
          pick: pick || null,
          result: "pending",
          isRoundFinished: false,
        });
        continue;
      }

      // Round is finished
      if (!pick) {
        livesRemaining--;
        if (livesRemaining <= 0) {
          isEliminated = true;
          eliminatedAtRound = roundName;
        }
        roundResults.push({
          roundName,
          pick: null,
          result: "no_pick",
          isRoundFinished: true,
        });
        continue;
      }

      const fixture = fixtures.find(
        (f) => f.fixture.id.toString() === pick.externalFixtureId,
      );

      if (!fixture) {
        livesRemaining--;
        if (livesRemaining <= 0) {
          isEliminated = true;
          eliminatedAtRound = roundName;
        }
        roundResults.push({
          roundName,
          pick,
          result: "loss",
          isRoundFinished: true,
        });
        continue;
      }

      const evaluation = evaluatePick(fixture, pick.externalPickedTeamId);

      if (!evaluation.success) {
        livesRemaining--;
        if (livesRemaining <= 0) {
          isEliminated = true;
          eliminatedAtRound = roundName;
        }
      }

      roundResults.push({
        roundName,
        pick,
        result: evaluation.result,
        isRoundFinished: true,
      });
    }

    results.set(userId, {
      livesRemaining,
      isEliminated,
      eliminatedAtRound,
      roundResults,
    });
  }

  return results;
}

