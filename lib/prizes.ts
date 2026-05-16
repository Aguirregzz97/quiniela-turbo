import type { FixtureData } from "@/types/fixtures";
import { isMatchFinished, isMatchLive } from "@/types/fixtures";
import type { AllPredictionsData } from "@/hooks/predictions/useAllPredictions";

export interface PrizeDistribution {
  position: number;
  percentage: number;
}

export interface PrizeUserInfo {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

export interface UserPrizeAward {
  user: PrizeUserInfo;
  /** Position the user achieved (1 = first). Tied users share the same position. */
  position: number;
  /** Points the user earned for this scope (round or tournament). */
  points: number;
  /** Money awarded to this user for this scope. */
  amount: number;
  /**
   * The list of original prize positions whose money was pooled and split
   * across tied users at this position. E.g. positions 1 and 2 both
   * tied → tiedPositions = [1, 2] for both winners.
   */
  tiedPositions: number[];
}

export interface RoundPrizeBreakdown {
  roundName: string;
  /** True once every fixture in the round has a final result. */
  isFinalized: boolean;
  /** Total money to distribute for this round (or 0 if no per-round prize). */
  prizePool: number;
  /**
   * Awards by position. When `isFinalized` is false this represents the
   * current projection based on points so far; when true it is the
   * confirmed payout.
   */
  awards: UserPrizeAward[];
  /** All users who scored at least one point in the round, sorted desc. */
  ranking: { user: PrizeUserInfo; points: number; position: number }[];
}

export interface TournamentPrizeBreakdown {
  /** True once every fixture in every selected round has finished. */
  isFinalized: boolean;
  prizePool: number;
  awards: UserPrizeAward[];
  ranking: { user: PrizeUserInfo; points: number; position: number }[];
}

export interface UserTotalAward {
  user: PrizeUserInfo;
  /** Money from per-round prizes (sum across rounds where the user placed). */
  perRoundAmount: number;
  /** Money from the tournament-wide prize. */
  tournamentAmount: number;
  /** perRoundAmount + tournamentAmount. */
  total: number;
}

export interface PrizeBreakdownResult {
  rounds: RoundPrizeBreakdown[];
  tournament: TournamentPrizeBreakdown | null;
  totalsByUser: UserTotalAward[];
}

/**
 * Same scoring rules used everywhere else (Leaderboard, ResultadosPor*).
 */
function evaluatePoints(
  prediction: AllPredictionsData | undefined,
  actualHome: number | null,
  actualAway: number | null,
  exactPoints: number,
  correctResultPoints: number,
): number {
  if (
    !prediction ||
    prediction.predictedHomeScore === null ||
    prediction.predictedAwayScore === null
  ) {
    return 0;
  }
  if (actualHome === null || actualAway === null) return 0;

  const ph = prediction.predictedHomeScore;
  const pa = prediction.predictedAwayScore;
  if (ph === actualHome && pa === actualAway) return exactPoints;

  const predictedWinner = ph > pa ? "h" : ph < pa ? "a" : "d";
  const actualWinner =
    actualHome > actualAway ? "h" : actualHome < actualAway ? "a" : "d";
  return predictedWinner === actualWinner ? correctResultPoints : 0;
}

function buildUserDirectory(
  predictions: AllPredictionsData[],
): Map<string, PrizeUserInfo> {
  const dir = new Map<string, PrizeUserInfo>();
  for (const p of predictions) {
    if (dir.has(p.userId)) continue;
    dir.set(p.userId, {
      id: p.userId,
      name: p.userName,
      email: p.userEmail,
      image: p.userImage,
    });
  }
  return dir;
}

/**
 * Rank users by points (desc) and assign positions with ties getting the
 * same position number ("standard competition ranking" — 1, 2, 2, 4, ...).
 * Users with zero points are still included so the caller can decide
 * whether to award them.
 */
export function rankUsers(
  scores: Map<string, number>,
  userDir: Map<string, PrizeUserInfo>,
): { user: PrizeUserInfo; points: number; position: number }[] {
  const entries = Array.from(scores.entries())
    .map(([userId, points]) => ({
      user: userDir.get(userId)!,
      points,
    }))
    .filter((e) => e.user)
    .sort((a, b) => b.points - a.points);

  const ranked: {
    user: PrizeUserInfo;
    points: number;
    position: number;
  }[] = [];
  let lastPoints: number | null = null;
  let lastPosition = 0;
  entries.forEach((entry, index) => {
    const naturalPosition = index + 1;
    const position =
      lastPoints !== null && entry.points === lastPoints
        ? lastPosition
        : naturalPosition;
    ranked.push({ ...entry, position });
    lastPoints = entry.points;
    lastPosition = position;
  });
  return ranked;
}

/**
 * Award the prize pool. Tied users at a paying position split the prize
 * for THAT POSITION ONLY, equally. Lower positions are unaffected by the
 * tie. Users with zero points are never awarded, regardless of the prize
 * table — handing money to someone who didn't predict feels wrong and is
 * also what every sports pool does in practice.
 */
export function distributePrizes(
  ranking: { user: PrizeUserInfo; points: number; position: number }[],
  prizeTable: PrizeDistribution[],
  prizePool: number,
): UserPrizeAward[] {
  if (prizePool <= 0 || prizeTable.length === 0) return [];

  // Group users by position so we can split ties.
  const byPosition = new Map<
    number,
    { user: PrizeUserInfo; points: number }[]
  >();
  for (const r of ranking) {
    if (r.points <= 0) continue;
    if (!byPosition.has(r.position)) byPosition.set(r.position, []);
    byPosition.get(r.position)!.push({ user: r.user, points: r.points });
  }

  // Build a quick lookup: position -> percentage.
  const pctByPosition = new Map<number, number>();
  for (const slot of prizeTable) {
    pctByPosition.set(slot.position, slot.percentage);
  }

  const awards: UserPrizeAward[] = [];
  for (const [position, users] of byPosition.entries()) {
    const percentage = pctByPosition.get(position);
    if (!percentage) continue;
    const positionPool = (prizePool * percentage) / 100;
    const perUser = positionPool / users.length;
    for (const u of users) {
      awards.push({
        user: u.user,
        position,
        points: u.points,
        amount: perUser,
        tiedPositions: [position],
      });
    }
  }

  return awards.sort(
    (a, b) => a.position - b.position || b.amount - a.amount,
  );
}

/**
 * Per-round breakdown. We score every fixture whose result we can
 * evaluate (finished or live with a current score) just like the rest
 * of the app. A round only flips to `isFinalized` when every fixture
 * in it has truly ended — live matches still count toward the running
 * projection but don't lock in a payout.
 */
function buildRoundBreakdowns(
  fixtures: FixtureData[],
  predictions: AllPredictionsData[],
  userDir: Map<string, PrizeUserInfo>,
  exactPoints: number,
  correctResultPoints: number,
  moneyPerRoundToEnter: number,
  prizeDistributionPerRound: PrizeDistribution[] | null,
  participantCount: number,
  selectedRoundNames: string[],
): RoundPrizeBreakdown[] {
  // Group fixtures by round name.
  const fixturesByRound = new Map<string, FixtureData[]>();
  for (const f of fixtures) {
    const r = f.league.round;
    if (!fixturesByRound.has(r)) fixturesByRound.set(r, []);
    fixturesByRound.get(r)!.push(f);
  }

  const predictionsByRoundAndUser = new Map<
    string,
    Map<string, AllPredictionsData[]>
  >();
  for (const p of predictions) {
    if (!predictionsByRoundAndUser.has(p.externalRound)) {
      predictionsByRoundAndUser.set(p.externalRound, new Map());
    }
    const inner = predictionsByRoundAndUser.get(p.externalRound)!;
    if (!inner.has(p.userId)) inner.set(p.userId, []);
    inner.get(p.userId)!.push(p);
  }

  const roundPool =
    moneyPerRoundToEnter > 0 && participantCount > 0
      ? moneyPerRoundToEnter * participantCount
      : 0;

  // Iterate selected rounds in their stored order so the UI shows them
  // chronologically (jornada 1 → final). Rounds the user selected but
  // for which api-football hasn't returned any fixture yet show as
  // "pending" with empty awards.
  const breakdowns: RoundPrizeBreakdown[] = [];
  for (const roundName of selectedRoundNames) {
    const roundFixtures = fixturesByRound.get(roundName) ?? [];
    const isFinalized =
      roundFixtures.length > 0 &&
      roundFixtures.every((f) => isMatchFinished(f.fixture.status.short));

    // Score each user for this round.
    const scores = new Map<string, number>();
    const userPreds =
      predictionsByRoundAndUser.get(roundName) ?? new Map();

    for (const f of roundFixtures) {
      const finished = isMatchFinished(f.fixture.status.short);
      const live = isMatchLive(f.fixture.status.short);
      if (!finished && !live) continue;
      const actualHome = f.goals.home;
      const actualAway = f.goals.away;
      const fixtureId = f.fixture.id.toString();

      for (const [userId] of userDir) {
        const userPredictions = userPreds.get(userId) ?? [];
        const prediction = userPredictions.find(
          (p: AllPredictionsData) => p.externalFixtureId === fixtureId,
        );
        const pts = evaluatePoints(
          prediction,
          actualHome,
          actualAway,
          exactPoints,
          correctResultPoints,
        );
        scores.set(userId, (scores.get(userId) ?? 0) + pts);
      }
    }

    // Make sure every user appears in the ranking even with 0 points so
    // the UI can show participants who didn't predict anything.
    for (const [userId] of userDir) {
      if (!scores.has(userId)) scores.set(userId, 0);
    }

    const ranking = rankUsers(scores, userDir);
    const awards = prizeDistributionPerRound
      ? distributePrizes(ranking, prizeDistributionPerRound, roundPool)
      : [];

    breakdowns.push({
      roundName,
      isFinalized,
      prizePool: roundPool,
      awards,
      ranking,
    });
  }

  return breakdowns;
}

function buildTournamentBreakdown(
  fixtures: FixtureData[],
  predictions: AllPredictionsData[],
  userDir: Map<string, PrizeUserInfo>,
  exactPoints: number,
  correctResultPoints: number,
  moneyToEnter: number,
  prizeDistribution: PrizeDistribution[] | null,
  participantCount: number,
  selectedRoundNames: string[],
): TournamentPrizeBreakdown | null {
  if (moneyToEnter <= 0 || !prizeDistribution || prizeDistribution.length === 0)
    return null;

  // Restrict scoring to the rounds the quiniela actually selected. The
  // useFixtures call may pull a wider date range that includes other
  // rounds (Apertura/Clausura overlap, friendlies, etc.) — we don't
  // want those bleeding into the tournament-wide standings.
  const allowedRounds = new Set(selectedRoundNames);
  const scopedFixtures = fixtures.filter((f) =>
    allowedRounds.has(f.league.round),
  );

  // Tournament is finalized only when every selected round has at
  // least one fixture in our data AND every fixture is finished. If a
  // selected round has no fixtures at all (api-football hasn't
  // published it yet, e.g. an elimination round), the tournament can't
  // be considered finalized.
  const fixturesByRound = new Map<string, FixtureData[]>();
  for (const f of scopedFixtures) {
    if (!fixturesByRound.has(f.league.round))
      fixturesByRound.set(f.league.round, []);
    fixturesByRound.get(f.league.round)!.push(f);
  }
  const isFinalized =
    selectedRoundNames.length > 0 &&
    selectedRoundNames.every((r) => {
      const fs = fixturesByRound.get(r);
      return (
        !!fs &&
        fs.length > 0 &&
        fs.every((f) => isMatchFinished(f.fixture.status.short))
      );
    });

  // Score every user across the whole tournament.
  const scores = new Map<string, number>();
  const predictionsByUser = new Map<string, AllPredictionsData[]>();
  for (const p of predictions) {
    if (!allowedRounds.has(p.externalRound)) continue;
    if (!predictionsByUser.has(p.userId)) predictionsByUser.set(p.userId, []);
    predictionsByUser.get(p.userId)!.push(p);
  }

  for (const f of scopedFixtures) {
    const finished = isMatchFinished(f.fixture.status.short);
    const live = isMatchLive(f.fixture.status.short);
    if (!finished && !live) continue;
    const fixtureId = f.fixture.id.toString();
    const actualHome = f.goals.home;
    const actualAway = f.goals.away;

    for (const [userId] of userDir) {
      const userPredictions = predictionsByUser.get(userId) ?? [];
      const prediction = userPredictions.find(
        (p) => p.externalFixtureId === fixtureId,
      );
      const pts = evaluatePoints(
        prediction,
        actualHome,
        actualAway,
        exactPoints,
        correctResultPoints,
      );
      scores.set(userId, (scores.get(userId) ?? 0) + pts);
    }
  }

  for (const [userId] of userDir) {
    if (!scores.has(userId)) scores.set(userId, 0);
  }

  const ranking = rankUsers(scores, userDir);
  const prizePool =
    moneyToEnter > 0 && participantCount > 0
      ? moneyToEnter * participantCount
      : 0;
  const awards = distributePrizes(ranking, prizeDistribution, prizePool);

  return {
    isFinalized,
    prizePool,
    awards,
    ranking,
  };
}

export interface ComputePrizeBreakdownInput {
  fixtures: FixtureData[];
  predictions: AllPredictionsData[];
  selectedRoundNames: string[];
  participantCount: number;
  exactPoints: number;
  correctResultPoints: number;
  moneyToEnter: number;
  prizeDistribution: PrizeDistribution[] | null;
  moneyPerRoundToEnter: number;
  prizeDistributionPerRound: PrizeDistribution[] | null;
  /**
   * The full participant list. Used to seed the user directory so users
   * who haven't submitted a single prediction still show up (they're
   * obviously irrelevant for awards but the ranking can be useful).
   */
  participants?: PrizeUserInfo[];
}

export function computePrizeBreakdown({
  fixtures,
  predictions,
  selectedRoundNames,
  participantCount,
  exactPoints,
  correctResultPoints,
  moneyToEnter,
  prizeDistribution,
  moneyPerRoundToEnter,
  prizeDistributionPerRound,
  participants,
}: ComputePrizeBreakdownInput): PrizeBreakdownResult {
  const userDir = buildUserDirectory(predictions);
  if (participants) {
    for (const p of participants) {
      if (!userDir.has(p.id)) userDir.set(p.id, p);
    }
  }

  const rounds = buildRoundBreakdowns(
    fixtures,
    predictions,
    userDir,
    exactPoints,
    correctResultPoints,
    moneyPerRoundToEnter,
    prizeDistributionPerRound,
    participantCount,
    selectedRoundNames,
  );

  const tournament = buildTournamentBreakdown(
    fixtures,
    predictions,
    userDir,
    exactPoints,
    correctResultPoints,
    moneyToEnter,
    prizeDistribution,
    participantCount,
    selectedRoundNames,
  );

  // Aggregate per-user totals.
  const totalsMap = new Map<string, UserTotalAward>();
  for (const round of rounds) {
    if (!round.isFinalized) continue;
    for (const award of round.awards) {
      const entry = totalsMap.get(award.user.id) ?? {
        user: award.user,
        perRoundAmount: 0,
        tournamentAmount: 0,
        total: 0,
      };
      entry.perRoundAmount += award.amount;
      entry.total += award.amount;
      totalsMap.set(award.user.id, entry);
    }
  }
  if (tournament?.isFinalized) {
    for (const award of tournament.awards) {
      const entry = totalsMap.get(award.user.id) ?? {
        user: award.user,
        perRoundAmount: 0,
        tournamentAmount: 0,
        total: 0,
      };
      entry.tournamentAmount += award.amount;
      entry.total += award.amount;
      totalsMap.set(award.user.id, entry);
    }
  }

  const totalsByUser = Array.from(totalsMap.values()).sort(
    (a, b) => b.total - a.total,
  );

  return { rounds, tournament, totalsByUser };
}
