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
main          ← 프로덕션 (Vercel 자동 배포)
  ↑ PR merge
develop       ← 통합 브랜치 (Vercel preview 자동 배포)
  ↑ PR merge
feature/*     ← 기능 개발 브랜치 (Vercel preview 자동 배포)
```

---

## Supabase CLI 기본 사용법

### 설치 및 로그인

```bash
# 설치 (macOS)
brew install supabase/tap/supabase

# 로그인 (Access Token 필요: supabase.com → Account → Access Tokens)
supabase login
```

### 프로젝트 연결 (link / unlink)

`supabase link`는 로컬 프로젝트를 특정 Supabase 프로젝트에 연결합니다. **한 번에 하나의 프로젝트만 연결** 가능합니다.

```bash
# 프로젝트 연결
supabase link --project-ref <PROJECT_REF>

# DB 비밀번호 입력 프롬프트가 뜸. -p 옵션으로 직접 전달 가능:
supabase link --project-ref <PROJECT_REF> -p <DB_PASSWORD>

# 현재 연결 해제
supabase unlink
```

| 명령어 | 설명 |
|--------|------|
| `supabase link --project-ref <REF>` | 특정 프로젝트에 연결 (비밀번호 프롬프트) |
| `supabase link --project-ref <REF> -p <PW>` | 비밀번호 직접 전달하여 연결 |
| `supabase unlink` | 현재 연결 해제 |
| `supabase db push` | 연결된 프로젝트에 마이그레이션 적용 |
| `supabase db push --dry-run` | 실제 적용 없이 실행할 SQL 미리보기 |

> **Project Ref 확인**: Supabase Dashboard → Settings → General → Reference ID

---

## 마이그레이션 워크플로우

### 개발 → 운영 전체 흐름

```
1. feature/* 브랜치에서 마이그레이션 SQL 작성
2. dev DB에 마이그레이션 적용 → 코드 개발 및 테스트
3. PR 생성 → develop 머지 → preview 배포 확인
4. prod DB에 마이그레이션 적용
5. develop → main PR 머지 → Vercel 프로덕션 배포
```

> **핵심 원칙: DB 먼저, 코드 나중.** 마이그레이션을 먼저 적용하고, 코드를 배포합니다.

### Step 1: dev DB에 마이그레이션 적용

```bash
# dev 프로젝트에 연결
supabase link --project-ref <DEV_PROJECT_REF> -p <DEV_DB_PASSWORD>

# 적용할 마이그레이션 미리보기
supabase db push --dry-run

# 마이그레이션 적용
supabase db push
```

dev DB에서 코드 개발 및 기능 테스트를 진행합니다.

### Step 2: prod DB에 마이그레이션 적용

코드 배포(main 머지) **전에** prod DB에 마이그레이션을 적용합니다.

```bash
# dev 연결 해제 → prod 연결
supabase unlink
supabase link --project-ref <PROD_PROJECT_REF> -p <PROD_DB_PASSWORD>

# 적용할 마이그레이션 미리보기 (반드시 확인!)
supabase db push --dry-run

# 마이그레이션 적용
supabase db push

# 완료 후 다시 dev로 전환 (선택)
supabase unlink
supabase link --project-ref <DEV_PROJECT_REF> -p <DEV_DB_PASSWORD>
```

### Step 3: 코드 배포

prod DB 마이그레이션 확인 후 main 브랜치에 PR을 머지합니다. Vercel이 자동으로 빌드 및 배포합니다.

### 빠른 참조: dev ↔ prod 전환

```bash
# dev → prod 전환
supabase unlink
supabase link --project-ref <PROD_REF> -p <PROD_PW>

# prod → dev 전환
supabase unlink
supabase link --project-ref <DEV_REF> -p <DEV_PW>
```

> `supabase db push`는 멱등성이 있습니다. 이미 적용된 마이그레이션은 "Already up to date"로 건너뜁니다.

---

## Vercel 배포 설정

### Build Command

Vercel 빌드 시 마이그레이션은 실행하지 않고, `next build`만 실행합니다. 마이그레이션은 로컬에서 수동으로 적용합니다.

```bash
next build
```

### Environment Variables

**Production + Preview 공통:**

| 변수 | 용도 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | R2 public URL |

**Production only:**

| 변수 | 용도 |
|------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (서버 전용) |

---

## 마이그레이션 작성 가이드

### 파일 네이밍

```
supabase/migrations/YYYYMMDDHHMMSS_description.sql
```

예: `20260314100000_profile_terms_agreement.sql`

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

---

## 롤백

- **코드 롤백**: Vercel Dashboard → Deployments → 이전 배포 → Redeploy
- **DB 롤백**: Supabase Dashboard SQL Editor에서 수동 역방향 SQL 실행

---

## 향후: GitHub Actions 전환

정식 오픈 후 아래 시점에 GitHub Actions 기반 배포로 전환:
- 팀원 추가
- 배포 전 CI 검증(타입 체크, 린트) 자동화 필요
- 배포 파이프라인에 대한 더 세밀한 제어 필요

전환 시 변경사항:
1. `.github/workflows/ci.yml` — PR 타입 체크 + 린트
2. `.github/workflows/deploy-prod.yml` — 마이그레이션 → `vercel deploy --prod`
3. Vercel Ignored Build Step으로 main 자동 배포 비활성화
4. GitHub Secrets 등록
