"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Moon, Sun, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";

const ProfileButton = ({ isComputer = false }: { isComputer?: boolean }) => {
  const { theme, setTheme } = useTheme();

  const { data: session } = useSession();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        {isComputer ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 bg-muted">
              <AvatarImage src={session?.user?.image ?? "/img/profile.png"} />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div>Profile</div>
          </div>
        ) : (
          <Avatar className="h-8 w-8 bg-muted">
            <AvatarImage src={session?.user?.image ?? "/img/profile.png"} />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent style={{ backgroundColor: "var(--background)" }}>
        <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Link href="sign-in">
          <DropdownMenuItem className="cursor-pointer">
            <LogIn className="mr-2 h-4 w-4" />
            Iniciar Sesion
          </DropdownMenuItem>
        </Link>
        <Link href="sign-up">
          <DropdownMenuItem className="cursor-pointer">
            <UserPlus className="mr-2 h-4 w-4" />
            Crear Cuenta
          </DropdownMenuItem>
        </Link>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <div className="relative mr-2 h-4 w-4">
            <Sun className="absolute inset-0 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute inset-0 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </div>
          <span>Toggle Theme</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileButton;
