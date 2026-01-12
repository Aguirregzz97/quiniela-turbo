"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const COLLAPSE_BREAKPOINT = 1200;

export default function MainContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const checkWidth = () => {
      // Default to collapsed on narrow screens
      if (window.innerWidth < COLLAPSE_BREAKPOINT) {
        setSidebarCollapsed(true);
      }
    };

    // Listen for custom event from sidebar toggle
    const handleSidebarToggle = (e: CustomEvent<{ collapsed: boolean }>) => {
      setSidebarCollapsed(e.detail.collapsed);
    };

    checkWidth();
    window.addEventListener("resize", checkWidth);
    window.addEventListener(
      "sidebarToggle",
      handleSidebarToggle as EventListener
    );

    return () => {
      window.removeEventListener("resize", checkWidth);
      window.removeEventListener(
        "sidebarToggle",
        handleSidebarToggle as EventListener
      );
    };
  }, []);

  // Full-width layout for auth pages
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
    return <>{children}</>;
  }

  // Normal layout with sidebar margins
  // Sidebar is 72px when collapsed, 288px (w-72) when expanded
  return (
    <main
      className={`ml-0 mt-14 transition-[margin] duration-300 md:mt-0 ${
        sidebarCollapsed ? "md:ml-[72px]" : "md:ml-72"
      }`}
    >
      {children}
    </main>
  );
}

