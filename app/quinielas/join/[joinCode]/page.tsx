import { redirect } from "next/navigation";

interface JoinQuinielaPageProps {
  params: Promise<{
    joinCode: string;
  }>;
}

export default async function JoinQuinielaPage({
  params,
}: JoinQuinielaPageProps) {
  // Await params before accessing properties
  const { joinCode } = await params;

  // Redirect to the new join form page with the join code as a parameter
  redirect(`/quinielas/join?joinCode=${joinCode}`);
}
