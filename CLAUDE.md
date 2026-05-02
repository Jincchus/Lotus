# CLAUDE.md — 주식 포트폴리오 앱 AI 개발 가이드

대상 프로젝트: 한국/미국 주식을 Lot 단위로 독립 관리하는 개인 포트폴리오 웹앱  
기준 문서: `1_주식포트폴리오앱_통합요구사항정리.docx`  
배포 환경: 자체 데스크탑 서버 (Linux) / 인증: Google OAuth 2.0

---

> ## 📌 스캔 규칙
> 섹션 제목에 **(완료)** 가 붙은 항목은 **초기 스캔 시 건너뛴다**.  
> 해당 섹션의 내용이 필요할 때만 다시 읽는다.  
> **(진행중)** 또는 태그 없는 섹션만 매 세션 필독한다.

---

## 기술 스택 (확정)

| 레이어 | 기술 |
|--------|------|
| **프론트엔드** | Next.js (TypeScript) |
| **백엔드** | NestJS (TypeScript) |
| **DB** | PostgreSQL |
| **ORM** | TypeORM + 마이그레이션 |
| **인증** | Google OAuth 2.0 + JWT |
| **환율 API** | ExchangeRate-API (USD/KRW) |
| **주식 API** | Yahoo Finance API (한국/미국 통합) |
| **배포** | 자체 데스크탑 서버 (Linux OS 기반) — blotus.duckdns.org |

---

## 0. AI 세션 시작 시 자동 실행 (대화 첫 메시지 수신 직후)

대화가 시작되면 아래를 **사용자 요청 처리 전에** 먼저 실행한다.

1. `C:\FinanceProject\ignore\` 폴더에서 파일 목록을 확인한다.
2. 가장 최근에 생성된 작업 요약 `.md` 파일을 찾아 읽는다.
3. 읽은 내용을 바탕으로 아래 형식으로 사용자에게 먼저 보고한다.

```
이전 작업 요약 (YYYY-MM-DD)
- 마지막 작업: ...
- 미완료 항목: ...
- 이어서 진행할 내용: ...

