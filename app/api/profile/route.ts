import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@/lib/supabase/server";
import { r2, R2_BUCKET } from "@/lib/r2";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_path")
    .eq("id", user.id)
    .single();

  if (!profile) {
    const defaultName =
      user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;

    const { data: inserted } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        display_name: defaultName,
        avatar_path: null,
      })
      .select("display_name, avatar_path")
      .single();

    profile = inserted;
  }

  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
  const oauthAvatarUrl = user.user_metadata?.avatar_url ?? null;

  const avatarUrl = profile?.avatar_path
    ? `${r2PublicUrl}/${profile.avatar_path}`
    : oauthAvatarUrl;

  return NextResponse.json({
    display_name: profile?.display_name ?? null,
    avatar_url: avatarUrl,
  });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const displayName = formData.get("display_name") as string | null;
  const avatarFile = formData.get("avatar") as File | null;

  let avatarPath: string | undefined;

  if (avatarFile && avatarFile.size > 0) {
    const ext = avatarFile.name.split(".").pop() ?? "jpg";
    avatarPath = `avatars/${user.id}/${Date.now()}.${ext}`;

    const buffer = Buffer.from(await avatarFile.arrayBuffer());

    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: avatarPath,
        Body: buffer,
        ContentType: avatarFile.type,
      }),
    );
  }

  const updateData: Record<string, unknown> = {
    display_name: displayName,
    updated_at: new Date().toISOString(),
  };

  if (avatarPath) {
    updateData.avatar_path = avatarPath;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id)
    .select("display_name, avatar_path")
    .single();

  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
  const oauthAvatarUrl = user.user_metadata?.avatar_url ?? null;

  const avatarUrl = profile?.avatar_path
    ? `${r2PublicUrl}/${profile.avatar_path}`
    : oauthAvatarUrl;

  return NextResponse.json({
    display_name: profile?.display_name ?? null,
    avatar_url: avatarUrl,
  });
}
