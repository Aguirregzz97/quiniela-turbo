import { auth } from "@/auth";
import JoinQuinielaForm from "@/components/QuinielaComponents/JoinQuinielaForm";
import { redirect } from "next/navigation";

interface JoinQuinielaPageProps {
  searchParams: Promise<{
    joinCode?: string;
  }>;
}

export default async function JoinQuinielaPage({
  searchParams,
}: JoinQuinielaPageProps) {
  const session = await auth();
  const { joinCode } = await searchParams;

  if (!session) {
    // Construct the callback URL with query parameters
    const callbackUrl = joinCode
      ? `/quinielas/join?joinCode=${joinCode}`
      : "/quinielas/join";
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Unirse a una Quiniela
        </h1>
        <p className="mt-2 text-muted-foreground">
          Ingresa el código de unión para participar en una quiniela
        </p>
      </div>

      <JoinQuinielaForm initialJoinCode={joinCode} />
    </div>
  );
}
