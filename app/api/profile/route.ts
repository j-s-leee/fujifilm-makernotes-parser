import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@/lib/supabase/server";
import { r2, R2_BUCKET } from "@/lib/r2";

function resolveAvatarUrl(
  avatarPath: string | null | undefined,
  oauthAvatarUrl: string | null,
): string | null {
  if (!avatarPath) return oauthAvatarUrl;
  if (avatarPath.startsWith("http")) return avatarPath;
  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
  return `${r2PublicUrl}/${avatarPath}`;
}

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
    .select("display_name, username, avatar_path, agreed_to_terms_at")
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
        avatar_path: user.user_metadata?.avatar_url ?? null,
      })
      .select("display_name, username, avatar_path, agreed_to_terms_at")
      .single();

    profile = inserted;
  }

  const oauthAvatarUrl = user.user_metadata?.avatar_url ?? null;
  const avatarUrl = resolveAvatarUrl(profile?.avatar_path, oauthAvatarUrl);

  return NextResponse.json({
    display_name: profile?.display_name ?? null,
    username: profile?.username ?? null,
    avatar_url: avatarUrl,
    agreed_to_terms_at: profile?.agreed_to_terms_at ?? null,
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
  const username = formData.get("username") as string | null;
  const avatarFile = formData.get("avatar") as File | null;
  const agreedToTerms = formData.get("agreed_to_terms") as string | null;

  let avatarPath: string | undefined;

  if (avatarFile && avatarFile.size > 0) {
    // Fetch current avatar_path to delete old file later
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("avatar_path")
      .eq("id", user.id)
      .single();

    const oldAvatarPath = currentProfile?.avatar_path;

    const ext = avatarFile.name.split(".").pop() ?? "jpg";
    avatarPath = `avatars/${user.id}/${Date.now()}.${ext}`;

    const buffer = Buffer.from(await avatarFile.arrayBuffer());

    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: avatarPath,
        Body: buffer,
        ContentType: avatarFile.type,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    // Delete old avatar from R2 (only if it's an R2 path, not an external URL)
    if (oldAvatarPath && !oldAvatarPath.startsWith("http")) {
      r2.send(
        new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldAvatarPath }),
      ).catch(() => {});
    }
  }

  const updateData: Record<string, unknown> = {
    display_name: displayName,
    updated_at: new Date().toISOString(),
  };

  if (username !== undefined) {
    // Validate: lowercase, alphanumeric + underscore, 3-30 chars, not numeric-only, not UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    if (
      username &&
      (!/^[a-z0-9_]{3,30}$/.test(username) ||
        /^\d+$/.test(username) ||
        uuidPattern.test(username))
    ) {
      return NextResponse.json(
        { error: "Username must be 3-30 characters, lowercase letters, numbers, and underscores only. Cannot be numbers only." },
        { status: 400 },
      );
    }
    updateData.username = username || null;
  }

  if (avatarPath) {
    updateData.avatar_path = avatarPath;
  }

  if (agreedToTerms === "true") {
    updateData.agreed_to_terms_at = new Date().toISOString();
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id)
    .select("display_name, username, avatar_path, agreed_to_terms_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }

  const oauthAvatarUrl = user.user_metadata?.avatar_url ?? null;
  const avatarUrl = resolveAvatarUrl(profile?.avatar_path, oauthAvatarUrl);

  return NextResponse.json({
    display_name: profile?.display_name ?? null,
    username: profile?.username ?? null,
    avatar_url: avatarUrl,
    agreed_to_terms_at: profile?.agreed_to_terms_at ?? null,
  });
}
