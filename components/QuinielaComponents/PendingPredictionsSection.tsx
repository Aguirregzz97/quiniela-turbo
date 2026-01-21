"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dices,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Clock,
  Users,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

interface UserWithPendingPredictions {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  pendingCount: number;
  totalFixtures: number;
}

interface PendingPredictionsSectionProps {
  quinielaId: string;
  isAdmin: boolean;
  activeRound: string | null;
  totalFixtures: number;
  usersWithPending: UserWithPendingPredictions[];
  currentUserHasPending: boolean;
  currentUserPendingCount: number;
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "??";
}

export default function PendingPredictionsSection({
  quinielaId,
  isAdmin,
  activeRound,
  totalFixtures,
  usersWithPending,
  currentUserHasPending,
  currentUserPendingCount,
}: PendingPredictionsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const allUsersComplete = usersWithPending.length === 0;

  return (
    <div className="mb-8 space-y-4">
      {/* Section Title */}
      <h2 className="text-lg font-semibold">Registrar Pronósticos</h2>

      {/* Main Registration Link */}
      <Link
        href={`/quinielas/${quinielaId}/registrar-pronosticos`}
        className="group block"
      >
        <Card
          className={`h-full overflow-hidden border-border/50 transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 ${
            currentUserHasPending
              ? "ring-1 ring-amber-500/30 border-amber-500/50"
              : ""
          }`}
        >
          <CardContent className="flex items-center gap-4 p-5 sm:p-6">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:scale-110">
              <Dices className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold transition-colors group-hover:text-primary">
                  Registrar Pronósticos
                </h3>
                {currentUserHasPending && (
                  <Badge
                    variant="secondary"
                    className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-500"
                  >
                    <AlertCircle className="h-3 w-3" />
                    {currentUserPendingCount} pendiente
                    {currentUserPendingCount > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {currentUserHasPending
                  ? `Tienes ${currentUserPendingCount} pronóstico${currentUserPendingCount > 1 ? "s" : ""} pendiente${currentUserPendingCount > 1 ? "s" : ""} para ${activeRound}`
                  : "Haz tus predicciones para los partidos"}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground/50 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
          </CardContent>
        </Card>
      </Link>

      {/* Admin View: Collapsible list of users with pending predictions */}
      {isAdmin && activeRound && totalFixtures > 0 && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <button
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                allUsersComplete
                  ? "border-green-500/30 bg-green-500/5 hover:bg-green-500/10"
                  : "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    allUsersComplete ? "bg-green-500/20" : "bg-amber-500/20"
                  }`}
                >
                  {allUsersComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                  )}
                </div>
                <div>
                  <span className="font-medium">
                    {allUsersComplete
                      ? "Todos han registrado sus pronósticos"
                      : "Usuarios con pronósticos pendientes"}
                  </span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {allUsersComplete ? (
                      <span className="text-green-600 dark:text-green-500">
                        ✓ {activeRound}
                      </span>
                    ) : (
                      <>
                        ({usersWithPending.length} usuario
                        {usersWithPending.length !== 1 ? "s" : ""})
                      </>
                    )}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <Card className="border-border/50">
              <CardContent className="p-4">
                {/* Round Info Header */}
                <div className="mb-4 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Jornada actual:
                    </span>
                    <span className="font-medium">{activeRound}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {totalFixtures} partido{totalFixtures !== 1 ? "s" : ""}
                  </Badge>
                </div>

                {allUsersComplete ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                      <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-500" />
                    </div>
                    <p className="font-medium text-green-600 dark:text-green-500">
                      ¡Excelente!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Todos los participantes han registrado sus pronósticos
                      para esta jornada.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Reminder message for admin */}
                    <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2.5 text-sm">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-500" />
                      <p className="text-amber-700 dark:text-amber-400">
                        <span className="font-medium">¡Recuérdales!</span> Los siguientes usuarios aún no han registrado sus pronósticos. Avísales antes de que comiencen los partidos.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                    {usersWithPending.map((user) => (
                      <div
                        key={user.userId}
                        className="flex items-center justify-between rounded-lg border border-border/50 bg-background px-3 py-2.5"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={user.userImage || undefined}
                              alt={user.userName || "Usuario"}
                            />
                            <AvatarFallback className="text-xs">
                              {getInitials(user.userName, user.userEmail)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {user.userName || "Usuario sin nombre"}
                            </p>
                            {user.userEmail && (
                              <p className="truncate text-xs text-muted-foreground">
                                {user.userEmail}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-500"
                        >
                          <Clock className="h-3 w-3" />
                          {user.pendingCount}/{user.totalFixtures}
                        </Badge>
                      </div>
                    ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

