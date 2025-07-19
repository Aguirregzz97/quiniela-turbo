import Image from "next/image";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/");
  }

  return (
    <div className="m-8 mt-16 flex flex-col items-center gap-8 bg-background text-center">
      <h2 className="text-3xl font-bold tracking-tight">Quiniela Turbo</h2>
    </div>
  );
}
