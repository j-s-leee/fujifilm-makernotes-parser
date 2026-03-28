# Multi-Photo Upload & Swipe Gallery

## Overview

레시피당 최대 5장의 사진을 업로드하고, 레시피 상세 페이지에서 인스타그램 스타일의 스와이프 갤러리로 볼 수 있도록 하는 기능.

**핵심 원칙**: 레시피 설정이 주인공이고, 여러 사진은 "이 설정으로 이런 결과물들이 나온다"를 보여주는 샘플 갤러리.

## Data Model

### New Table: `recipe_photos`

```sql
CREATE TABLE public.recipe_photos (
  id             bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  recipe_id      bigint NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  storage_path   text NOT NULL,
  blur_data_url  text,
  width          smallint,
  height         smallint,
  position       smallint NOT NULL,
  image_embedding vector(768),
  color_histogram vector(48),
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX recipe_photos_recipe_id_idx ON public.recipe_photos (recipe_id);
CREATE INDEX recipe_photos_position_idx ON public.recipe_photos (recipe_id, position);

ALTER TABLE public.recipe_photos ENABLE ROW LEVEL SECURITY;
```

### RLS Policies

- **SELECT**: anon + authenticated 모두 허용
- **INSERT**: authenticated만, 본인 레시피의 사진만 (`recipe_id`의 `user_id` = `auth.uid()`)
- **DELETE**: authenticated만, 본인 레시피의 사진만

### Existing `recipes` Table

변경 없음. 기존 `thumbnail_path`, `blur_data_url`, `thumbnail_width`, `thumbnail_height`, `image_embedding`, `color_histogram` 필드는 대표 사진용으로 유지. 1장만 올리면 기존과 완전히 동일하게 작동.

### `recipes_with_stats` View Update

`photo_count` 컬럼 추가: `recipe_photos` 테이블의 해당 레시피 사진 수 + 1 (대표 사진 포함).

## Upload Flow

### Step-by-Step

1. 사용자가 ImageDropzone에 사진 1~5장 드래그&드롭 (또는 파일 선택)
2. 모든 사진 → EXIF에서 카메라 메이커 확인. 후지필름이 아니면 해당 사진 거부 + 에러 메시지
3. 썸네일 그리드로 미리보기 표시
4. 사용자가 **대표 사진 선택** (기본값: 첫 번째 사진, 클릭으로 변경 가능)
5. 대표 사진의 EXIF → 레시피 설정 파싱 & 미리보기 표시. 대표 사진 변경 시 레시피 설정도 갱신
6. 사용자가 공유 버튼 클릭
7. 모든 사진 → 이미지 압축 (800px max, WebP) + `/api/upload` 호출 (R2 + blur + 임베딩)
8. 대표 사진 데이터 → `recipes` 테이블 INSERT (기존 로직)
9. 나머지 사진 데이터 → `recipe_photos` 테이블 INSERT

### Upload Modal UI Changes

- `ImageDropzone`: `multiple: true`로 변경, 최대 5개 파일 제한
- 선택된 사진들의 썸네일 그리드 표시
- 대표 사진 표시 (별 아이콘 또는 강조 테두리)
- 대표 사진 변경: 다른 썸네일 클릭
- 개별 사진 삭제: X 버튼
- 5장 초과 선택 시 "최대 5장까지 업로드할 수 있어요" 안내

### EXIF Validation

- 대표 사진: 풀 EXIF 파싱 (카메라 모델, 렌즈, 후지필름 메이커노트 → 레시피 설정)
- 추가 사진: EXIF 카메라 메이커만 확인 ("FUJIFILM"인지 체크). 레시피 설정 파싱은 하지 않음
- 후지필름 카메라가 아닌 사진 → 해당 사진만 거부, 나머지는 유지

## Recipe Detail Page — Swipe Gallery

### Carousel Behavior

- 사진 1장 → 기존과 완전히 동일 (캐러셀 없음)
- 사진 2장 이상 → 캐러셀 활성화:
  - **모바일**: 좌우 터치 스와이프
  - **데스크톱**: 좌우 화살표 버튼 + 드래그 스와이프 + 키보드 좌우 화살표
  - **하단**: dot indicator (● ● ○ ○ ○)
- 기존 `feature-carousel`의 모션/제스처 패턴 재활용 (`motion/react`)

### Data Loading

- 레시피 상세 페이지 서버 컴포넌트에서 `recipes` + `recipe_photos` 조회
- 대표 사진 (recipes 테이블) + 추가 사진 (recipe_photos 테이블)을 합쳐서 `position` 순 정렬
- RecipeHero 컴포넌트에 사진 배열 전달

## Gallery List — Photo Count Badge

- `gallery-card` 컴포넌트에 사진 수 배지 추가
- `recipes_with_stats` 뷰의 `photo_count` 사용
- `photo_count > 1`일 때만 배지 표시 (예: 📷 카운트 또는 스택 아이콘)
- 위치: 카드 우측 상단

## API Changes

### POST /api/upload

변경 없음. 사진 1장씩 처리하는 기존 로직 그대로 유지.

### shareRecipe Server Action

변경:
1. 모든 사진 이미지 압축 (병렬)
2. 모든 사진 `/api/upload` 호출 (병렬)
3. 대표 사진 데이터로 `recipes` 테이블 INSERT
4. 추가 사진 데이터로 `recipe_photos` 테이블 INSERT (recipe_id 사용)
5. 전체를 하나의 트랜잭션으로 묶어 일부만 성공하는 상황 방지

### Rate Limiting

레시피 단위로 카운트. 사진 5장이어도 레이트 리밋 1회 소모.

## Error Handling

| 상황 | 처리 |
|------|------|
| 후지필름 아닌 사진 | 해당 사진만 거부, 에러 메시지 표시 |
| 5장 초과 선택 | "최대 5장까지 업로드할 수 있어요" 안내 |
| 업로드 중 일부 실패 | 전체 트랜잭션 롤백, 재시도 안내 |
| 레시피 삭제 | CASCADE로 recipe_photos 자동 삭제 + R2 파일 정리 |

## Scope Exclusions

- 업로드 후 사진 추가/삭제/순서 변경 기능은 포함하지 않음 (첫 업로드 시에만 멀티 선택)
- 사진별 캡션/설명 없음
- 사진 편집(크롭, 필터 등) 없음
