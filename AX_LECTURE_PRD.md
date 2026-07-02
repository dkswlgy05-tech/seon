# AX강의 자료 정리 대시보드 — MVP PRD

**작성일**: 2026-05-29  
**버전**: 0.1  
**스택**: Next.js (App Router) · React · Supabase · Vercel

---

## 1. 배경 및 문제 정의

미래사업팀은 매주 AX 교육 화상강의(Zoom, 약 180분)를 진행하고, 불참자를 위해 녹화본을 강의 문서로 정리한다.

현재 흐름:
```
MP4/MOV 녹화 → 음성 추출 → 클로바 AI 속기 → 수작업 요약·편집 → Word 문서 저장
```

반복되는 병목:
- 클로바 외부 업로드 → 결과 수동 복사·붙여넣기
- 강의 개요별 요약을 사람이 직접 작성 (강의당 평균 수 시간 소요)
- 편집 후 매번 Word 파일을 수동으로 재생성

---

## 2. 목표

| 목표 | 성공 지표 |
|------|-----------|
| 속기 자동화 | 업로드 후 속기 완료까지 ≤ 영상 길이의 20% |
| 요약 자동 초안 | AI 요약 초안 제공으로 수작업 시간 80% 절감 |
| 원클릭 문서 출력 | 편집 완료 → 기존 docs 양식(.docx) 즉시 다운로드 |
| 접근성 | 비개발자 단독 사용 가능, 설치 불필요 |

---

## 3. 사용자

- **주 사용자**: 미래사업팀 담당자 (비개발자, 매주 강의 문서 작성 담당)
- **부 사용자**: 강의 불참 팀원 (완성 문서 열람)
- **MVP 제외**: 로그인/권한 관리 없음 (팀 내부 URL 공유)

---

## 4. 핵심 사용자 플로우

```
[파일 업로드] → [자동 속기 + AI 요약] → [웹 에디터 수정] → [docx 다운로드]
```

### 단계별 흐름

1. **업로드**: MP4/MOV 드래그 앤 드롭 또는 파일 선택, 강의 메타 입력
2. **처리**: 서버가 오디오 추출 → Whisper API로 타임스탬프 포함 속기 → Claude API로 요약 초안 생성
3. **편집**: 웹 에디터에서 속기록(타임스탬프별) 및 요약 섹션을 자유롭게 편집
4. **출력**: "문서 다운로드" 버튼 → 기존 양식 그대로 .docx 생성

---

## 5. 기능 명세

### 5-1. 업로드 화면 (`/`)

| 요소 | 내용 |
|------|------|
| 드래그 앤 드롭 영역 | MP4, MOV, M4A, MP3 허용 / 최대 2 GB |
| 강의 메타 입력 | 강의명, 강사명, 일시, 진행 방식 (선택 입력, 나중에 편집 가능) |
| 업로드 버튼 | 클릭 시 처리 화면으로 전환 |

### 5-2. 처리 화면 (`/sessions/[id]/processing`)

- 진행 상태 표시: `오디오 추출 중 → 속기 진행 중 (n%) → 요약 생성 중 → 완료`
- 처리 예상 시간 노출 ("약 xx분 소요")
- 완료 시 자동으로 편집 화면으로 이동

### 5-3. 편집 화면 (`/sessions/[id]`)

**좌측 패널 — 강의 정보 카드**

```
강의명   [편집 가능]
강사     [편집 가능]
일시     [편집 가능]
진행방식 [편집 가능]
주제     [편집 가능]
```

**중앙 상단 — 강의 요약 편집**

- AI가 생성한 섹션별 요약 초안 표시
- 섹션 제목·내용 편집, 섹션 추가/삭제/순서 변경
- `qwer.docx` 기준 기본 섹션:
  - 강의 개요 (커리큘럼 표)
  - 주요 도구
  - 주제별 상세 내용
  - 핵심 메시지
  - 다음 주 과제

**중앙 하단 — 원문 속기록 (타임스탬프)**

- 화자명 + 타임스탬프 + 발화 내용을 카드 형태로 나열
- 인라인 텍스트 편집 (클릭 → 바로 편집)
- 화자 일괄 수정 (예: "화자 1" → "김승렬 강사")
- 키워드 검색

**우측 패널 — 출력**

- `문서 다운로드 (.docx)` 버튼
- 자동 저장 상태 표시 (5초 debounce)

### 5-4. 세션 목록 화면 (`/sessions`)

- 강의명, 일시, 상태(처리중/완료/오류), 생성일 표시
- 삭제, 다운로드 바로가기

### 5-5. DOCX 출력 포맷

`qwer.docx` 양식 그대로 재현:

