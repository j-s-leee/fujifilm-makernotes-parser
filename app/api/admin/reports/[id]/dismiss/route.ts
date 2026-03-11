import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const reportId = Number(id);

  if (Number.isNaN(reportId)) {
    return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
  }

  const { error } = await supabase
    .from("reports")
    .delete()
    .eq("id", reportId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to dismiss report" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
