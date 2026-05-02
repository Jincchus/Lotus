# 주식 포트폴리오 앱 — AI 개발 필수 체크리스트

> **사용법**: AI에게 기능 개발을 요청할 때마다 이 파일을 함께 첨부하거나 참조 지시.  
> "이 체크리스트를 기준으로 구현해줘" 라고 명시하면 됨.

---

## 핵심 원칙 (항상 유지)

| # | 원칙 | 설명 |
|---|------|------|
| P1 | **Lot 독립성** | 같은 종목이라도 매수 시점이 다르면 반드시 별도 Lot으로 저장. 절대 합산하지 않음 |
| P2 | **PositionRule 복사 불변성** | 전략 적용 시 StrategyRule → PositionRule 복사본 생성. 이후 Strategy 수정이 기존 Lot에 영향 없어야 함 |
| P3 | **부분 매도 잔여 추적** | 매도 후 잔여 수량을 Lot에 계속 유지하고 수익률 계산에 반영 |
| P4 | **사용자 데이터 격리** | 모든 데이터는 user_id 기준으로 분리. 타 사용자 데이터 접근 불가 |
| P5 | **실현/미실현 분리** | 매도 완료 = 실현 수익, 잔여 보유 = 미실현 수익으로 반드시 구분 |

---

## PHASE 1 — DB 설계 체크리스트

### 필수 테이블 확인
- [ ] `users` — Google 소셜 로그인 기반 사용자 정보
- [ ] `stocks` — 종목 마스터 (한국/미국 구분 포함)
- [ ] `lots` — 매수 묶음 (종목, 매수가, 수량, **잔여수량**, 통화, 매수일, 메모)
- [ ] `strategies` — 전략 템플릿 (사용자별)
- [ ] `strategy_rules` — Strategy에 속한 규칙 (목표수익률, 매도비율)
- [ ] `position_rules` — Lot에 복사된 실제 적용 규칙 (**is_executed 컬럼 필수**)
- [ ] `sell_histories` — 매도 기록 (매도가, 수량, 매도일, 수익률, 실현수익)
- [ ] `watchlists` — 관심종목 (user_id + stock_id)
- [ ] `exchange_rates` — 환율 캐시 (USD/KRW)

### DB 설계 규칙
- [ ] 모든 테이블에 `user_id` FK 존재 (또는 user_id까지 추적 가능한 관계)
- [ ] `lots.remaining_quantity` 컬럼 — 부분 매도 시 차감되는 값
- [ ] `lots.initial_quantity` 컬럼 — 최초 매수 수량 (변경 불가 기준값)
- [ ] `position_rules.is_executed` — 중복 실행 방지 플래그 (boolean)
- [ ] `position_rules.lot_id` FK — Strategy 수정과 무관하게 독립 존재
- [ ] `sell_histories.lot_id` FK — 어느 Lot에서 매도됐는지 추적
- [ ] 한국/미국 구분 컬럼 (`market`: 'KR' | 'US')
- [ ] 통화 컬럼 (`currency`: 'KRW' | 'USD')
- [ ] 소프트 삭제 (`deleted_at`) — Lot/전략은 삭제 시 히스토리 보존 필요 여부 검토

### 금지 패턴
- [ ] ~~같은 종목의 Lot을 하나로 합치는 구조~~ — 절대 금지
- [ ] ~~StrategyRule을 직접 Lot에 연결~~ — 반드시 PositionRule로 복사
- [ ] ~~환율 없이 KRW/USD 혼합 계산~~ — 반드시 환율 적용

---

## PHASE 2 — 기능 개발 체크리스트

### 인증
- [ ] Google OAuth 2.0 소셜 로그인만 지원 (자체 이메일/비밀번호 불필요)
- [ ] 로그인 성공 후 사용자 없으면 자동 회원가입 처리
- [ ] 모든 API 엔드포인트에 인증 미들웨어 적용

### 종목 검색
- [ ] 한국 주식 / 미국 주식 동시 검색 가능
- [ ] 검색 결과에 market(KR/US), 종목코드, 종목명 포함

### Lot 등록
- [ ] 입력값: 종목, 매수가, **수량**, 통화, 매수일, 메모
- [ ] `initial_quantity` = `remaining_quantity` = 입력 수량 (최초 등록 시)
- [ ] 같은 종목 재매수 → 새 Lot 생성 (기존 Lot 수정 금지)

### 현재가 / 수익률 계산
- [ ] 외부 주식 API로 현재가 조회
- [ ] 미국 주식 현재가는 ExchangeRate-API 환율로 KRW 환산 후 계산
- [ ] 수익률 = `(현재가 - 매수가) / 매수가 × 100`
- [ ] 수익률 계산 기준은 `remaining_quantity` (잔여 수량)

### 매도 전략
- [ ] Strategy 생성 — 사용자별 템플릿 (이름 + StrategyRule 목록)
- [ ] StrategyRule — 목표수익률(%), 매도비율(%) 복수 등록 가능
- [ ] Lot에 전략 적용 → StrategyRule을 PositionRule로 **복사** 저장
- [ ] Strategy 수정 후 기존 Lot의 PositionRule 불변 확인 필수
- [ ] `is_executed = false`인 PositionRule만 실행 가능

