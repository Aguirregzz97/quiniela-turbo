"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

interface SignOutButtonProps {
  isCollapsed?: boolean;
}

export default function SignOutButton({ isCollapsed = false }: SignOutButtonProps) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive ${
        isCollapsed ? "justify-center" : ""
      }`}
    >
      <LogOut className="h-4 w-4" />
      {!isCollapsed && "Cerrar Sesión"}
    </button>
  );
}

