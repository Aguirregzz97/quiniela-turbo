import { Award, ArrowLeft, Users, DollarSign } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  quinielas,
  users,
  quiniela_settings,
  quiniela_participants,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import QuinielaHeaderMenu from "@/components/QuinielaComponents/QuinielaHeaderMenu";
import QuinielaResultsTabs from "@/components/QuinielaComponents/QuinielaResultsTabs";
import PendingPredictionsSection from "@/components/QuinielaComponents/PendingPredictionsSection";
import { getPendingPredictions } from "../pending-predictions-action";
import { getLeagueImageSrc } from "@/lib/leagues";

interface QuinielaPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function QuinielaPage({ params }: QuinielaPageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=/quinielas/${id}`);
  }

  const quinielaWithOwnerAndSettings = await db
    .select({
      id: quinielas.id,
      name: quinielas.name,
      description: quinielas.description,
      league: quinielas.league,
      externalLeagueId: quinielas.externalLeagueId,
      externalSeason: quinielas.externalSeason,
      joinCode: quinielas.joinCode,
      createdAt: quinielas.createdAt,
      updatedAt: quinielas.updatedAt,
      ownerId: quinielas.ownerId,
      ownerName: users.name,
      ownerEmail: users.email,
      roundsSelected: quinielas.roundsSelected,
      pointsForExactResultPrediction:
        quiniela_settings.pointsForExactResultPrediction,
      pointsForCorrectResultPrediction:
        quiniela_settings.pointsForCorrectResultPrediction,
      moneyToEnter: quiniela_settings.moneyToEnter,
      prizeDistribution: quiniela_settings.prizeDistribution,
      moneyPerRoundToEnter: quiniela_settings.moneyPerRoundToEnter,
      prizeDistributionPerRound: quiniela_settings.prizeDistributionPerRound,
    })
    .from(quinielas)
    .innerJoin(users, eq(quinielas.ownerId, users.id))
    .leftJoin(quiniela_settings, eq(quinielas.id, quiniela_settings.quinielaId))
    .where(eq(quinielas.id, id))
    .limit(1);

  if (!quinielaWithOwnerAndSettings.length) {
    notFound();
  }

  const quinielaData = quinielaWithOwnerAndSettings[0];

  const participants = await db
    .select({
      id: quiniela_participants.id,
      userId: quiniela_participants.userId,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
      joinedAt: quiniela_participants.createdAt,
    })
    .from(quiniela_participants)
    .innerJoin(users, eq(quiniela_participants.userId, users.id))
    .where(eq(quiniela_participants.quinielaId, id))
    .orderBy(quiniela_participants.createdAt);

  const pendingPredictionsData = await getPendingPredictions(
    quinielaData.id,
    session.user.id,
    quinielaData.externalLeagueId,
    quinielaData.externalSeason,
    (quinielaData.roundsSelected || []) as { roundName: string; dates: string[] }[]
  );

  const isAdmin = session.user.id === quinielaData.ownerId;

  // Header stat chips
  const tournamentPool =
    (quinielaData.moneyToEnter ?? 0) > 0
      ? (quinielaData.moneyToEnter as number) * participants.length
      : 0;

  const quinielaForChildren = {
    id: quinielaData.id,
    name: quinielaData.name,
    description: quinielaData.description,
    league: quinielaData.league,
    externalLeagueId: quinielaData.externalLeagueId,
    externalSeason: quinielaData.externalSeason,
    joinCode: quinielaData.joinCode,
    createdAt: quinielaData.createdAt,
    updatedAt: quinielaData.updatedAt,
    ownerId: quinielaData.ownerId,
    roundsSelected: quinielaData.roundsSelected,
  };

  return (
    <div className="max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/quinielas"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Quinielas
      </Link>

      {/* Slimmed Hero: identity + stat chips + single overflow menu */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-5 sm:p-7">
        <div className="absolute -right-8 -top-8 h-40 w-40 opacity-[0.05] sm:h-56 sm:w-56">
          {quinielaData.externalLeagueId ? (
            <Image
              src={getLeagueImageSrc(quinielaData.externalLeagueId)}
              alt=""
              fill
              className="object-contain"
            />
          ) : (
            <Award className="h-full w-full" />
          )}
        </div>

        <div className="relative flex items-start gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5 sm:h-16 sm:w-16">
            {quinielaData.externalLeagueId ? (
              <Image
                src={getLeagueImageSrc(quinielaData.externalLeagueId)}
                alt={quinielaData.league || "Liga"}
                width={64}
                height={64}
                className="h-12 w-12 object-contain sm:h-14 sm:w-14"
              />
            ) : (
              <Award className="h-7 w-7 text-primary sm:h-8 sm:w-8" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            {/* Title row: name + overflow menu pinned right (consistent on mobile + desktop) */}
            <div className="flex items-start justify-between gap-3">
              <h1 className="min-w-0 truncate text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
                {quinielaData.name}
              </h1>
              <div className="flex-shrink-0">
                <QuinielaHeaderMenu
                  quiniela={quinielaForChildren}
                  detailsData={{
                    name: quinielaData.name,
                    description: quinielaData.description,
                    league: quinielaData.league,
                    externalLeagueId: quinielaData.externalLeagueId,
                    joinCode: quinielaData.joinCode,
                    createdAt: quinielaData.createdAt,
                    ownerName: quinielaData.ownerName,
                    ownerEmail: quinielaData.ownerEmail,
                    moneyToEnter: quinielaData.moneyToEnter,
                    prizeDistribution: quinielaData.prizeDistribution,
                    moneyPerRoundToEnter: quinielaData.moneyPerRoundToEnter,
                    prizeDistributionPerRound:
                      quinielaData.prizeDistributionPerRound,
                    pointsForExactResultPrediction:
                      quinielaData.pointsForExactResultPrediction,
                    pointsForCorrectResultPrediction:
                      quinielaData.pointsForCorrectResultPrediction,
                  }}
                  participants={participants}
                  currentUserId={session.user.id}
                  isAdmin={isAdmin}
                  exactPoints={quinielaData.pointsForExactResultPrediction ?? 2}
                  correctResultPoints={
                    quinielaData.pointsForCorrectResultPrediction ?? 1
                  }
                  moneyToEnter={quinielaData.moneyToEnter ?? null}
                  prizeDistribution={quinielaData.prizeDistribution ?? null}
                  moneyPerRoundToEnter={
                    quinielaData.moneyPerRoundToEnter ?? null
                  }
                  prizeDistributionPerRound={
                    quinielaData.prizeDistributionPerRound ?? null
                  }
                />
              </div>
            </div>

            <p className="text-sm text-muted-foreground sm:text-base">
              {quinielaData.league}
            </p>
            {quinielaData.description && (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground/80">
                {quinielaData.description}
              </p>
            )}

            {/* Stat chips - hidden on mobile to keep the hero compact;
                same info is available via the overflow menu (Detalles / Premios). */}
            <div className="mt-3 hidden flex-wrap items-center gap-2 sm:flex">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-xs font-medium">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                {participants.length} participante
                {participants.length === 1 ? "" : "s"}
              </span>
              {tournamentPool > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <DollarSign className="h-3.5 w-3.5" />
                  {tournamentPool.toLocaleString("es-MX")} en juego
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Primary action: pending predictions */}
      <PendingPredictionsSection
        quinielaId={quinielaData.id}
        isAdmin={isAdmin}
        activeRound={pendingPredictionsData.activeRound}
        totalFixtures={pendingPredictionsData.totalFixtures}
        usersWithPending={pendingPredictionsData.usersWithPending}
        currentUserHasPending={pendingPredictionsData.currentUserHasPending}
        currentUserPendingCount={pendingPredictionsData.currentUserPendingCount}
      />

      {/* Unified results section: tabs make the two views explicit */}
      <QuinielaResultsTabs
        quiniela={quinielaForChildren}
        exactPoints={quinielaData.pointsForExactResultPrediction ?? 2}
        correctResultPoints={quinielaData.pointsForCorrectResultPrediction ?? 1}
        moneyToEnter={quinielaData.moneyToEnter ?? undefined}
        prizeDistribution={quinielaData.prizeDistribution ?? undefined}
        participantCount={participants.length}
      />
    </div>
  );
}
