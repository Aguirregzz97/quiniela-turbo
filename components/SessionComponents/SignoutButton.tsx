"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function SignoutButton() {
  return <Button variant="default" onClick={() => signOut()}>Sign Out</Button>;
}
