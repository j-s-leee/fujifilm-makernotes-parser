import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@/lib/supabase/server";
import { r2, R2_BUCKET } from "@/lib/r2";
import { revalidateOnProfileUpdated } from "@/lib/actions/revalidate";

const PROFILE_COLUMNS =
  "display_name, username, avatar_path, agreed_to_terms_at, instagram_url, youtube_url, blog_url";

function resolveAvatarUrl(
  avatarPath: string | null | undefined,
  oauthAvatarUrl: string | null,
): string | null {
  if (!avatarPath) return oauthAvatarUrl;
  if (avatarPath.startsWith("http")) return avatarPath;
  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
  return `${r2PublicUrl}/${avatarPath}`;
}

/** Empty/missing -> clear the field. Non-empty -> must be http(s):// and reasonably short. */
function parseSnsUrl(raw: string | null): { value: string | null } | { error: true } {
  if (!raw) return { value: null };
  if (!/^https?:\/\/.{1,290}$/.test(raw)) return { error: true };
  return { value: raw };
}

const INSTAGRAM_HANDLE_RE = /^[A-Za-z0-9._]{1,30}$/;
const YOUTUBE_HANDLE_RE = /^[A-Za-z0-9._-]{3,30}$/;

/** Recover a bare handle from a pasted profile URL, or pass through a plain handle. */
function extractHandle(raw: string): string {
  let value = raw.trim();
  if (/^https?:\/\//i.test(value)) {
    try {
      const segments = new URL(value).pathname.split("/").filter(Boolean);
      value = segments[segments.length - 1] ?? "";
    } catch {
      // malformed URL; fall through so the handle regex rejects it below
    }
  }
  return value.replace(/^@/, "");
}

function parseInstagramHandle(raw: string | null): { value: string | null } | { error: true } {
  if (!raw) return { value: null };
  const handle = extractHandle(raw);
  if (!INSTAGRAM_HANDLE_RE.test(handle)) return { error: true };
  return { value: `https://instagram.com/${handle}` };
}

function parseYoutubeHandle(raw: string | null): { value: string | null } | { error: true } {
  if (!raw) return { value: null };
  const handle = extractHandle(raw);
  if (!YOUTUBE_HANDLE_RE.test(handle)) return { error: true };
  return { value: `https://youtube.com/@${handle}` };
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
    .select(PROFILE_COLUMNS)
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
      .select(PROFILE_COLUMNS)
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
    instagram_handle: profile?.instagram_url ? extractHandle(profile.instagram_url) : null,
    youtube_handle: profile?.youtube_url ? extractHandle(profile.youtube_url) : null,
    blog_url: profile?.blog_url ?? null,
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

  // Fetch current profile for old avatar cleanup and old username revalidation
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("avatar_path, username")
    .eq("id", user.id)
    .single();

  let avatarPath: string | undefined;

  if (avatarFile && avatarFile.size > 0) {
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

  const instagramParsed = parseInstagramHandle(formData.get("instagram_handle") as string | null);
  if ("error" in instagramParsed) {
    return NextResponse.json(
      { error: "Instagram handle must be 1-30 characters: letters, numbers, periods, or underscores." },
      { status: 400 },
    );
  }
  updateData.instagram_url = instagramParsed.value;

  const youtubeParsed = parseYoutubeHandle(formData.get("youtube_handle") as string | null);
  if ("error" in youtubeParsed) {
    return NextResponse.json(
      { error: "YouTube handle must be 3-30 characters: letters, numbers, periods, underscores, or hyphens." },
      { status: 400 },
    );
  }
  updateData.youtube_url = youtubeParsed.value;

  const blogParsed = parseSnsUrl(formData.get("blog_url") as string | null);
  if ("error" in blogParsed) {
    return NextResponse.json(
      { error: "Blog link must be a valid URL starting with http:// or https://" },
      { status: 400 },
    );
  }
  updateData.blog_url = blogParsed.value;

  const { data: profile, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id)
    .select(PROFILE_COLUMNS)
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

  // Revalidate cached pages that show this user's profile data
  const oldUsername = currentProfile?.username ?? null;
  revalidateOnProfileUpdated({
    userId: user.id,
    username: profile?.username ?? null,
    oldUsername: oldUsername !== (profile?.username ?? null) ? oldUsername : null,
  });

  return NextResponse.json({
    display_name: profile?.display_name ?? null,
    username: profile?.username ?? null,
    avatar_url: avatarUrl,
    agreed_to_terms_at: profile?.agreed_to_terms_at ?? null,
    instagram_handle: profile?.instagram_url ? extractHandle(profile.instagram_url) : null,
    youtube_handle: profile?.youtube_url ? extractHandle(profile.youtube_url) : null,
    blog_url: profile?.blog_url ?? null,
  });
}
