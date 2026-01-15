import { auth } from "@/auth";
import { db } from "@/db";
import {
  predictions,
  quinielas,
  quiniela_participants,
  quiniela_settings,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import axios from "axios";
import redis from "@/redisClient";

export interface UserStatisticsResponse {
  // Overall accuracy metrics
  totalPredictions: number;
  exactPredictions: number;
  correctResultPredictions: number;
  missPredictions: number;
  noPredictions: number;
  exactRate: number;
  correctResultRate: number;
  totalAccuracyRate: number;
  missRate: number;

  // Points statistics
  totalPoints: number;
  averagePointsPerMatch: number;

  // Prediction patterns
  mostPredictedScores: { score: string; count: number }[];
  drawPredictionRate: number;
  homeWinPredictionRate: number;
  awayWinPredictionRate: number;
  averageGoalsPredicted: number;

  // Metadata
  quinielasCount: number;
  finishedMatchesCount: number;
}

interface FixtureData {
  fixture: {
    id: number;
    date: string;
    status: { short: string };
  };
  goals: { home: number | null; away: number | null };
  league: { round: string };
}

interface FixturesApiResponse {
  response: FixtureData[];
}

/**
 * Fetches fixtures directly from the Football API (with Redis caching)
 * This avoids internal HTTP requests that may be blocked by Vercel deployment protection
 */
async function fetchFixturesForQuiniela(
  leagueId: string,
  season: string,
  fromDate?: string,
  toDate?: string,
): Promise<FixtureData[]> {
  // Create cache key
  const cacheKey = `fixtures:${leagueId}:${season}:${fromDate || ""}:${toDate || ""}`;

  try {
    // Try to get from Redis cache first
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      const parsed = JSON.parse(cachedData) as FixturesApiResponse;
      return parsed.response || [];
    }

    // If not in cache, make API call directly
    const apiUrl = process.env.FOOTBALL_API_URL;
    const apiKey = process.env.FOOTBALL_API_KEY;

    if (!apiUrl || !apiKey) {
      console.error("[fetchFixturesForQuiniela] Football API not configured");
      return [];
    }

    const params: Record<string, string> = {
      league: leagueId,
      season: season,
    };

    if (fromDate) params.from = fromDate;
    if (toDate) params.to = toDate;

    const response = await axios.get(`${apiUrl}/fixtures`, {
      params,
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": new URL(apiUrl).hostname,
      },
    });

    const data = response.data as FixturesApiResponse;

    // Cache the result for 5 minutes (300 seconds)
    await redis.setex(cacheKey, 300, JSON.stringify(data));

    return data.response || [];
  } catch (error) {
    console.error("[fetchFixturesForQuiniela] Error fetching fixtures:", error);
    return [];
  }
}

function evaluatePrediction(
  predictedHome: number | null,
  predictedAway: number | null,
  actualHome: number | null,
  actualAway: number | null,
  matchFinished: boolean,
  exactPoints: number,
  correctResultPoints: number,
): {
  type: "exact" | "correct-result" | "miss" | "no-prediction" | "pending";
  points: number;
} {
  if (predictedHome === null || predictedAway === null) {
    return { type: "no-prediction", points: 0 };
  }

  if (!matchFinished || actualHome === null || actualAway === null) {
    return { type: "pending", points: 0 };
  }

  if (predictedHome === actualHome && predictedAway === actualAway) {
    return { type: "exact", points: exactPoints };
  }

  const predictedWinner =
    predictedHome > predictedAway
      ? "home"
      : predictedHome < predictedAway
        ? "away"
        : "draw";
  const actualWinner =
    actualHome > actualAway
      ? "home"
      : actualHome < actualAway
        ? "away"
        : "draw";

  if (predictedWinner === actualWinner) {
    return { type: "correct-result", points: correctResultPoints };
  }

  return { type: "miss", points: 0 };
}

