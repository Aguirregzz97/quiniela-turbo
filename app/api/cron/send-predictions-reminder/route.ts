import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

import { db } from "@/db";
import { users } from "@/db/schema";
import {
  analyzeUserPredictions,
  generatePredictionsEmailHtml,
} from "@/lib/cron/predictions-reminder";

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

    console.log("[Predictions Reminder] Starting cron job...");

    const allUsers = await db.select().from(users);

    let emailsSent = 0;
    let usersProcessed = 0;

    const onlySendEmailsTo = process.env.ONLY_SEND_EMAILS_TO;
    if (onlySendEmailsTo) {
      console.log(
        `[Predictions Reminder] ONLY_SEND_EMAILS_TO is set: ${onlySendEmailsTo}`,
      );
    }

    const skipDateCheck = process.env.SKIP_MATCH_DATE_CHECK === "true";

    for (const user of allUsers) {
      if (!user.email) continue;
      if (onlySendEmailsTo && user.email !== onlySendEmailsTo) continue;

      usersProcessed++;

      const analysis = await analyzeUserPredictions(user.id, skipDateCheck);

      if (analysis.missingPredictions.length === 0) {
        console.log(
          `[Predictions Reminder] ${user.email} — no missing predictions`,
        );
        continue;
      }

      console.log(
        `[Predictions Reminder] ${user.email} — ${analysis.missingPredictions.length} missing predictions`,
      );

      const emailHtml = generatePredictionsEmailHtml(
        user.name || "Usuario",
        analysis.missingPredictions,
      );

      try {
        const count = analysis.missingPredictions.length;
        const result = await resend.emails.send({
          from: "Quiniela Turbo <noreply@quinielaturbo.com>",
          to: user.email,
          subject: `⚽ Tienes ${count} pronóstico${count > 1 ? "s" : ""} pendiente${count > 1 ? "s" : ""}`,
          html: emailHtml,
          replyTo: "quinielaturbo1@gmail.com",
        });

        if (result.error) {
          console.error(
            `[Predictions Reminder] Failed to send to ${user.email}:`,
            result.error,
          );
        } else {
          console.log(
            `[Predictions Reminder] Sent to ${user.email}, id: ${result.data?.id}`,
          );
          emailsSent++;
        }
      } catch (emailError) {
        console.error(
          `[Predictions Reminder] Error sending to ${user.email}:`,
          emailError,
        );
      }
    }

    console.log(
      `[Predictions Reminder] Done. Processed ${usersProcessed} users, sent ${emailsSent} emails.`,
    );

    return NextResponse.json({
      success: true,
      usersProcessed,
      emailsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Predictions Reminder] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to process predictions reminder",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
