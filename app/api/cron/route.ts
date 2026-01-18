import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Root cron job that orchestrates multiple tasks
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Results object to track all jobs
  const results: Record<string, { success: boolean; data?: unknown; error?: string }> = {};

  // Helper to call internal routes
  async function callJob(name: string, path: string) {
    try {
      console.log(`[Cron] Starting job: ${name}`);
      const response = await fetch(`${baseUrl}${path}`, {
        method: "GET",
        headers: authHeader ? { authorization: authHeader } : {},
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Cron] Job ${name} failed:`, errorText);
        results[name] = { success: false, error: errorText };
      } else {
        const data = await response.json();
        console.log(`[Cron] Job ${name} completed:`, data);
        results[name] = { success: true, data };
      }
    } catch (error) {
      console.error(`[Cron] Job ${name} error:`, error);
      results[name] = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  console.log("[Cron] Starting all cron jobs...");

  // Run all jobs (can be run in parallel or sequentially)
  await Promise.all([
    callJob("predictions-reminder", "/api/cron/send-predictions-reminder"),
    callJob("survivor-reminder", "/api/cron/send-survivor-reminder"),
  ]);

  console.log("[Cron] All jobs completed:", results);

  // Check if any job failed
  const allSuccessful = Object.values(results).every((r) => r.success);

  return NextResponse.json(
    {
      success: allSuccessful,
      timestamp: new Date().toISOString(),
      jobs: results,
    },
    { status: allSuccessful ? 200 : 207 }, // 207 Multi-Status if some failed
  );
}

