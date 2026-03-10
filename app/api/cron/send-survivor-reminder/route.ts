import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

import { db } from "@/db";
import { users } from "@/db/schema";
import {
  analyzeUserSurvivorPicks,
  generateSurvivorEmailHtml,
} from "@/lib/cron/survivor-reminder";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Survivor Reminder] Starting cron job...");

    const allUsers = await db.select().from(users);

    let emailsSent = 0;
    let emailsFailed = 0;
    let usersProcessed = 0;

    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    const onlySendEmailsTo = process.env.ONLY_SEND_EMAILS_TO;
    if (onlySendEmailsTo) {
      console.log(
        `[Survivor Reminder] ONLY_SEND_EMAILS_TO is set: ${onlySendEmailsTo}`,
      );
    }

    for (const user of allUsers) {
      if (!user.email) continue;
      if (onlySendEmailsTo && user.email !== onlySendEmailsTo) continue;

      usersProcessed++;

      const analysis = await analyzeUserSurvivorPicks(user.id);

      if (analysis.missingSurvivorPicks.length === 0) {
        console.log(
          `[Survivor Reminder] ${user.email} — no missing picks`,
        );
        continue;
      }

      console.log(
        `[Survivor Reminder] ${user.email} — ${analysis.missingSurvivorPicks.length} survivor games need picks`,
      );

      const emailHtml = generateSurvivorEmailHtml(
        user.name || "Usuario",
        analysis.missingSurvivorPicks,
      );

      try {
        const count = analysis.missingSurvivorPicks.length;
        const result = await resend.emails.send({
          from: "Quiniela Turbo <noreply@quinielaturbo.com>",
          to: user.email,
          subject: `⚔️ Elige tu equipo en ${count} Survivor${count > 1 ? "s" : ""}`,
          html: emailHtml,
          replyTo: "quinielaturbo1@gmail.com",
        });

        if (result.error) {
          console.error(
            `[Survivor Reminder] Failed to send to ${user.email}:`,
            result.error,
          );
          emailsFailed++;
        } else {
          console.log(
            `[Survivor Reminder] Sent to ${user.email}, id: ${result.data?.id}`,
          );
          emailsSent++;
        }

        // Throttle to stay under Resend's 2 req/s rate limit
        await sleep(600);
      } catch (emailError) {
        console.error(
          `[Survivor Reminder] Error sending to ${user.email}:`,
          emailError,
        );
        emailsFailed++;
      }
    }

    console.log(
      `[Survivor Reminder] Done. Processed ${usersProcessed} users, sent ${emailsSent} emails.`,
    );

    return NextResponse.json({
      success: true,
      usersProcessed,
      emailsSent,
      emailsFailed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Survivor Reminder] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to process survivor reminder",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
