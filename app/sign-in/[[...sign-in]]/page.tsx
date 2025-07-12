"use client";

import useUser from "@/queries/user/useUser";

export default function Page() {
  const user = useUser("12345");

  return <div className="mt-8 flex min-h-screen justify-center">sign in</div>;
}
