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
        className={`fixed left-0 top-0 hidden h-full flex-col overflow-hidden border-r border-border bg-card text-card-foreground transition-all duration-300 ease-in-out md:flex ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Top Section - Logo and Toggle */}
        <div className="border-b border-border p-6 px-4">
          <div className="flex items-center justify-between">
            <div
              className={`transition-opacity duration-300 ${collapsed ? "opacity-0" : "opacity-100"}`}
            >
              {!collapsed && (
                <Link
                  href="/"
                  className="flex items-center space-x-2 text-foreground hover:text-foreground/80"
                >
                  <Image
                    src="/img/logo.png"
                    alt="Logo"
                    width={240}
                    height={240}
                    className="h-16 w-16"
                  />
                  <h1 className="text-xl font-bold">QUINIELA TURBO</h1>
                </Link>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8 p-0"
            >
              {collapsed ? (
                <PanelRightClose className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Middle Section - Navigation Routes */}
        <div className="flex-1 p-4">
          <nav className="space-y-2">
            {routes.map((route, i) => {
              const IconComponent = route.icon;
              return (
                <Button
                  key={i}
                  variant={
                    pathname.includes(route.href) ? "secondary" : "ghost"
                  }
                  className={`justify-start text-foreground hover:text-foreground/80 ${
                    collapsed ? "w-full px-2" : "w-full"
                  }`}
                  asChild
                >
                  <Link href={route.href}>
                    <IconComponent className="h-4 w-4" />
                    {!collapsed && <span className="ml-2">{route.label}</span>}
                  </Link>
                </Button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section - User Controls */}
        <div className="space-y-2 border-t border-border p-4">
          {/* Settings Menu Items */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              className={`justify-start text-foreground hover:text-foreground/80 ${
                collapsed ? "w-full px-2" : "w-full"
              }`}
              asChild
            >
              <Link href="/api/auth/signout">
                <LogOut className="h-4 w-4" />
                {!collapsed && <span className="ml-2">Cerrar Sesion</span>}
              </Link>
            </Button>

            {!collapsed && (
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center">
                  <div className="relative ml-[3px] mr-2 h-4 w-4">
                    <Sun className="absolute inset-0 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute inset-0 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </div>
                  <span className="text-sm">Theme</span>
                </div>
                {mounted && (
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={(checked) =>
                      setTheme(checked ? "dark" : "light")
                    }
                  />
                )}
              </div>
            )}
          </div>

          {/* Profile Button - Simple Link */}
          <div className="pt-2">
            <Button
              variant={pathname.includes("/perfil") ? "secondary" : "ghost"}
              className={`justify-start text-foreground hover:text-foreground/80 ${
                collapsed ? "w-full px-2" : "w-full"
              }`}
              asChild
            >
              <Link
                className={`${collapsed ? "px-[3px]" : "px-[8px]"}`}
                href="/perfil"
              >
                <div className="flex items-center gap-2">
                  <div className="relative h-6 w-6 rounded-full bg-muted">
                    <Image
                      src={session.data?.user?.image ?? "/img/profile.png"}
                      alt="Profile"
                      fill
                      className="rounded-full object-cover"
                      sizes="24px"
                    />
                  </div>
                  {!collapsed && (
                    <span>{session.data?.user?.name ?? "Profile"}</span>
                  )}
                </div>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Top Navigation */}
      <div className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-card text-card-foreground md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo/Title */}
          <Link
            href="/quinielas"
            className="flex items-center gap-2 text-foreground hover:text-foreground/80"
          >
            <Image
              src="/img/logo.png"
              alt="Logo"
              width={240}
              height={240}
              className="ml-1 h-16 w-16"
            />
            <span className="text-lg font-bold">Quiniela Turbo</span>
          </Link>

          {/* Hamburger Menu */}
          <Drawer direction="right">
            <DrawerTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Menú</DrawerTitle>
              </DrawerHeader>
              <nav className="flex flex-col gap-2 p-4">
                {routes.map((route, i) => {
                  const IconComponent = route.icon;
                  return (
                    <DrawerClose key={i} asChild>
                      <Button
                        variant={
                          pathname.includes(route.href) ? "secondary" : "ghost"
                        }
                        className="w-full justify-start"
                        asChild
                      >
                        <Link href={route.href}>
                          <IconComponent className="mr-2 h-5 w-5" />
                          {route.label}
                        </Link>
                      </Button>
                    </DrawerClose>
                  );
                })}
                <DrawerClose asChild>
                  <Button
                    variant={
                      pathname.includes("/perfil") ? "secondary" : "ghost"
                    }
                    className="w-full justify-start"
                    asChild
                  >
                    <Link href="/perfil">
                      <div className="relative mr-2 h-5 w-5 overflow-hidden rounded-full bg-muted">
                        <Image
                          src={session.data?.user?.image ?? "/img/profile.png"}
                          alt="Profile"
                          fill
                          className="object-cover"
                          sizes="20px"
                        />
                      </div>
                      Perfil
                    </Link>
                  </Button>
                </DrawerClose>

                {/* Theme Toggle */}
                {mounted && (
                  <div className="flex items-center justify-between rounded-md px-4 py-2">
                    <div className="flex items-center">
                      <div className="relative mr-2 h-5 w-5">
                        <Sun className="absolute inset-0 h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute inset-0 h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                      </div>
                      <span className="text-sm font-medium">Tema</span>
                    </div>
                    <Switch
                      checked={theme === "dark"}
                      onCheckedChange={(checked) =>
                        setTheme(checked ? "dark" : "light")
                      }
                    />
                  </div>
                )}
              </nav>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
