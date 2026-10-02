import { NextResponse } from "next/server";
import { getModel, isAiConfigured } from "@/lib/server/groq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tells the UI whether AI features are available. Never returns the key itself. */
export function GET() {
  return NextResponse.json(
    { aiConfigured: isAiConfigured(), model: isAiConfigured() ? getModel() : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
