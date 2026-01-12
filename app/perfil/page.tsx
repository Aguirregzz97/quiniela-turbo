import { auth } from "@/auth";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import SignoutButton from "@/components/SessionComponents/SignoutButton";
import { User, Mail, Calendar, Shield } from "lucide-react";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/perfil");
  }

  const user = session.user;

  return (
    <div className="max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
          <User className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Mi Perfil
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestiona tu información personal
          </p>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="overflow-hidden border-border/50">
        {/* Banner */}
        <div className="relative h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent sm:h-32">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        </div>

        {/* Avatar Section */}
        <div className="relative px-6 pb-6">
          <div className="relative -mt-12 mb-4 flex justify-center sm:-mt-16">
            <div className="relative">
              <div className="relative h-24 w-24 overflow-hidden rounded-full ring-4 ring-background sm:h-32 sm:w-32">
                <Image
                  src={user?.image || "/img/profile.png"}
                  alt="Profile picture"
                  fill
                  className="rounded-full object-cover"
                  sizes="(max-width: 640px) 96px, 128px"
                  priority
                />
              </div>
              {/* Online indicator */}
              <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-4 border-background bg-green-500 sm:h-6 sm:w-6" />
            </div>
          </div>

          {/* User Info */}
          <div className="text-center">
            <h2 className="text-xl font-bold sm:text-2xl">
              {user?.name || "Nombre de usuario"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {user?.email || "Correo electrónico"}
            </p>
          </div>
        </div>
      </Card>

      {/* Info Cards */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {/* Email Card */}
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Correo electrónico
              </p>
              <p className="truncate text-sm font-medium">
                {user?.email || "No disponible"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account Status Card */}
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-green-500/20 to-green-500/10">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Estado de cuenta
              </p>
              <p className="text-sm font-medium text-green-600">Activa</p>
            </div>
          </CardContent>
        </Card>

        {/* Member Since Card */}
        <Card className="border-border/50 sm:col-span-2">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/10">
              <Calendar className="h-5 w-5 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Miembro desde
              </p>
              <p className="text-sm font-medium">
                {new Date().toLocaleDateString("es-MX", {
                  year: "numeric",
                  month: "long",
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card className="mt-5 border-border/50">
        <CardContent className="p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Acciones
          </p>
          <SignoutButton />
        </CardContent>
      </Card>
    </div>
  );
}