이어서 작업을 시작할까요?
```

4. ignore 폴더가 없거나 파일이 없으면 "이전 작업 기록 없음. 새로 시작합니다." 라고 안내한다.

---

## 0-1. AI 작업 시작 전 필수 확인 (매번)

- [ ] 현재 작업이 요구사항 문서의 어떤 항목을 구현하는지 명확히 설명한다.
- [ ] 핵심 용어 `Lot`, `Strategy`, `StrategyRule`, `PositionRule`, `SellHistory`를 기준으로 사용한다.
- [ ] 같은 종목 추가 매수는 기존 Lot과 합치지 않고 별도 Lot으로 저장하는지 확인한다.
- [ ] 평균단가 중심 설계가 아니라 Lot별 독립 수익률 계산 구조인지 확인한다.
- [ ] Strategy 변경이 기존 Lot의 PositionRule에 영향을 주지 않는지 확인한다.
- [ ] 한국/미국 주식의 통화 및 환율 처리를 고려했는지 확인한다.
- [ ] Google 소셜 로그인 기반 사용자 데이터 분리를 고려했는지 확인한다.
- [ ] Linux 서버 배포 가능성을 해치지 않는 방식인지 확인한다.
- [ ] 임시 구현, 하드코딩, 테스트용 우회 로직이 남아 있지 않은지 확인한다.
- [ ] 구현 후 관련 테스트 또는 검증 방법을 반드시 제시한다.

---

## 1. 핵심 원칙 (절대 위반 금지)

| # | 원칙 | 내용 |
|---|------|------|
| P1 | **Lot 독립성** | 같은 종목이라도 매수 시점이 다르면 반드시 별도 Lot으로 저장. 합산 금지 |
| P2 | **PositionRule 불변성** | 전략 적용 시 StrategyRule → PositionRule 복사본 생성. Strategy 수정이 기존 Lot에 영향 없어야 함 |
| P3 | **부분 매도 잔여 추적** | 매도 후 잔여 수량을 Lot에 계속 유지하고 수익률 계산에 반영 |
| P4 | **사용자 데이터 격리** | 모든 데이터는 user_id 기준으로 분리. 타 사용자 데이터 접근 불가 |
| P5 | **실현/미실현 분리** | 매도 완료 = 실현 수익, 잔여 보유 = 미실현 수익으로 반드시 구분 |

### 절대 하면 안 되는 패턴
- 같은 종목의 Lot을 하나로 합치는 구조
- StrategyRule을 Lot에서 직접 참조 (반드시 PositionRule로 복사)
- 환율 없이 KRW/USD 혼합 계산
- 평균단가 중심으로 수익률 계산

---

## 2. 요구사항 기준선

### 2-1. 확정된 기준 (완료)
- 핵심 관리 단위: `Lot(매수 묶음)`
- 로그인: Google 소셜 로그인 ✅
- 프론트엔드: Next.js (TypeScript) ✅
- 백엔드: NestJS (TypeScript) ✅
- DB: PostgreSQL + TypeORM ✅
- 배포 환경: 자체 데스크탑 서버 (Linux) — `blotus.duckdns.org` ✅
- 환율 API: `ExchangeRate-API` ✅
- 주식 API: Yahoo Finance API (`yahoo-finance2`) ✅
- UI: 반응형 웹 ✅
- 매수 입력 시 증권사 선택 필수 ✅

### 2-2. MVP 범위
✅ Google 로그인 / 종목 검색 / Lot 등록 (수량·금액 모드, 수정·삭제 포함)
✅ Lot별 현재가·수익률 계산
✅ 매도 전략 생성 및 Lot 적용 / PositionRule 복사 저장 (알림 전용)
✅ 부분 매도 처리 / 잔여 수량 추적 / 매도 히스토리 저장 (연도 필터 포함)
✅ 대시보드 기본 정보 / 관심종목 (현재가·변동률) / 월·연도별 통계
✅ USD Lot 매수 시점 환율 저장 (`exchangeRateAtPurchase`) — 날짜별 DB 조회 + 직접 입력
⬜ 설정 페이지 (기본전략, 계정관리, 환율기준)

### 2-3. 추후 확장 (MVP 포함 금지)
❌ 브라우저 푸시 알림 / 포트폴리오 비중 차트 / 수익률 추이 차트
❌ 손절 기준 설정 / 배당 수익 관리 / 세금 계산 / 모바일 앱 확장

---

## 3. DB 설계 (완료)

> 모든 테이블 생성 및 마이그레이션 완료. 수정 작업 시에만 참고할 것.

### 주요 테이블
`users` / `stocks` / `brokers` / `lots` / `strategies` / `strategy_rules` / `position_rules` / `sell_histories` / `watchlists` / `exchange_rates`

### 핵심 설계 결정 사항
- `lots.exchange_rate_at_purchase`: USD 매수 시점 환율 저장 (nullable, KRW는 null)
- `lots.initial_quantity` / `lots.remaining_quantity`: 부분 매도 추적
- `lots.deleted_at`: 소프트 삭제
- `position_rules.is_executed` / `executed_at`: 중복 실행 방지
- `sell_histories.sell_type`: MANUAL / STRATEGY 구분 (현재 STRATEGY는 API 레벨에서 차단)
- 전략 = 알림 전용. PositionRule은 목표 수익률 도달 여부 표시용

---

## 4. 수익률 및 금액 계산 (완료)

> 공식 및 구현 완료. 수정 시에만 참고.

- **Lot 수익률**: `(현재가 - 매수가) / 매수가 × 100`
- **투자원금(분모)**: `initialQuantity × purchasePrice` (전량 매도 후에도 역사적 수익률 유지)
- **USD 투자원금**: `exchangeRateAtPurchase` 우선, 없으면 현재 환율 폴백
- **평가금액**: 현재 환율 기준 (현재 시세 반영)
- **실현/미실현 수익 분리** 구현 완료

---

## 5. 매도 전략 구현 (완료)

> 구현 완료. 수정 시에만 참고.

- Strategy → PositionRule 복사 저장 구현 완료
- 전략 = 알림 전용 (STRATEGY 타입 매도는 API 레벨 BadRequestException)
- 목표 수익률 도달 시 대시보드 알림 표시

---

## 6. API 설계 (완료)

> 모든 API 구현 완료. 수정 시에만 참고.

구현된 API: Lot CRUD / Strategy CRUD / PositionRule / 매도 실행 / SellHistory / Dashboard / Watchlist / 통계 / 환율(current + by-date) / 종목 검색·현재가

---

## 7. 화면 개발

### 완료된 화면 (완료)
| 화면 | 상태 |
|------|------|
| 로그인 | ✅ Google OAuth, 오류 처리 |
| 대시보드 | ✅ 총투자원금·평가금액·실현/미실현수익·수익률·매도 알림 |
| 포트폴리오 | ✅ 종목별 평가금액·수익률·Lot 개수 |
| 종목 상세 | ✅ Lot 목록, 수익률·전략 상태 |
| Lot 상세 | ✅ 수익률·PositionRule·매도기록·수동매도·전략적용·수정·삭제 |
| 종목 검색 | ✅ 한국/미국 검색, 인기종목, Lot 등록(수량/금액 모드, USD 환율 입력), 관심종목 추가 |
| 매도 히스토리 | ✅ 전체 기록, 연도·시장 필터, 월별 통계 |
| 관심종목 | ✅ 현재가·변동률·Lot 등록 이동 |

### 미완료 화면
| 화면 | 필수 표시 항목 |
|------|---------------|
| **설정** ⬜ | 기본전략, 계정관리, 환율기준 |

### 화면 공통 확인
- [ ] 모바일에서 주요 버튼·텍스트 겹침 없음
- [ ] 오류·로딩·빈 상태 화면 제공

---

## 8. 테스트 (미완료)

### 단위 테스트
- [ ] Lot 수익률 계산 (USD 환율 적용 포함)
- [ ] 실현 수익·미실현 수익·전체 수익률 계산
- [ ] StrategyRule → PositionRule 복사
- [ ] Strategy 변경 후 기존 PositionRule 불변
- [ ] 부분 매도 후 remaining_quantity 차감
- [ ] PositionRule 중복 실행 방지

### API 테스트
- [ ] 인증 없는 요청 차단
- [ ] 사용자별 데이터 분리 (타 사용자 데이터 조회 불가)
- [ ] Lot 생성·조회 / Strategy 생성·수정
- [ ] Lot에 Strategy 적용 / SellHistory 생성
- [ ] Dashboard summary 응답 / Watchlist 추가·삭제
- [ ] 월·연도 통계 조회

### 통합 테스트 (핵심 시나리오)
- [ ] Google 로그인 → Lot 등록까지의 흐름
- [ ] Strategy 생성 → Lot 적용 → PositionRule 복사 확인
- [ ] 목표수익률 도달 → 수동 매도 → remaining_quantity 차감 → SellHistory 생성
- [ ] 동일 종목 2회 매수 → Lot 2개 독립 생성 확인

---

## 9. 보안 및 데이터 보호 (완료)

> 구현 완료. 수정 시에만 참고.

- 모든 API JwtAuthGuard 적용, user_id 조건 포함
- API 키·시크릿 환경변수 관리 (`.env` gitignore)
- 소프트 삭제 정책 적용

---

## 10. Linux 서버 배포 (완료)

> 배포 완료. 상세 내용은 `DEPLOY.md` 참고.

- 도메인: `https://blotus.duckdns.org`
- Nginx 리버스 프록시 + Let's Encrypt SSL
- PM2 (재부팅 자동 시작) + Docker PostgreSQL
- 자동 갱신: `certbot --nginx` + systemd timer

