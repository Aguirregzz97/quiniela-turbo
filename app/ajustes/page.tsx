import { auth } from "@/auth";
import Image from "next/image";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import SignoutButton from "@/components/SessionComponents/SignoutButton";
import { Settings } from "lucide-react";

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Settings className="h-8 w-8 text-primary" />
          Ajustes
        </h1>
        <p className="mt-2 text-muted-foreground">
          Gestiona tu perfil y configuración de cuenta
        </p>
      </div>

      <div className="mt-10 grid gap-6">
        <Card className="w-full max-w-md sm:max-w-lg md:max-w-xl">
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
    </div>
  );
}