### 부분 매도
- [ ] 매도 수량 = `remaining_quantity × 매도비율`
- [ ] 매도 처리 후 `lots.remaining_quantity` 차감
- [ ] `sell_histories` 레코드 생성 (매도가, 수량, 매도일, 실현수익 계산값 저장)
- [ ] PositionRule의 `is_executed = true` 업데이트
- [ ] 이미 `is_executed = true`인 규칙 중복 실행 방지

### 대시보드
- [ ] 총 투자원금 (KRW 기준 환산 합계)
- [ ] 총 평가금액 (현재가 × remaining_quantity, KRW 환산)
- [ ] 실현 수익 (sell_histories 합계)
- [ ] 미실현 수익 (평가금액 - 투자원금)
- [ ] 전체 수익률 = `(실현수익 + 미실현수익) / 총투자원금 × 100`

### 관심종목
- [ ] 종목 추가/삭제
- [ ] 현재가 + 변동률 표시
- [ ] Lot이 없어도 독립적으로 관리 가능

### 매도 히스토리
- [ ] 전체 매도 기록 조회
- [ ] 기간별 필터 (시작일~종료일)
- [ ] 월별 / 연도별 통계 집계

### 환율
- [ ] ExchangeRate-API 사용 (USD/KRW)
- [ ] 조회 결과 DB 캐싱 (실시간 반복 호출 방지)
- [ ] 캐시 만료 기준 명확히 설정 (예: 1시간)

---

## PHASE 3 — 테스트 체크리스트

### Lot 독립성 테스트
- [ ] 동일 종목 2번 매수 → DB에 Lot 2개 생성 확인
- [ ] Lot A 매도가 Lot B에 영향 없음 확인
- [ ] 각 Lot 수익률이 독립적으로 계산됨 확인

### PositionRule 불변성 테스트
- [ ] Lot에 Strategy 적용 → PositionRule 복사 생성 확인
- [ ] Strategy의 StrategyRule 수정 후 해당 Lot의 PositionRule 값 불변 확인
- [ ] Strategy 삭제 후에도 PositionRule 유지 확인

### 부분 매도 테스트
- [ ] 매도 후 `remaining_quantity` 정확히 차감 확인
- [ ] sell_history 레코드 생성 확인
- [ ] `is_executed = true` 업데이트 확인
- [ ] 동일 PositionRule 중복 실행 시 오류 또는 차단 확인
- [ ] 전량 매도 후 remaining_quantity = 0 확인

### 수익 계산 테스트
- [ ] 미국 주식 수익률 계산 시 환율 적용 확인
- [ ] 실현 수익 + 미실현 수익 = 총 수익 일치 확인
- [ ] remaining_quantity = 0인 Lot의 미실현 수익 = 0 확인

### 사용자 격리 테스트
- [ ] 사용자 A의 Lot을 사용자 B가 조회 불가 확인
- [ ] API 응답에 다른 사용자 데이터 미포함 확인

### 전략 테스트
- [ ] PositionRule 목표수익률 도달 여부 판단 로직 정확성
- [ ] 매도 비율 계산 정확성 (remaining_quantity 기준)

---

## 화면별 필수 표시 항목

| 화면 | 필수 표시 항목 |
|------|---------------|
| 대시보드 | 총투자원금, 총평가금액, 실현수익, 미실현수익, 전체수익률 |
| 포트폴리오 | 종목별 평가금액, 수익률, Lot 개수 |
| 종목 상세 | Lot 목록, Lot별 수익률, 매도전략 상태 |
| Lot 상세 | 매수가, initial_qty, remaining_qty, 현재가, 수익률, PositionRule 목록, 매도기록 |
| 매도 히스토리 | 매도가, 수량, 매도일, 수익률, 실현수익, 기간필터 |
| 관심종목 | 종목명, 현재가, 변동률 |
| 설정 | 기본전략, 알림설정, 환율기준 |

---

## 기술 스택 제약

- **배포**: Linux 서버 (Windows 전용 기능 사용 금지)
- **인증**: Google OAuth 2.0 (자체 인증 시스템 불필요)
- **환율 API**: ExchangeRate-API (다른 API로 임의 대체 금지)
- **주식 API**: 한국/미국 현재가 모두 조회 가능해야 함
- **UI**: 반응형 웹 (모바일 대응 필수)

---

## MVP 범위 (우선 개발)

✅ Google 로그인  
✅ 종목 검색  
✅ Lot 등록  
✅ Lot별 현재가/수익률 계산  
✅ 매도 전략 생성 및 Lot 적용  
✅ PositionRule 복사 저장  
✅ 부분 매도 처리  
✅ 매도 히스토리 저장  
✅ 대시보드 기본 정보  
✅ 관심종목  
✅ 월/연도별 통계 기초  

❌ 브라우저 푸시 알림 (추후)  
❌ 포트폴리오 비중 차트 (추후)  
❌ 수익률 추이 차트 (추후)  
❌ 손절 기준 설정 (추후)  
❌ 배당 수익 관리 (추후)  
❌ 모바일 앱 확장 (추후)  

---

## AI에게 지시할 때 사용 문구 예시

```
이 체크리스트(AI_개발_필수체크리스트.md)를 기준으로,
[구현할 기능명]을 개발해줘.
특히 Lot 독립성과 PositionRule 불변성 원칙을 반드시 지켜줘.
```
