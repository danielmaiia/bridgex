
import { NextRequest, NextResponse } from "next/server";
import { matchScore } from "@/lib/tfidf";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userProfile, tasks } = body as {
    userProfile: string;
    tasks: { id: string; text: string }[];
  };

  const scored = tasks.map((t) => ({
    id: t.id,
    score: matchScore(userProfile, t.text)
  }));

  scored.sort((a, b) => b.score - a.score);

  return NextResponse.json({ matches: scored });
}
