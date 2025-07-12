"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "../ui/button";
import { Home, Navigation } from "lucide-react";
import ProfileButton from "./ProfileButton";

const Sidebar = () => {
  const pathname = usePathname();

  const routes = [
    {
      href: "/test-nav",
      label: "Test Nav",
      icon: Navigation,
    },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="fixed left-0 top-0 hidden h-full w-64 flex-col border-r border-border bg-card text-card-foreground md:flex">
        {/* Top Section - Logo */}
        <div className="border-b border-border p-6">
          <Link
            href="/"
            className="flex items-center space-x-2 text-foreground hover:text-foreground/80"
          >
            <Home className="h-6 w-6" />
            <h1 className="text-xl font-bold">QUINIELA TURBO</h1>
          </Link>
        </div>

        {/* Middle Section - Navigation Routes */}
        <div className="flex-1 p-4">
          <nav className="space-y-2">
            {routes.map((route, i) => (
              <Button
                key={i}
                variant={pathname.includes(route.href) ? "secondary" : "ghost"}
                className="w-full justify-start text-foreground hover:text-foreground/80"
                asChild
              >
                <Link href={route.href}>{route.label}</Link>
              </Button>
            ))}
          </nav>
        </div>

        {/* Bottom Section - User Controls */}
        <div className="space-y-2 border-t border-border p-4">
          {/* Profile Button */}
          <div className="flex items-center space-x-2">
            <ProfileButton isComputer={true} />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card text-card-foreground md:hidden">
        <div className="flex items-center justify-around p-2">
          {/* Home */}
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center text-foreground hover:text-foreground/80"
            asChild
          >
            <Link href="/">
              <Home />
            </Link>
          </Button>

          {/* Navigation Routes */}
          {routes.map((route, i) => {
            const IconComponent = route.icon;
            return (
              <Button
                key={i}
                variant={pathname.includes(route.href) ? "secondary" : "ghost"}
                size="sm"
                className="flex flex-col items-center space-y-1 text-foreground hover:text-foreground/80"
                asChild
              >
                <Link href={route.href}>
                  <IconComponent className="h-6 w-6" />
                </Link>
              </Button>
            );
          })}

          {/* Profile */}
          <div>
            <ProfileButton />
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
