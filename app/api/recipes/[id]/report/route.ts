import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_REASONS = ["inappropriate", "spam", "copyright", "other"] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const recipeId = Number(id);

  if (Number.isNaN(recipeId)) {
    return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
  }

  const body = await request.json();
  const { reason, detail } = body as { reason: string; detail?: string };

  if (!VALID_REASONS.includes(reason as (typeof VALID_REASONS)[number])) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }

  const { error } = await supabase.from("reports").insert({
    user_id: user.id,
    recipe_id: recipeId,
    reason,
    detail: detail || null,
  });

  if (error) {
    // Unique constraint violation — user already reported this recipe
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Already reported" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to submit report" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