function getDateRangeFromRounds(
  roundsSelected: { roundName: string; dates: string[] }[],
): { fromDate: string | null; toDate: string | null } {
  if (!roundsSelected || roundsSelected.length === 0) {
    return { fromDate: null, toDate: null };
  }

  const firstRound = roundsSelected[0];
  const firstDate =
    firstRound.dates && firstRound.dates.length > 0
      ? firstRound.dates[0]
      : null;

  const lastRound = roundsSelected[roundsSelected.length - 1];
  const lastDate =
    lastRound.dates && lastRound.dates.length > 0
      ? lastRound.dates[lastRound.dates.length - 1]
      : null;

  return { fromDate: firstDate, toDate: lastDate };
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all quinielas the user participates in
    const userQuinielas = await db
      .select({
        quinielaId: quiniela_participants.quinielaId,
        quinielaName: quinielas.name,
        externalLeagueId: quinielas.externalLeagueId,
        externalSeason: quinielas.externalSeason,
        roundsSelected: quinielas.roundsSelected,
        exactPoints: quiniela_settings.pointsForExactResultPrediction,
        correctResultPoints: quiniela_settings.pointsForCorrectResultPrediction,
      })
      .from(quiniela_participants)
      .innerJoin(quinielas, eq(quiniela_participants.quinielaId, quinielas.id))
      .leftJoin(
        quiniela_settings,
        eq(quinielas.id, quiniela_settings.quinielaId),
      )
      .where(eq(quiniela_participants.userId, userId));

    if (userQuinielas.length === 0) {
      return NextResponse.json({
        totalPredictions: 0,
        exactPredictions: 0,
        correctResultPredictions: 0,
        missPredictions: 0,
        noPredictions: 0,
        exactRate: 0,
        correctResultRate: 0,
        totalAccuracyRate: 0,
        missRate: 0,
        totalPoints: 0,
        averagePointsPerMatch: 0,
        mostPredictedScores: [],
        drawPredictionRate: 0,
        homeWinPredictionRate: 0,
        awayWinPredictionRate: 0,
        averageGoalsPredicted: 0,
        quinielasCount: 0,
        finishedMatchesCount: 0,
      } as UserStatisticsResponse);
    }

    // Get all user predictions
    const userPredictions = await db
      .select({
        id: predictions.id,
        quinielaId: predictions.quinielaId,
        externalFixtureId: predictions.externalFixtureId,
        externalRound: predictions.externalRound,
        predictedHomeScore: predictions.predictedHomeScore,
        predictedAwayScore: predictions.predictedAwayScore,
      })
      .from(predictions)
      .where(eq(predictions.userId, userId));

    // Create a map of quiniela settings
    const quinielaSettingsMap = new Map<
      string,
      {
        name: string;
        exactPoints: number;
        correctResultPoints: number;
        leagueId: string;
        season: string;
        roundsSelected: { roundName: string; dates: string[] }[];
      }
    >();

    for (const q of userQuinielas) {
      quinielaSettingsMap.set(q.quinielaId, {
        name: q.quinielaName,
        exactPoints: q.exactPoints ?? 2,
        correctResultPoints: q.correctResultPoints ?? 1,
        leagueId: q.externalLeagueId,
        season: q.externalSeason,
        roundsSelected:
          (q.roundsSelected as { roundName: string; dates: string[] }[]) || [],
      });
    }

    // Fetch all fixtures for all quinielas
    const allFixtures = new Map<string, FixtureData>();
    for (const q of userQuinielas) {
      const rounds =
        (q.roundsSelected as { roundName: string; dates: string[] }[]) || [];
      const { fromDate, toDate } = getDateRangeFromRounds(rounds);

      const fixtures = await fetchFixturesForQuiniela(
        q.externalLeagueId,
        q.externalSeason,
        fromDate || undefined,
        toDate || undefined,
      );

      for (const fixture of fixtures) {
        allFixtures.set(fixture.fixture.id.toString(), fixture);
      }
    }

    // Initialize statistics
    let totalPredictions = 0;
    let exactPredictions = 0;
    let correctResultPredictions = 0;
    let missPredictions = 0;
    let noPredictions = 0;
    let totalPoints = 0;
    let finishedMatchesCount = 0;

    // For patterns
    const scoreCounts = new Map<string, number>();
    let drawPredictions = 0;
    let homeWinPredictions = 0;
    let awayWinPredictions = 0;
    let totalGoalsPredicted = 0;
    let predictionsWithScores = 0;

    // Process each prediction
    for (const prediction of userPredictions) {
      const fixture = allFixtures.get(prediction.externalFixtureId);
      if (!fixture) continue;

      const quinielaSettings = prediction.quinielaId
        ? quinielaSettingsMap.get(prediction.quinielaId)
        : null;
      const exactPoints = quinielaSettings?.exactPoints ?? 2;
      const correctResultPoints = quinielaSettings?.correctResultPoints ?? 1;

      const matchFinished =
        fixture.fixture.status.short === "FT" ||
        fixture.fixture.status.short === "AET" ||
        fixture.fixture.status.short === "PEN";

      const evaluation = evaluatePrediction(
        prediction.predictedHomeScore,
        prediction.predictedAwayScore,
        fixture.goals.home,
        fixture.goals.away,
        matchFinished,
        exactPoints,
        correctResultPoints,
      );

      // Only count finished matches for statistics
      if (matchFinished) {
        finishedMatchesCount++;
        totalPredictions++;

        switch (evaluation.type) {
          case "exact":
            exactPredictions++;
            totalPoints += evaluation.points;
            break;
          case "correct-result":
            correctResultPredictions++;
            totalPoints += evaluation.points;
            break;
          case "miss":
            missPredictions++;
            break;
          case "no-prediction":
            noPredictions++;
            break;
        }
      }

      // Track prediction patterns (for all predictions with scores)
      if (
        prediction.predictedHomeScore !== null &&
        prediction.predictedAwayScore !== null
      ) {
        predictionsWithScores++;
        const score = `${prediction.predictedHomeScore}-${prediction.predictedAwayScore}`;
        scoreCounts.set(score, (scoreCounts.get(score) || 0) + 1);

        totalGoalsPredicted +=
          prediction.predictedHomeScore + prediction.predictedAwayScore;

        if (prediction.predictedHomeScore === prediction.predictedAwayScore) {
          drawPredictions++;
        } else if (
          prediction.predictedHomeScore > prediction.predictedAwayScore
        ) {
          homeWinPredictions++;
        } else {
          awayWinPredictions++;
        }
      }
    }

    // Calculate rates
    const evaluatedPredictions = totalPredictions - noPredictions;
    const exactRate =
      evaluatedPredictions > 0
        ? (exactPredictions / evaluatedPredictions) * 100
        : 0;
    const correctResultRate =
      evaluatedPredictions > 0
        ? (correctResultPredictions / evaluatedPredictions) * 100
        : 0;
    const totalAccuracyRate =
      evaluatedPredictions > 0
        ? ((exactPredictions + correctResultPredictions) /
            evaluatedPredictions) *
          100
        : 0;
    const missRate =
      evaluatedPredictions > 0
        ? (missPredictions / evaluatedPredictions) * 100
        : 0;

    // Calculate average points per match
    const averagePointsPerMatch =
      evaluatedPredictions > 0 ? totalPoints / evaluatedPredictions : 0;

    // Calculate prediction patterns
    const mostPredictedScores = Array.from(scoreCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([score, count]) => ({ score, count }));

    const drawPredictionRate =
      predictionsWithScores > 0
        ? (drawPredictions / predictionsWithScores) * 100
        : 0;
    const homeWinPredictionRate =
      predictionsWithScores > 0
        ? (homeWinPredictions / predictionsWithScores) * 100
        : 0;
    const awayWinPredictionRate =
      predictionsWithScores > 0
        ? (awayWinPredictions / predictionsWithScores) * 100
        : 0;
    const averageGoalsPredicted =
      predictionsWithScores > 0
        ? totalGoalsPredicted / predictionsWithScores
        : 0;

    const response: UserStatisticsResponse = {
      totalPredictions,
      exactPredictions,
      correctResultPredictions,
      missPredictions,
      noPredictions,
      exactRate,
      correctResultRate,
      totalAccuracyRate,
      missRate,
      totalPoints,
      averagePointsPerMatch,
      mostPredictedScores,
      drawPredictionRate,
      homeWinPredictionRate,
      awayWinPredictionRate,
      averageGoalsPredicted,
      quinielasCount: userQuinielas.length,
      finishedMatchesCount,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching user statistics:", error);
    return NextResponse.json(
      { error: "Error al obtener las estadísticas" },
      { status: 500 },
    );
  }
}
