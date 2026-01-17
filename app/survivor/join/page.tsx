import { auth } from "@/auth";
import JoinSurvivorForm from "@/components/SurvivorComponents/JoinSurvivorForm";
import { UserPlus } from "lucide-react";
import { redirect } from "next/navigation";

interface JoinSurvivorPageProps {
  searchParams: Promise<{
    joinCode?: string;
  }>;
}

export default async function JoinSurvivorPage({
  searchParams,
}: JoinSurvivorPageProps) {
  const session = await auth();
  const { joinCode } = await searchParams;

  if (!session) {
    // Construct the callback URL with query parameters
    const callbackUrl = joinCode
      ? `/survivor/join?joinCode=${joinCode}`
      : "/survivor/join";
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <div className="max-w-lg px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm sm:h-14 sm:w-14">
          <UserPlus className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
        </div>
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">
            Unirse a un Survivor
          </h1>
          <p className="text-sm text-muted-foreground">
            Ingresa el código para participar
          </p>
        </div>
      </div>

      <JoinSurvivorForm initialJoinCode={joinCode} />
    </div>
  );
}

