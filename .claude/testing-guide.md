# 테스트 및 배포 검증 가이드

> **DB 분리**: 로컬/Preview는 **dev Supabase**, Production은 **prod Supabase** 사용.
> **R2/Google OAuth**는 모든 환경에서 공유.

---

## 환경 구성

### Supabase 프로젝트

| 환경 | Supabase 프로젝트 | 용도 |
|------|-------------------|------|
| Production | `fujifilm-prod` | 운영 데이터 |
| Preview + Local | `fujifilm-dev` | 개발/테스트 데이터 |

스키마 변경 시 `supabase/schema.sql` 업데이트 후 **양쪽 프로젝트에 모두 적용** 필요.

### Supabase Redirect URLs

**prod 프로젝트:**
```
https://yourdomain.com/**
```

**dev 프로젝트:**
```
http://localhost:3000/**
https://preview.yourdomain.com/**
https://*-j-s-leees-projects.vercel.app/**
```

Google Cloud Console은 건드릴 필요 없음 — Supabase가 OAuth 프록시 역할.

### Vercel Environment Variables

| 변수 | Production | Preview / Development |
|------|-----------|----------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | prod 프로젝트 URL | dev 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | prod anon key | dev anon key |
| `R2_*` 관련 | 공통 값 | 공통 값 |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | 공통 값 | 공통 값 |

### 로컬 `.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx-dev.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=dev-anon-key
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
NEXT_PUBLIC_R2_PUBLIC_URL=...
```

---

## 1. 로컬 개발 (feature 브랜치)

### 확인 방법

```bash
npm run build    # 타입 체크 + 빌드 에러 확인
npm run dev      # → http://localhost:3000
```

### 확인 체크리스트

- [ ] `npm run build` 에러 없음
- [ ] 홈: 이미지 드롭 → EXIF 파싱 → 레시피 카드 표시
- [ ] 갤러리: 필터, 정렬, 무한 스크롤
- [ ] 로그인 → 좋아요/북마크 토글
- [ ] 프로필 편집 → 이름/아바타 변경
- [ ] 모바일 반응형 (개발자도구 device mode)

### 로컬에서 확인할 수 없는 것

| 항목 | 이유 | 확인 환경 |
|------|------|-----------|
| ISR (캐시된 페이지 재사용) | `next dev`는 항상 동적 렌더링, `revalidate` 무시 | Preview/Production |
| Image Optimization 캐싱 | 로컬은 매번 최적화 재실행 | Preview/Production |
| Edge/Serverless 실행 환경 | 로컬은 Node.js 단일 프로세스 | Preview/Production |
| 실제 응답 속도/TTFB | 네트워크, CDN, 리전 차이 | Production |

> `npm run build && npm run start`로 production 모드 로컬 실행은 가능하지만,
> Vercel의 ISR/Edge 캐시와는 다르게 동작함. ISR 확인은 preview에서.

---

## 2. Vercel Preview (`preview.yourdomain.com`)

### 사용 흐름

```
feature 브랜치 push → GitHub PR 생성 → Vercel 자동 빌드
→ preview.yourdomain.com에서 테스트 (develop 브랜치 연결)
→ 문제 없으면 main 머지
```

### DB 관련 참고

- Preview는 **dev DB** 사용 → 테스트 데이터가 운영 DB에 영향 없음
- dev DB에 테스트 데이터가 쌓이면 주기적으로 정리

### Preview에서만 확인 가능한 것

**ISR 동작 확인:**
1. `/gallery/1` 첫 방문 → 응답 헤더에 `x-nextjs-cache: MISS`
2. 같은 URL 재방문 → `x-nextjs-cache: HIT` (캐시됨)
3. 60초 후 재방문 → `STALE` → 백그라운드 재생성

```bash
curl -I https://preview.yourdomain.com/gallery/1
# x-nextjs-cache 헤더 확인
```

**Image Optimization 확인:**
- 개발자도구 Network → 이미지 요청 → `/_next/image?url=...&w=...&q=75`
- 갤러리 썸네일은 q=75, 상세 히어로는 q=90인지 확인

### Preview 확인 체크리스트

- [ ] 빌드 성공 (GitHub PR checks)
- [ ] preview URL에서 페이지 정상 로드
- [ ] OAuth 로그인 동작 (dev DB 사용 확인)
- [ ] 이미지 로드 (R2 연결)
- [ ] ISR: 같은 상세 페이지 2번째 로드 시 `x-nextjs-cache: HIT`
- [ ] 모바일에서 접속 테스트 (실제 디바이스)

---

## 3. Production 배포

### 배포

```bash
# main에 머지하면 Vercel이 자동 배포
git checkout main
git merge feature/your-branch
git push origin main
```

### Production 확인 체크리스트

- [ ] Vercel Dashboard → Deployments에서 빌드 성공
- [ ] 사이트 접속 → 기본 동작 확인
- [ ] Google 로그인 동작 (prod DB 사용 확인)
- [ ] 새 이미지 업로드 → R2 저장 → 갤러리 표시
- [ ] Vercel Dashboard → Usage → Image Optimization 사용량 확인

---

## 환경별 요약

| 항목 | 로컬 (`dev`) | 로컬 (`build+start`) | Vercel Preview | Production |
|------|:-----------:|:-------------------:|:--------------:|:----------:|
| DB | dev | dev | dev | **prod** |
| 기능 테스트 | O | O | O | O |
| OAuth 로그인 | O | O | O | O |
| DB 읽기/쓰기 | O | O | O | O |
| R2 업로드 | O | O | O | O |
| ISR 캐싱 | X | 부분적 | **O** | **O** |
| Image Optimization | X | X | **O** | **O** |
| CDN/Edge 캐시 | X | X | O | **O** |
| 실제 성능 측정 | X | X | 참고용 | **O** |

---

## 스키마 변경 시

```
1. supabase/schema.sql 수정
2. dev Supabase SQL Editor에서 변경사항 실행
3. 로컬/preview에서 테스트
4. 문제 없으면 prod Supabase SQL Editor에서 동일하게 실행
5. main 머지 → production 배포
```

---

## 권장 워크플로우

```
1. 로컬: 코드 작성 → npm run build 확인 → 기능 테스트 (dev DB)
2. Push → PR → Vercel preview 자동 생성 (dev DB)
3. Preview: ISR/캐싱 동작 확인, 모바일 실기기 테스트
4. 문제 없으면 main 머지 → production 자동 배포 (prod DB)
5. Production: 최종 확인
```

소규모 프로젝트에서는 2-3단계를 항상 할 필요 없음.
**UI 변경이나 성능 관련 변경**일 때만 preview에서 확인하고,
단순 버그 수정은 `npm run build` 통과 확인 후 바로 머지해도 충분.
