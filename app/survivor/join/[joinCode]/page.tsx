import { redirect } from "next/navigation";

interface JoinSurvivorPageProps {
  params: Promise<{
    joinCode: string;
  }>;
}

export default async function JoinSurvivorPage({
  params,
}: JoinSurvivorPageProps) {
  // Await params before accessing properties
  const { joinCode } = await params;

  // Redirect to the new join form page with the join code as a parameter
  redirect(`/survivor/join?joinCode=${joinCode}`);
}

