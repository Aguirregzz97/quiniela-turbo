"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "../ui/button";
import {
  LogOut,
  Moon,
  Sun,
  PanelLeftClose,
  PanelRightClose,
  TrendingUp,
  Award,
  Menu,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "../ui/switch";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";

const Sidebar = () => {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const session = useSession();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const routes = [
    {
      href: "/quinielas",
      label: "Quinielas",
      icon: Award,
    },
    {
      href: "/estadisticas",
      label: "Estadisticas",
      icon: TrendingUp,
    },
  ];

  // Don't render sidebar on sign-in or sign-up pages
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
    return null;
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={`fixed left-0 top-0 hidden h-full flex-col overflow-hidden border-r border-border/50 bg-background/80 backdrop-blur-xl transition-all duration-300 ease-in-out md:flex ${
          collapsed ? "w-[72px]" : "w-72"
        }`}
      >
        {/* Top Section - Logo and Toggle */}
        <div className="border-b border-border/50 bg-gradient-to-b from-primary/5 to-transparent p-4">
          <div
            className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}
          >
            {!collapsed && (
              <Link
                href="/"
                className="flex items-center gap-3 transition-opacity hover:opacity-80"
              >
                <Image
                  src="/img/logo.png"
                  alt="Logo"
                  width={240}
                  height={240}
                  className="h-10 w-10"
                />
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-lg font-bold tracking-tight text-transparent">
                  Quiniela Turbo
                </span>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="h-9 w-9 rounded-lg transition-colors hover:bg-primary/10"
            >
              {collapsed ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Middle Section - Navigation Routes */}
        <div className="flex-1 p-3">
          {!collapsed && (
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Navegación
            </p>
          )}
          <nav className="space-y-1">
            {routes.map((route, i) => {
              const IconComponent = route.icon;
              const isActive = pathname.includes(route.href);
              return (
                <Link
                  key={i}
                  href={route.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                  </div>
                  {!collapsed && route.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section - User Controls */}
        <div className="space-y-3 border-t border-border/50 p-3">
          {/* Theme Toggle */}
          {mounted && (
            <div
              className={`flex items-center rounded-xl bg-muted/50 transition-all ${
                collapsed ? "justify-center p-2" : "justify-between px-3 py-2.5"
              }`}
            >
              <div
                className={`flex items-center ${collapsed ? "" : "gap-3"}`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg bg-background ${collapsed ? "" : ""}`}
                >
                  <div className="relative h-4 w-4">
                    <Sun className="absolute inset-0 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute inset-0 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </div>
                </div>
                {!collapsed && (
                  <span className="text-sm font-medium">Modo oscuro</span>
                )}
              </div>
              {!collapsed && (
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={(checked) =>
                    setTheme(checked ? "dark" : "light")
                  }
                />
              )}
              {collapsed && (
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={theme === "dark"}
                  onChange={(e) =>
                    setTheme(e.target.checked ? "dark" : "light")
                  }
                />
              )}
            </div>
          )}

          {/* Profile Section */}
          <Link
            href="/perfil"
            className={`group flex items-center gap-3 rounded-xl p-2 transition-all hover:bg-muted ${
              collapsed ? "justify-center" : ""
            } ${pathname.includes("/perfil") ? "bg-primary/10" : ""}`}
          >
            <div className="relative">
              <div
                className={`relative overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-background transition-all group-hover:ring-primary/40 ${
                  pathname.includes("/perfil")
                    ? "ring-primary/40"
                    : "ring-primary/20"
                } ${collapsed ? "h-9 w-9" : "h-10 w-10"}`}
              >
                <Image
                  src={session.data?.user?.image ?? "/img/profile.png"}
                  alt="Profile"
                  fill
                  className="object-cover"
                  sizes={collapsed ? "36px" : "40px"}
                />
              </div>
              <div
                className={`absolute rounded-full border-2 border-background bg-green-500 ${
                  collapsed
                    ? "-bottom-0.5 -right-0.5 h-3 w-3"
                    : "-bottom-1 -right-1 h-3.5 w-3.5"
                }`}
              />
            </div>
            {!collapsed && (
              <div className="flex-1 overflow-hidden">
                <p
                  className={`truncate text-sm font-semibold transition-colors group-hover:text-primary ${
                    pathname.includes("/perfil")
                      ? "text-primary"
                      : "text-foreground"
                  }`}
                >
                  {session.data?.user?.name ?? "Usuario"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Ver perfil
                </p>
              </div>
            )}
          </Link>

          {/* Sign Out */}
          <Link
            href="/api/auth/signout"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && "Cerrar Sesión"}
          </Link>
        </div>
      </div>

      {/* Mobile Top Navigation */}
      <div className="fixed left-0 right-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between px-4 py-2">
          {/* Logo/Title */}
          <Link
            href="/quinielas"
            className="flex items-center gap-2 text-foreground transition-opacity hover:opacity-80"
          >
            <Image
              src="/img/logo.png"
              alt="Logo"
              width={240}
              height={240}
              className="h-10 w-10"
            />
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-lg font-bold tracking-tight text-transparent">
              Quiniela Turbo
            </span>
          </Link>

          {/* Hamburger Menu */}
          <Drawer direction="right">
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-10 w-10 rounded-full transition-colors hover:bg-primary/10"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="flex h-full flex-col">
              {/* Drawer Header with Profile */}
              <DrawerHeader className="border-b border-border/50 bg-gradient-to-b from-primary/5 to-transparent p-0">
                <DrawerTitle className="sr-only">
                  Menú de navegación
                </DrawerTitle>
                <DrawerClose asChild>
                  <Link href="/perfil" className="group block px-6 pb-6 pt-8">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="relative h-14 w-14 overflow-hidden rounded-full ring-2 ring-primary/20 ring-offset-2 ring-offset-background transition-all group-hover:ring-primary/40">
                          <Image
                            src={
                              session.data?.user?.image ?? "/img/profile.png"
                            }
                            alt="Profile"
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        </div>
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background bg-green-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground transition-colors group-hover:text-primary">
                          {session.data?.user?.name ?? "Usuario"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Ver perfil
                        </p>
                      </div>
                    </div>
                  </Link>
                </DrawerClose>
              </DrawerHeader>

              {/* Navigation Links */}
              <nav className="flex-1 space-y-1 p-4">
                <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Navegación
                </p>
                {routes.map((route, i) => {
                  const IconComponent = route.icon;
                  const isActive = pathname.includes(route.href);
                  return (
                    <DrawerClose key={i} asChild>
                      <Link
                        href={route.href}
                        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>
                        {route.label}
                      </Link>
                    </DrawerClose>
                  );
                })}
              </nav>

              {/* Bottom Section */}
              <div className="border-t border-border/50 p-4">
                {/* Theme Toggle */}
                {mounted && (
                  <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background">
                        <div className="relative h-4 w-4">
                          <Sun className="absolute inset-0 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                          <Moon className="absolute inset-0 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        </div>
                      </div>
                      <span className="text-sm font-medium">Modo oscuro</span>
                    </div>
                    <Switch
                      checked={theme === "dark"}
                      onCheckedChange={(checked) =>
                        setTheme(checked ? "dark" : "light")
                      }
                    />
                  </div>
                )}
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
