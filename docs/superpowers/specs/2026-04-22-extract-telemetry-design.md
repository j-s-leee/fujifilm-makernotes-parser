# Extract Telemetry — Design Spec

**Date:** 2026-04-22
**Status:** Approved, ready for implementation planning
**Scope:** Single workstream. Cookie consent banner / CMP is explicitly out of scope and will be a separate spec.

## 1. Motivation

The service now has visitors, and the founder wants to know:

1. **Conversion funnel** — of people who extract a recipe, how many actually share it?
2. **Popular recipes** — which simulation + parameter combinations are most commonly shot?
3. **Camera / lens ecosystem** — which bodies and glass are visiting the site?

Today, recipe parsing runs 100% client-side (`components/upload-recipe-modal.tsx`). Extracted data only reaches the server if the user clicks **Upload**. Everyone who views-but-doesn't-share is invisible to the server.

This spec adds an **anonymous-by-default, logged-in-by-account telemetry event** that fires every time parsing succeeds, independent of whether the user eventually shares.

## 2. Decisions (summary)

| Question | Decision |
|---|---|
| What data to answer? | All three goals above |
| Consent posture | Privacy policy update; no new cookie banner dependency |
| Identity linkage | `user_id` for authenticated users; fully stateless for anonymous (no session ID, no localStorage) |
| When to record | On every successful parse, fire-and-forget |
| How to view stats | Supabase dashboard SQL queries (no admin UI in this phase) |
| Deployment | Supabase MCP `apply_migration` against dev → verify → prod |

## 3. Architecture

```
User drops photo
  → Browser exifr parse success → FujifilmRecipe object
    → sendExtractTelemetry() (fire-and-forget)
      → POST /api/extract-telemetry
        → Rate limit by IP hash (not persisted)
        → Zod validation
        → Resolve user_id from session (optional)
        → Resolve simulation_id / camera_model_id / wb_type_id / lens_id (service_role)
        → INSERT extract_events
        → 204 No Content
```

**New / modified surface area:**

- New migration: `supabase/migrations/20260422000000_extract_telemetry.sql`
- New API route: `app/api/extract-telemetry/route.ts`
- New client helper: `lib/extract-telemetry.ts`
- New Zod schema: `lib/extract-telemetry-schema.ts`
- Modified: `components/upload-recipe-modal.tsx` (one call site after successful parse)
- Modified: `content/legal/privacy.ko.md`, `content/legal/privacy.en.md`
- New ops doc: `docs/ops/extract-telemetry-queries.md`
- Optional: one-time "privacy policy updated" notification banner (details in §6)

**Unchanged:** `recipes` table, share flow, RLS on existing tables, recommendation logic, upload pipeline, R2 storage.

## 4. Data Model

### Migration `20260422000000_extract_telemetry.sql`

```sql
CREATE TABLE public.extract_events (
  id                        bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id                   uuid       REFERENCES auth.users(id) ON DELETE SET NULL,
  simulation_id             smallint   REFERENCES public.simulations(id),
  camera_model_id           smallint   REFERENCES public.camera_models(id),
  lens_id                   smallint   REFERENCES public.lenses(id),
  wb_type_id                smallint   REFERENCES public.wb_types(id),

  grain_roughness           public.weak_strong,
  grain_size                public.grain_size_enum,
  color_chrome              public.weak_strong,
  color_chrome_fx_blue      public.weak_strong,
  wb_color_temperature      integer,
  wb_red                    integer,
  wb_blue                   integer,
  dynamic_range_setting     public.dr_setting,
  dynamic_range_development integer,
  highlight                 integer,
  shadow                    integer,
  color                     integer,
  sharpness                 integer,
  noise_reduction           integer,
  clarity                   integer,
  bw_adjustment             integer,
  bw_magenta_green          integer,

  recipe_hash               text,
  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX extract_events_created_at_idx      ON public.extract_events (created_at DESC);
CREATE INDEX extract_events_recipe_hash_idx     ON public.extract_events (recipe_hash);
CREATE INDEX extract_events_user_id_idx         ON public.extract_events (user_id);
CREATE INDEX extract_events_simulation_id_idx   ON public.extract_events (simulation_id);
CREATE INDEX extract_events_camera_model_id_idx ON public.extract_events (camera_model_id);

ALTER TABLE public.extract_events ENABLE ROW LEVEL SECURITY;
-- No SELECT policy: dashboard reads bypass RLS via service_role
-- No INSERT policy: API route writes via service_role
```

**Design notes**

