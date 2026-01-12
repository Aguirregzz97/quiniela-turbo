"use client";

import { usePathname } from "next/navigation";

export default function MainContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Full-width layout for auth pages
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
    return <>{children}</>;
  }

  // Normal layout with sidebar margins
  return (
    <main className="ml-0 mt-14 md:ml-72 md:mt-0">{children}</main>
  );
}

