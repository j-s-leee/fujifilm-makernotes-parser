바로 적용 가능 (높은 효과, 낮은 노력)

1. [x] exifr 동적 import — 홈페이지 초기 번들에서 ~150KB 절감
2. [x] 갤러리/상세 페이지 Supabase 쿼리 병렬화 — gallery/page.tsx 3개 쿼리 병렬화, 상세페이지는 user 쿼리 제거로 해소
3. [x] Stats 페이지 중복 쿼리 통합 — simulation + created_at 한 번에 조회
4. [x] revalidate 추가 — gallery/[id]=60, stats=3600, bookmarks/[id]=60, likes/[id]=60, my-recipes/[id]=60
5. [x] ISR 실제 동작 수정 — createStaticClient() 도입, cookies() 호출 제거로 ISR 캐싱 활성화

---

중간 노력

1. [x] bookmark/like 상태를 Context Provider로 통합 — UserInteractionsProvider로 앱 전체에서 공유.
       서버 페이지에서 auth+bookmark+like 쿼리 제거, 클라이언트에서 1회 fetch로 통합
2. [ ] Header 서버/클라이언트 분리 — 로고, 네비게이션 링크는 서버 컴포넌트로, 아바타/모바일 메뉴만 클라이언트로 분리
3. [x] 이미지 quality 조정 — 갤러리 썸네일은 75, 상세 히어로만 90
4. [x] 썸네일 업로드 품질 조정 — WebP 0.95→0.80 (갤러리 300px 표시에 충분)

---

장기적 개선

1. [ ] recipes_with_stats 뷰 비정규화 — recipes 테이블에 bookmark_count, like_count 컬럼 추가 + DB 트리거
2. [ ] generateMetadata 추가 — 레시피 상세 페이지에 동적 title/OG image 설정 (SEO, 소셜 공유)

---

인프라 (무료 플랜 최적화)

1. [ ] Vercel: Analytics 탭에서 Serverless Function Duration 확인 — ISR 적용 후 호출 빈도 감소 확인
2. [ ] Supabase: Dashboard > Reports > API requests 확인 — 불필요한 쿼리 없는지 모니터링
3. [x] R2 Cache-Control 설정 — 업로드 시 public, max-age=31536000, immutable 헤더 추가 (upload, profile 양쪽)
4. [ ] Vercel: Image Optimization 사용량 확인 — 무료 1000장/월. 초과 시 unoptimized 전환 고려 (업로드 시 이미 WebP 변환하므로 영향 적음)
5. [x] dev/prod DB 분리 — Supabase 프로젝트 2개 운영, Vercel 환경변수 환경별 분리 완료
