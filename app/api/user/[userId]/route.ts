import getUser from "@/lib/user/getUser";
import { NextResponse } from "next/server";

export async function GET(request: Request, context: any) {
  const { params } = context;
  const { userId } = params;
  const user = await getUser(userId);
  return NextResponse.json(user);
}
