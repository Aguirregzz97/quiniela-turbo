import { TrendingUp, Award, Swords } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserStatistics from "@/components/StatisticsComponents/UserStatistics";
import SurvivorStatistics from "@/components/StatisticsComponents/SurvivorStatistics";

export default async function EstadisticasPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/estadisticas");
  }

  return (
    <div className="max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
          <TrendingUp className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Estadísticas
          </h1>
          <p className="text-sm text-muted-foreground">
            Analiza tu rendimiento en todos tus juegos
          </p>
        </div>
      </div>

      {/* Tabs for different game types */}
      <Tabs defaultValue="quinielas" className="w-full">
        <TabsList className="mb-6 h-auto w-full gap-1 bg-muted/50 p-1 sm:w-auto">
          <TabsTrigger
            value="quinielas"
            className="flex-1 gap-2 px-4 py-2.5 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 data-[state=active]:shadow-sm sm:flex-none"
          >
            <Award className="h-4 w-4" />
            <span>Quinielas</span>
          </TabsTrigger>
          <TabsTrigger
            value="survivor"
            className="flex-1 gap-2 px-4 py-2.5 data-[state=active]:bg-rose-500/10 data-[state=active]:text-rose-600 data-[state=active]:shadow-sm sm:flex-none"
          >
            <Swords className="h-4 w-4" />
            <span>Survivor</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quinielas" className="mt-0">
          <UserStatistics />
        </TabsContent>

        <TabsContent value="survivor" className="mt-0">
          <SurvivorStatistics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