```
강의 녹취 정리
{강의명}

일시      {일시} · {총 분}분
강사      {강사명}
진행 방식 {진행방식}
주제      {주제}

강의 요약
  1. {섹션 제목}
     {내용 (표 포함 가능)}
  2. ...

핵심 메시지
  "..."

다음 주 과제
  ...

원문 전체 (타임스탬프)
  {화자} ({타임스탬프}) {발화 내용}
  ...
```

---

## 6. 기술 아키텍처

### 스택

| 레이어 | 선택 | 이유 |
|--------|------|------|
| 프론트엔드 | Next.js 15 + React | SSR + 파일 업로드 API Routes 통합 |
| 스타일 | Tailwind CSS v4 | 기존 대시보드 프로젝트와 동일 |
| 파일 저장 | Supabase Storage | 원본 영상, 오디오, 처리 결과 JSON |
| DB | Supabase Postgres | 세션 메타, 속기 세그먼트, 요약 섹션 |
| 속기 | OpenAI Whisper API | 타임스탬프 포함 JSON 출력 |
| 요약 | Anthropic Claude API (claude-sonnet-4-6) | 섹션별 구조화 요약 |
| 문서 생성 | `docx` npm 패키지 | .docx 바이너리 생성 |
| 배포 | Vercel | 기존 프로젝트와 동일 |

### 데이터 모델 (Supabase)

```sql
-- 강의 세션
create table sessions (
  id          uuid primary key default gen_random_uuid(),
  title       text,
  lecturer    text,
  held_at     timestamptz,
  venue       text,          -- 진행방식 (예: 서울·청주 이원 화상강의)
  topic       text,
  status      text default 'processing', -- processing | ready | error
  duration_s  integer,
  created_at  timestamptz default now()
);

-- 속기 세그먼트 (타임스탬프별)
create table segments (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references sessions(id) on delete cascade,
  seq         integer,
  speaker     text,
  start_s     numeric,
  text        text
);

-- 요약 섹션
create table summary_sections (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references sessions(id) on delete cascade,
  seq         integer,
  title       text,
  body        jsonb  -- 텍스트 블록 또는 표 구조
);
```

### 처리 파이프라인

`POST /api/sessions/[id]/process` (백그라운드 실행)

```
1. Supabase Storage에서 원본 파일 다운로드
2. ffmpeg(wasm)으로 오디오(mp3) 추출
3. Whisper API (verbose_json) → 타임스탬프 + 텍스트 → segments 저장
4. 세그먼트 전체 텍스트 → Claude API:
   · system: "강의 속기록을 받아 qwer.docx 양식의 섹션별 요약 초안을 JSON으로 반환"
   · 출력 → summary_sections 저장
5. sessions.status = 'ready'
```

---

## 7. UI/UX 원칙

- **디자인 언어**: Linear/Notion/Ramp — 흰 배경, neutral gray, 단일 blue accent, 1px hairline 보더
- **편집 UX**: 클릭하면 바로 인라인 편집, 별도 "편집 모드" 버튼 없음
- **처리 피드백**: skeleton → 진행 바 → 완료 애니메이션으로 명확히 노출
- **에러**: 업로드 실패·API 타임아웃 시 한국어 안내 메시지 + 재시도 버튼
- **자동 저장**: 5초 debounce 후 저장, 우측 상단에 "저장됨" 표시

---

## 8. 범위 외 (MVP 미포함)

| 항목 | 추후 고려 |
|------|-----------|
| 로그인 / 권한 관리 | Supabase Auth (Phase 2) |
| 실시간 화자 분리 (Diarization) | pyannote 연동 |
| HWPX 출력 | 기존 hwpx 빌더 재활용 |
| 영상 플레이어 연동 | 타임스탬프 클릭 → 영상 이동 |
| 모바일 최적화 | 업무용 PC 중심 |

---

## 9. 마일스톤

| 단계 | 내용 | 예상 기간 |
|------|------|-----------|
| M1 | 업로드 → Whisper 속기 → 속기록 편집 → docx 다운로드 | 2주 |
| M2 | Claude 요약 초안 자동 생성 + 섹션 편집 UI | 1주 |
| M3 | 세션 목록·삭제, Supabase Storage 연동, Vercel 배포 | 1주 |

---

## 10. 착수 전 확인 필요 사항

| 항목 | 질문 |
|------|------|
| 파일 크기 | 강의 1회 평균 파일 크기? (Vercel 함수 25 MB 제한 → 대용량은 직접 Storage 업로드 필요) |
| 화자 구분 | 속기록에 화자를 자동 구분해야 하는가, 수동 지정으로 충분한가? |
| 보관 기간 | Supabase Storage 원본 영상을 얼마나 보관할 것인가? |
| 요약 양식 | `qwer.docx`의 섹션 구조가 주차마다 달라지는가, 고정인가? |
