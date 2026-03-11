# Deployment Guide

## Infrastructure

| Component | Service | Detail |
|-----------|---------|--------|
| Hosting | Vercel (Hobby Plan) | 1 project |
| Production | film-simulation.site | `main` branch |
| Preview | preview.film-simulation.site | other branches |
| DB (prod) | Supabase `project-prod` | 상시 운영 |
| DB (dev) | Supabase `project-dev` | 개발/테스트용 |
| Storage | Cloudflare R2 | 이미지 썸네일, 아바타 |

## Git Branch Strategy

```
main          ← 프로덕션 (Vercel 자동 배포 + 마이그레이션)
  ↑ PR merge
develop       ← 통합 브랜치 (Vercel preview 자동 배포)
  ↑ PR merge
feature/*     ← 기능 개발 브랜치 (Vercel preview 자동 배포)
```

## 현재 배포 방식: Vercel Build Command 통합 (Method 1)

Vercel 빌드 과정에서 마이그레이션을 먼저 실행하고, 성공 시에만 빌드/배포를 진행합니다.

### 동작 흐름

```
main 머지 → Vercel 빌드 시작
              → supabase link
              → supabase db push (마이그레이션)
                  → 실패 시: 빌드 중단, 배포 안 됨 ✅
                  → 성공 시: next build → 배포 ✅
```

- 마이그레이션 실패 = 빌드 실패 = 배포 차단
- 새 마이그레이션이 없으면 "Already up to date"로 넘어감 (추가 시간 ~15초)
- `supabase db push`는 멱등성이 있어서 재배포해도 안전

### Vercel 설정

**Settings → General → Build Command:**

```bash
npx supabase link --project-ref $SUPABASE_PROD_REF && npx supabase db push && next build
```

**Settings → Environment Variables (Production 환경에만):**

| 변수 | 값 얻는 곳 |
|------|-----------|
| `SUPABASE_ACCESS_TOKEN` | supabase.com → Account → Access Tokens |
| `SUPABASE_PROD_REF` | Supabase Dashboard → Settings → General → Reference ID |
| `SUPABASE_DB_PASSWORD` | Supabase 프로젝트 생성 시 설정한 DB 비밀번호 |

기존 환경변수(`NEXT_PUBLIC_SUPABASE_URL` 등)는 그대로 유지.

### Preview 배포

`feature/*`, `develop` 브랜치 → Vercel이 자동으로 preview 배포.
Preview 환경에는 위 3개 변수가 없으므로 마이그레이션 단계가 실패 → preview는 `next build`만 실행되도록 Build Command를 조정:

```bash
npx supabase link --project-ref $SUPABASE_PROD_REF && npx supabase db push; next build
```

`&&` 대신 `;`로 연결하면 마이그레이션 실패(환경변수 없음)와 무관하게 `next build`는 실행됩니다.

또는 Production과 Preview의 Build Command를 분리:
- **Production**: `npx supabase link --project-ref $SUPABASE_PROD_REF && npx supabase db push && next build`
- **Preview**: `next build` (기본값 유지)

Vercel은 환경별 Build Command 분리를 직접 지원하지 않으므로, 스크립트로 분기하는 것이 깔끔합니다:

```bash
if [ "$VERCEL_ENV" = "production" ]; then npx supabase link --project-ref $SUPABASE_PROD_REF && npx supabase db push && next build; else next build; fi
```

## 배포 흐름 요약

### 일반 개발 사이클

```
1. feature/* 브랜치에서 개발
2. develop으로 PR → preview 배포에서 확인
3. develop → main PR 머지
4. Vercel이 자동으로 마이그레이션 + 빌드 + 배포
```

### 롤백이 필요한 경우

- **코드 롤백**: Vercel Dashboard → Deployments → 이전 배포 → Redeploy
- **DB 롤백**: Supabase Dashboard SQL Editor에서 수동 역방향 SQL 실행

## 마이그레이션 작성 가이드

### 안전한 작업

| 작업 | 예시 | 비고 |
|------|------|------|
| 테이블 생성 | `CREATE TABLE` | 기존 코드에 영향 없음 |
| 컬럼 추가 | `ALTER TABLE ADD COLUMN ... DEFAULT` | DEFAULT 필수 |
| 인덱스 추가 | `CREATE INDEX CONCURRENTLY` | CONCURRENTLY로 락 방지 |
| VIEW 수정 | `CREATE OR REPLACE VIEW` | 안전 |
| 함수 수정 | `CREATE OR REPLACE FUNCTION` | 안전 |
| RLS 정책 추가 | `CREATE POLICY` | 안전 |

### 위험한 작업 (2단계 배포 필요)

**컬럼 삭제:**

```
[1차 배포]  코드에서 해당 컬럼 참조 전부 제거 → 배포
[2차 배포]  ALTER TABLE DROP COLUMN → 배포
```

**컬럼 이름 변경:**

```
[1차 배포]  새 컬럼 추가 + 데이터 복사 트리거 → 배포
[2차 배포]  코드를 새 컬럼으로 전환 → 배포
[3차 배포]  구 컬럼 삭제 → 배포
```

### VIEW + 종속 함수 변경

`recipes_with_stats` VIEW를 변경하면 이를 참조하는 함수도 함께 재생성해야 합니다.
`20260310000000_soft_delete_and_reports.sql` 참고:

```sql
DROP VIEW IF EXISTS public.recipes_with_stats CASCADE;
CREATE VIEW public.recipes_with_stats ...;

-- CASCADE로 삭제된 종속 함수들을 다시 생성
CREATE OR REPLACE FUNCTION get_trending_recipes(...) ...;
CREATE OR REPLACE FUNCTION match_recipes_by_image(...) ...;
```

## 향후: GitHub Actions 전환 (Method 3)

정식 오픈 후 아래 시점에 GitHub Actions 기반 배포로 전환:
- 팀원 추가
- 배포 전 CI 검증(타입 체크, 린트) 자동화 필요
- 배포 파이프라인에 대한 더 세밀한 제어 필요

전환 시 변경사항:
1. `.github/workflows/ci.yml` — PR 타입 체크 + 린트
2. `.github/workflows/deploy-prod.yml` — 마이그레이션 → `vercel deploy --prod`
3. Vercel Ignored Build Step으로 main 자동 배포 비활성화
4. GitHub Secrets 6개 등록 (Supabase 3개 + Vercel 3개)

## 환경 변수 전체

| 변수 | 용도 | 설정 위치 |
|------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL | Vercel + `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Vercel + `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role | Vercel (Production only) |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | R2 public URL | Vercel + `.env.local` |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI 인증 | Vercel (Production only) |
| `SUPABASE_PROD_REF` | prod 프로젝트 ref | Vercel (Production only) |
| `SUPABASE_DB_PASSWORD` | prod DB 비밀번호 | Vercel (Production only) |
