"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Award, Trophy } from "lucide-react";
import Image from "next/image";
import ClasificacionesChart from "@/components/QuinielaComponents/ClasificacionesChart";
import ArchivedQuinielasSection from "@/components/shared/ArchivedQuinielasSection";
import { getLeagueImageSrc } from "@/lib/leagues";
import { isQuinielaArchived } from "@/lib/rounds";

interface Quiniela {
  id: string;
  name: string;
  description: string;
  league: string;
  externalLeagueId: string;
  externalSeason: string;
  roundsSelected: { roundName: string; dates: string[] }[] | null;
  joinCode: string;
  ownerId: string;
  exactPoints: number | null;
  correctResultPoints: number | null;
}

interface PuntuacionesTabsProps {
  quinielas: Quiniela[];
}

function QuinielaScoreCard({
  quiniela,
  archived = false,
}: {
  quiniela: Quiniela;
  archived?: boolean;
}) {
  return (
    <Card
      className={`overflow-hidden border-border/50 transition-all duration-300 hover:shadow-lg ${
        archived ? "opacity-80 hover:opacity-100" : ""
      }`}
    >
      <CardContent className="p-0">
        {/* Card Header */}
        <div className="relative border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-6">
          {/* Background decoration */}
          <div className="absolute -right-8 -top-8 h-32 w-32 opacity-[0.05]">
            {quiniela.externalLeagueId ? (
              <Image
                src={getLeagueImageSrc(quiniela.externalLeagueId)}
                alt=""
                fill
                className="object-contain"
              />
            ) : (
              <Trophy className="h-full w-full" />
            )}
          </div>

          <div className="relative flex items-center gap-3 sm:gap-4">
            {/* League Badge */}
            <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-black/5 sm:h-14 sm:w-14">
              {quiniela.externalLeagueId ? (
                <Image
                  src={getLeagueImageSrc(quiniela.externalLeagueId)}
                  alt={quiniela.league || "Liga"}
                  width={48}
                  height={48}
                  className="h-11 w-11 object-contain sm:h-[52px] sm:w-[52px]"
                />
              ) : (
                <Trophy className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
              )}
            </div>

            {/* Quiniela Info */}
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-bold sm:text-xl">
                {quiniela.name}
              </h3>
              <p className="truncate text-sm text-muted-foreground">
                {quiniela.league}
              </p>
            </div>

            {/* Join Code */}
            <span className="hidden rounded-lg bg-primary/10 px-3 py-1.5 font-mono text-xs font-semibold text-primary sm:inline-flex">
              {quiniela.joinCode}
            </span>
          </div>
        </div>

        {/* Chart Section */}
        <div className="p-4 sm:p-6">
          <ClasificacionesChart
            quiniela={{
              id: quiniela.id,
              name: quiniela.name,
              description: quiniela.description,
              league: quiniela.league,
              externalLeagueId: quiniela.externalLeagueId,
              externalSeason: quiniela.externalSeason,
              roundsSelected: quiniela.roundsSelected ?? [],
              joinCode: quiniela.joinCode,
              ownerId: quiniela.ownerId,
              createdAt: new Date(),
              updatedAt: new Date(),
            }}
            exactPoints={quiniela.exactPoints ?? 2}
            correctResultPoints={quiniela.correctResultPoints ?? 1}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function PuntuacionesTabs({ quinielas }: PuntuacionesTabsProps) {
  const hasQuinielas = quinielas.length > 0;

  if (!hasQuinielas) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Award className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">Sin quinielas aún</h2>
          <p className="max-w-md text-muted-foreground">
            Únete a una quiniela y comienza a hacer pronósticos para ver las
            puntuaciones aquí.
          </p>
        </CardContent>
      </Card>
    );
  }

  const activeQuinielas = quinielas.filter(
    (q) => !isQuinielaArchived(q.roundsSelected ?? []),
  );
  const archivedQuinielas = quinielas.filter((q) =>
    isQuinielaArchived(q.roundsSelected ?? []),
  );

  return (
    <div>
      <div className="space-y-4">
        {activeQuinielas.map((quiniela) => (
          <QuinielaScoreCard key={quiniela.id} quiniela={quiniela} />
        ))}
      </div>

      {archivedQuinielas.length > 0 && (
        <ArchivedQuinielasSection count={archivedQuinielas.length}>
          <div className="space-y-4">
            {archivedQuinielas.map((quiniela) => (
              <QuinielaScoreCard
                key={quiniela.id}
                quiniela={quiniela}
                archived
              />
            ))}
          </div>
        </ArchivedQuinielasSection>
      )}
    </div>
  );
}