- Columns mirror `recipes` names and types exactly → JOINs and comparisons are natural.
- FKs only for closed-set lookups (`simulations`, `camera_models`, `wb_types`). Unknown values become NULL — we still record the event.
- `lenses` is open-ended. The API route uses `service_role` to do find-or-insert and attaches the FK.
- **Deliberately not stored:** IP address, User-Agent, session ID, locale, referrer, photo bytes, embeddings, color histogram.
- **Retention:** unlimited initially. Partitioning / archiving is a follow-up once volume warrants.
- RLS enabled with zero policies. All writes and reads go through server-side code holding `service_role`.

## 5. API Contract

**Endpoint:** `POST /api/extract-telemetry`

**Request body:**

```jsonc
{
  "simulation": "classic-chrome",     // slug | null
  "camera_model": "X-T5",             // raw EXIF Make+Model; "FUJIFILM " prefix stripped server-side | null
  "lens_model": "XF35mmF1.4 R",       // raw EXIF LensModel | null
  "recipe": {
    "grain_roughness": "weak",        // enum | null
    "grain_size": "small",            // enum | null
    "color_chrome": "off",            // enum | null
    "color_chrome_fx_blue": "off",    // enum | null
    "wb": {
      "type": "daylight",
      "color_temperature": null,
      "red": 2,
      "blue": -1
    },
    "dynamic_range_setting": "auto",
    "dynamic_range_development": 400,
    "highlight": -1,
    "shadow": 2,
    "color": 0,
    "sharpness": 0,
    "noise_reduction": 0,
    "clarity": 0,
    "bw_adjustment": null,
    "bw_magenta_green": null
  }
}
```

**Response:** `204 No Content` always — success, validation failure, rate limited, and internal error all return 204. The client uses `sendBeacon` which ignores the body; surfacing errors would serve no purpose and risks leaking timing info.

**Handler flow:**

1. Rate limit check via `lib/rate-limit.ts` (Upstash Redis sliding window). Identifier = authenticated `user_id` if present, otherwise `hashIp(clientIp)`. Raw IP stays in request scope; only the bucket hash reaches Redis.
2. Parse JSON body; validate against Zod schema in `lib/extract-telemetry-schema.ts`. Failure → silently drop.
3. `supabase.auth.getUser()` from cookie. Capture `user_id` if present; otherwise null.
4. Resolve FKs in parallel:
   - `simulations.slug → id`
   - `camera_models.name → id` (after stripping `/^FUJIFILM\s*/i`)
   - `wb_types.slug → id`
   - `lenses.name → id` via find-or-insert (trim; reject empty / unreasonable strings)
5. Compute `recipe_hash` using the existing `computeRecipeHash` helper — same algorithm as `recipes` so JOINs by hash work.
6. INSERT into `extract_events`. Failure → log server-side, still return 204.

**Rate limiting:** 60 requests / minute / identifier. Adds a new preset to `lib/rate-limit.ts`'s `rateLimits` map:

```ts
extractTelemetry: (userId: string) =>
  checkRateLimit("telemetry:extract", userId, 60, "1 m"),

anonExtractTelemetry: (hashedIp: string) =>
  checkRateLimit("telemetry:extract:anon", hashedIp, 60, "1 m"),
```

When Upstash env vars are missing (local dev without Redis), `checkRateLimit` returns `{ limited: false }` and the route behaves as if unlimited — matching existing endpoints' behavior.

## 6. Client Integration

### New file: `lib/extract-telemetry.ts`

Exports `sendExtractTelemetry(recipe, simulation, cameraModel, lensModel)`:

- Flattens `FujifilmRecipe` into the API request shape.
- Module-level `Set<string>` dedupes within the tab's lifetime (no localStorage / cookie → no ePrivacy impact).
- Prefers `navigator.sendBeacon`; falls back to `fetch(..., { keepalive: true })`.
- All errors swallowed. No console noise, no UX impact.

### Modification: `components/upload-recipe-modal.tsx`

In the parsing `useEffect` (around lines 200–252), after `setRecipe(parsedRecipe)` inside the successful-parse branch, call:

```ts
sendExtractTelemetry(
  parsedRecipe,
  parsedSim ?? null,
  exifrData.Make && exifrData.Model ? `${exifrData.Make} ${exifrData.Model}`.trim() : null,
  exifrData.LensModel ?? null,
);
```

The current code calls `getFujifilmRecipeFromMakerNote` inline inside `setRecipe(...)`. Lift that call into a local `parsedRecipe` variable so the same object can be passed to both `setRecipe` and `sendExtractTelemetry`.

### Policy update notification banner (one-time)

Show a slim top banner starting 2026-04-22 (공고일), with text such as:

> "개인정보취급방침이 변경됩니다 (시행: 4월 29일). 자세히 보기 →"

