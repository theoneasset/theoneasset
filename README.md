# 더원에셋 강남 매물 트래커

강남구 상업용 부동산 매물 자동 수집 → Airtable 매칭 → AI 분석 → 고객 제안까지 완결하는 **3인 공유 영업툴**

---

## 🏗️ 기술 스택

| 항목 | 기술 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 배포 | Vercel (`theoneasset.vercel.app`) |
| DB | Airtable (강남구 매물_DB, 7개 테이블) |
| 지도 | 카카오맵 |
| AI | Claude Sonnet 4 API |
| 크롤링 | Playwright (네이버부동산) + Cheerio (공실클럽) |
| 스케줄러 | GitHub Actions (1일 3회) |
| 알림 | 솔라피 알림톡 |

---

## 🚀 빠른 시작

### 1. 환경변수 설정

```bash
cp .env.example .env.local
# .env.local 파일을 열고 실제 API 키 입력
```

**필수 키 4종 (Airtable):**
- `AIRTABLE_TOKEN` — Personal Access Token
- `AIRTABLE_BASE_ID` — Base ID (appXXXXXX)
- `AIRTABLE_TABLE_ID_LISTINGS` — 매물 테이블 ID
- `AIRTABLE_VIEW_ID_ACTIVE` — 활성 뷰 ID

### 2. 패키지 설치

```bash
npm install
```

### 3. 개발 서버 실행

```bash
npm run dev
# http://localhost:3000/dashboard
```

---

## 🔒 보안 체크리스트

- [ ] `.env.local` 생성 완료 (`.env.example` 복사)
- [ ] `.env.local` 이 `.gitignore`에 포함되어 있는지 확인
- [ ] GitHub Secrets에 `CRON_SECRET`, `APP_URL` 등록
- [ ] Vercel 환경변수에 모든 키 등록

```bash
# GitHub Secrets 등록 (GitHub Actions 크롤러용)
# Settings → Secrets → Actions → New repository secret
# CRON_SECRET: 랜덤 문자열 32자 이상
# APP_URL: https://theoneasset.vercel.app
# STAFF_PHONES: 01012345678,01087654321 (콤마 구분)
```

---

## 🗂️ Airtable 테이블 구조 (7개)

| 테이블 | 용도 |
|--------|------|
| **BUILDINGS** | 건물 기본 정보 (데이터 입력 완료) |
| **LISTINGS** | 크롤링 매물 (핵심) |
| **CLIENTS** | 고객 DB |
| **PROPOSALS** | AI 생성 제안서 |
| **CONTENT** | SNS/블로그 콘텐츠 |
| **COSTS** | Claude API 비용 추적 |
| **LOCK** | 병행 편집 잠금 (LOCK 테이블) |

---

## ⚙️ 병행 제어 (Concurrency Control)

3명이 동시에 같은 매물을 수정할 때 충돌을 방지합니다.

```
직원 A 편집 시작 → LOCK 테이블에 잠금 레코드 생성
직원 B 같은 매물 수정 시도 → 409 Conflict 반환 + 경고 모달 표시
30분 후 자동 해제 (타임아웃)
편집 완료 후 → /api/lock 으로 수동 해제
```

**LOCK 테이블 필드:**
- `resourceType`: listing / building / proposal
- `resourceId`: Airtable Record ID
- `lockedBy`: 직원명
- `lockedAt`: 잠금 시작 시각
- `expiresAt`: 만료 시각 (lockedAt + 30분)
- `sessionId`: UUID

---

## 💰 Claude API 비용 추적

- 모든 Claude API 호출마다 **토큰 수 × 단가** 계산
- Airtable COSTS 테이블에 자동 저장
- **누적 $1 도달 시:**
  1. 화면 우상단 배너 알림 (8초)
  2. 솔라피 알림톡 전 직원 발송
- 대시보드 상단 바에 실시간 비용 표시

**단가 (Claude Sonnet 4):**
- Input:  $3.00 / 1M 토큰
- Output: $15.00 / 1M 토큰

---

## 🕐 크롤링 스케줄

GitHub Actions로 하루 3회 자동 실행:

| 실행 | KST | UTC (cron) |
|------|-----|-----------|
| 아침 | 08:00 | `0 23 * * *` (전날) |
| 점심 | 12:00 | `0 3 * * *` |
| 저녁 | 18:00 | `0 9 * * *` |

---

## 📁 디렉토리 구조

```
src/
├── app/
│   ├── api/
│   │   ├── crawl/route.ts      # 크롤링 실행
│   │   ├── listings/route.ts   # 매물 CRUD
│   │   ├── lock/route.ts       # 병행 제어
│   │   └── claude/route.ts     # AI 분석/제안
│   └── dashboard/page.tsx      # 메인 대시보드
├── components/
│   ├── dashboard/
│   │   ├── CostTracker.tsx     # 비용 추적 UI
│   │   ├── LockWarning.tsx     # 충돌 경고 모달
│   │   └── StatsBar.tsx        # 통계 바
│   ├── map/KakaoMap.tsx        # 카카오맵
│   └── listings/
│       └── ListingsTable.tsx   # 매물 테이블
├── lib/
│   ├── airtable/
│   │   ├── client.ts           # Airtable CRUD
│   │   └── lock.ts             # LOCK 테이블 관리
│   ├── claude/client.ts        # Claude API + 비용추적
│   ├── crawlers/
│   │   ├── naver.ts            # 네이버부동산 크롤러
│   │   └── gongsil.ts          # 공실클럽 크롤러
│   ├── kakao/geocode.ts        # 지오코딩
│   └── solapi/client.ts        # 알림톡
└── types/index.ts              # 전체 TypeScript 타입
```

---

## Phase 로드맵

- **Phase 1** ✅ 핵심 인프라 (현재)
  - 크롤러, Airtable 연동, 병행 제어, 비용 추적, 대시보드
- **Phase 2** 매칭 고도화
  - 건물 DB 자동 매칭, 실거래가 비교, 수익률 계산
- **Phase 3** 영업 자동화
  - 고객 제안서 자동 생성, 카카오톡 발송, SNS 콘텐츠
- **Phase 4** 분석 고도화
  - 시세 트렌드, 공실률, 3D 지도
