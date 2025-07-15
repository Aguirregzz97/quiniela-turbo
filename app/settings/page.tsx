import { auth } from "@/auth";
import Image from "next/image";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import SignoutButton from "@/components/SessionComponents/SignoutButton";

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-2 py-8">
      <Card className="flex w-full max-w-md flex-col items-center gap-4 sm:max-w-lg md:max-w-xl">
        <CardHeader className="flex flex-col items-center gap-4 pb-0">
          <div className="relative h-24 w-24 sm:h-32 sm:w-32">
            <Image
              src={user?.image || "/img/profile.png"}
              alt="Profile picture"
              fill
              className="rounded-full border-4 border-[hsl(var(--border))] object-cover"
              sizes="(max-width: 640px) 96px, 128px"
              priority
            />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-2">
          <h2 className="break-words text-center text-2xl font-bold text-[hsl(var(--foreground))] sm:text-3xl">
            {user?.name || "Nombre de usuario"}
          </h2>
          <p className="break-words text-center text-[hsl(var(--muted-foreground))]">
            {user?.email || "Correo electrónico"}
          </p>
          <div className="mt-6 flex w-full justify-center">
            <SignoutButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
