import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/db";

export default async function getUser(userId: string) {
  return await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
}

export type GetUserType = Awaited<ReturnType<typeof getUser>>;