---

## 11. 섹션 완료 시 작업 로그 저장 (자동 실행)

큰 섹션(기능 단위) 하나가 완료될 때마다 아래를 **즉시 자동으로** 실행한다. 사용자의 별도 지시 없이도 수행한다.

### 섹션 완료 기준
- 백엔드 모듈 하나 이상 구현 완료
- 프론트엔드 화면 하나 이상 구현 완료
- DB 마이그레이션 / 시드 작성 완료
- 인프라 설정 완료

### 저장 규칙
1. 파일 위치: `C:\FinanceProject\ignore\`
2. 파일명: `섹션명_YYYY-MM-DD.md`
3. **기존 최신 로그 파일을 먼저 읽어서 내용을 이어서 누적 기록한다** (덮어쓰기 금지)
4. 같은 날짜 파일이 이미 있으면 해당 파일에 새 섹션을 추가한다.

```md
## [섹션명] — YYYY-MM-DD HH:MM

### 구현·수정한 내용
- 파일명: 변경 내용 요약

### 핵심 결정 사항
- 결정 내용과 이유

### 다음 이어할 작업
- 항목
```

---

## 12. 작업 종료 처리 (트리거 명령어)

사용자가 **"작업 종료"** 라고 입력하면 아래를 즉시 실행한다.

1. 현재 대화 세션에서 작업한 내용을 전체 검토한다.
2. 파일 저장: `C:\FinanceProject\ignore\작업내용을_압축한_제목_YYYY-MM-DD.md`
3. 파일 생성 후 저장 경로와 파일명을 사용자에게 알린다.

```md
# 작업 요약 — YYYY-MM-DD

## 작업 개요
- 작업 세션: YYYY-MM-DD
- 주요 작업:

## 구현·수정한 내용
### [기능명 또는 파일명]
- 변경 내용:
- 관련 요구사항:

## 핵심 결정 사항

## 확인된 이슈 / 남은 작업

## 체크리스트 검토 결과
- Lot 독립성 유지 여부:
- PositionRule 불변성 유지 여부:
- 사용자 데이터 격리 유지 여부:
- 테스트 실행 여부:
```

---

## 13. TODO — 추후 수정·확장 예정 항목

### 주식 API
- [ ] **KIS Developers (한국투자증권) 공식 API로 교체**
  - `StockPriceProvider` 인터페이스 → `KisStockPriceProvider`로 교체하면 됨
  - 계좌 개설 후 API Key 발급 필요

### 기능 확장
- [ ] 설정 페이지 구현 (기본전략, 계정관리, 환율기준)
- [ ] 모바일 반응형 점검
- [ ] 테스트 작성 (섹션 8 참고)
- [ ] 브라우저 푸시 알림 (목표수익률 도달 시)
- [ ] 포트폴리오 비중 차트
- [ ] 수익률 추이 차트
- [ ] 손절 기준 설정
- [ ] 배당 수익 관리
- [ ] 세금 계산 (양도소득세 기준)

---

## 14. AI 작업 완료 보고 형식

```md
## 작업 요약
- 구현한 기능:
- 수정한 파일:
- 관련 요구사항:

## 필수 확인 결과
- Lot 독립 관리 영향:
- Strategy / StrategyRule / PositionRule 영향:
- 사용자별 데이터 분리 영향:
- 환율/통화 영향:
- 대시보드/통계 영향:

## 테스트 결과
- 실행한 테스트:
- 통과 여부:
- 미실행 테스트와 사유:

## 남은 리스크
- 확인 필요 사항:
- 다음 작업 제안:
```