Dismissible; link goes to `/privacy`. Article §10 requires notice at 공고일, not 시행일, so the banner must appear from 4/22 onward.

**Persistence:** a single boolean flag in `localStorage`, keyed by the effective date so future policy updates automatically re-show the banner:

```
key: `privacy_policy_seen:2026-04-29`
value: "1"
```

This is "strictly necessary" for fulfilling §10, not a tracking/marketing cookie — it does not require the cookie consent banner that's coming in the next workstream.

**Retention of banner code:** after ~30 days (say 2026-05-29) the banner can be removed in a small follow-up PR, or left to naturally expire when the next policy update changes the key.

## 7. Privacy Policy Updates

Edit `content/legal/privacy.ko.md` and mirror in `privacy.en.md`.

### §1 — add to "선택 수집 정보"

```
이용 통계 분석 정보(사진에서 추출한 촬영 설정 값 — 필름 시뮬레이션 종류,
카메라·렌즈 모델명, 화이트밸런스·그레인·톤·샤프니스 등 레시피 파라미터.
사진 이미지 자체와 IP 주소, 기기 식별자는 저장되지 않습니다.)
```

### §2 — new sub-item "마"

```
**마. 서비스 품질 개선을 위한 익명 이용 통계**

"회사"는 사진 분석 기능의 이용 현황을 집계하여 인기 있는 레시피를 파악하고
서비스 품질을 개선하기 위해, 사진에서 추출한 촬영 설정 값을 수집·분석합니다.
이 과정에서 사진 이미지, IP 주소, 기기 식별자는 저장되지 않으며, 비로그인
방문자의 경우 어떠한 개인 식별자도 부착되지 않은 채 집계됩니다. 로그인한
"회원"의 경우 계정 ID와 연결될 수 있으나, 집계 분석 외의 용도로는
활용되지 않습니다.
```

### Effective date footer

```diff
- - 공고일자: 2026년 3월 14일
- - 시행일자: 2026년 3월 14일
+ - 공고일자: 2026년 4월 22일
+ - 시행일자: 2026년 4월 29일
```

This is a 7-day notice under §10 (standard change, not a "material change to member rights"). The collection is anonymous/aggregate in nature and does not establish a new personal data category for anonymous users.

## 8. Analytics Queries

Authoritative copy lives in `docs/ops/extract-telemetry-queries.md`. Reproduced here for review.

### ① Overall conversion rate

```sql
SELECT
  (SELECT count(*) FROM extract_events) AS total_extracts,
  (SELECT count(*) FROM recipes WHERE deleted_at IS NULL) AS total_shares,
  round(100.0 *
    (SELECT count(*) FROM recipes WHERE deleted_at IS NULL)::numeric /
    nullif((SELECT count(*) FROM extract_events), 0),
    2) AS share_rate_pct;
```

### ② Daily extract volume

```sql
SELECT date_trunc('day', created_at)::date AS day,
       count(*) AS extracts
FROM extract_events
GROUP BY 1 ORDER BY 1 DESC LIMIT 30;
```

### ③ Popular simulations

```sql
SELECT s.slug, count(*) AS extracts
FROM extract_events e
JOIN simulations s ON s.id = e.simulation_id
GROUP BY s.slug
ORDER BY extracts DESC;
```

### ④ Top recipes by hash

```sql
SELECT e.recipe_hash,
       max(s.slug)        AS simulation,
       max(e.highlight)   AS highlight,
       max(e.shadow)      AS shadow,
       max(e.color)       AS color,
       max(e.sharpness)   AS sharpness,
       count(*)           AS extracts
FROM extract_events e
LEFT JOIN simulations s ON s.id = e.simulation_id
WHERE e.recipe_hash IS NOT NULL
GROUP BY e.recipe_hash
ORDER BY extracts DESC
LIMIT 20;
```

### ⑤ Camera ecosystem

```sql
SELECT cm.name, cm.sensor_generation, count(*) AS extracts
FROM extract_events e
JOIN camera_models cm ON cm.id = e.camera_model_id
GROUP BY cm.name, cm.sensor_generation
ORDER BY extracts DESC;
```

### ⑥ Lens popularity

```sql
SELECT l.name, count(*) AS extracts
FROM extract_events e
JOIN lenses l ON l.id = e.lens_id
GROUP BY l.name
ORDER BY extracts DESC
LIMIT 30;
```

### ⑦ Per-user funnel (authenticated users)

```sql
WITH ue AS (
  SELECT user_id, recipe_hash
  FROM extract_events
  WHERE user_id IS NOT NULL AND recipe_hash IS NOT NULL
),
us AS (
  SELECT user_id, recipe_hash
  FROM recipes
  WHERE user_id IS NOT NULL AND deleted_at IS NULL
)
SELECT ue.user_id,
       count(DISTINCT ue.recipe_hash) AS unique_extracted,
       count(DISTINCT us.recipe_hash) AS unique_shared,
       round(100.0 * count(DISTINCT us.recipe_hash)::numeric
             / nullif(count(DISTINCT ue.recipe_hash), 0), 1) AS share_rate_pct
FROM ue LEFT JOIN us
  ON us.user_id = ue.user_id AND us.recipe_hash = ue.recipe_hash
GROUP BY ue.user_id
ORDER BY unique_extracted DESC
LIMIT 30;
```

## 9. Deployment

Uses the Supabase MCP server (installed, OAuth pending). Sequence strictly follows the CLAUDE.md rule "DB first, code second".

1. Commit the `.sql` file to `supabase/migrations/`. The file stays the source of truth; MCP just applies it to the remote project.
2. `mcp__plugin_supabase_supabase__authenticate` → browser OAuth → `complete_authentication`.
3. `list_projects` → identify dev `project_ref` and prod `project_ref` explicitly.
4. `apply_migration(project_ref=dev, name="extract_telemetry", sql=<file contents>)`.
5. Verify with `execute_sql(project_ref=dev, sql="...")`: describe the table, run a test INSERT + SELECT, then roll back.
6. `apply_migration(project_ref=prod, name="extract_telemetry", sql=<file contents>)`.
7. Verify prod the same way.
8. Merge the code PR → Vercel deploys the API route and client integration.

**Safety rules for MCP**

- Re-confirm `project_ref` immediately before any prod write. MCP has no physical "link" step so both environments are always reachable; the gate is human attention.
- Never hand-write SQL directly into `apply_migration`. Always apply the reviewed file content verbatim.
- Destructive operations still follow the CLAUDE.md 2-step deploy table — this spec has none.

## 10. Rate Limiting

- 60 req / min per identifier, via `lib/rate-limit.ts` (Upstash Redis sliding window).
- Authenticated identifier: `user_id` from the Supabase session.
- Anonymous identifier: the bucket hash produced by the existing `hashIp()` helper — a non-reversible DJB2-style hash already used by the anonymous recommend endpoints. Raw IP never leaves the request handler.
- Redis stores only `{prefix}:{hashedId}` → counter, expiring with the 1-minute window. No IP-to-event correlation possible from Redis alone.
- Rate-limit rejection returns 204 (not 429) to match the general "204 everything" policy for this endpoint.

## 11. Testing

**Unit**

- `lib/extract-telemetry.ts`: payload shape conversion for several representative `FujifilmRecipe` inputs. Verify `sentKeys` dedupe across repeated calls with identical payloads.
- `lib/extract-telemetry-schema.ts`: valid payloads parse; out-of-range values are rejected; missing optional fields coerce to null.

**Integration** (against a dev Supabase branch)

- POST a well-formed payload → row appears in `extract_events` with correct FK IDs and `recipe_hash`.
- POST with cookie auth → row's `user_id` matches the authenticated user.
- POST with anonymous session → row's `user_id` is NULL.
- POST with unknown camera name → `camera_model_id` is NULL, row still written.
- POST with new lens name → `lenses` table gets a new row, FK points to it.
- Hammer the endpoint past the rate limit → no extra rows written, all 204.

**Manual E2E** (dev + localhost)

- Drop a Fujifilm JPEG → Supabase dev `extract_events` gains a row within a second. Logged-in: `user_id` set. Logged-out: `user_id` null.
- Toggle between two primary photos inside the same modal session → each photo sends exactly once, never twice.
- Drop a non-Fujifilm JPEG → no telemetry row, existing error toast unchanged.
- Upload/share a previously-extracted recipe → `recipes.recipe_hash` matches the earlier `extract_events.recipe_hash` → conversion query ⑦ returns correct numbers.
- DevTools Network tab: request body is JSON, no identifying headers beyond standard browser-set ones. Response is 204 with empty body.
- Go offline and drop a photo → UI behaves normally, no error toast caused by failed telemetry.

## 12. Out of Scope

- Cookie consent banner / CMP (next workstream)
- Anonymous-visitor funnel via session IDs (depends on cookie banner)
- Admin stats page and charts (re-evaluate once data accumulates)
- Email digest of weekly stats
- Telemetry for parse failures (non-Fujifilm, missing MakerNote)
- Time-of-day / region segmentation (region data not collected)
- Retention / partitioning policy (revisit at volume)
- Training recommendation models on telemetry (requires a separate dataset contract)

## 13. Open Questions

None at spec-approval time. If implementation surfaces ambiguity, escalate rather than guess.
