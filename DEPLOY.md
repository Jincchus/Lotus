# Lotus — 배포 및 운영 가이드

> 이 문서는 서버 접근 권한이 있는 팀원이 처음부터 배포하거나 유지보수할 수 있도록 작성되었습니다.

---

## 목차

1. [서버 정보](#1-서버-정보)
2. [기술 스택 및 포트 구성](#2-기술-스택-및-포트-구성)
3. [서버 사전 요구사항](#3-서버-사전-요구사항)
4. [환경변수 설정](#4-환경변수-설정)
5. [최초 배포 절차](#5-최초-배포-절차)
6. [Nginx 설정](#6-nginx-설정)
7. [SSL 인증서](#7-ssl-인증서)
8. [서비스 관리 (PM2)](#8-서비스-관리-pm2)
9. [DB 관리](#9-db-관리)
10. [코드 업데이트 배포](#10-코드-업데이트-배포)
11. [트러블슈팅](#11-트러블슈팅)

---

## 1. 서버 정보

| 항목 | 값 |
|------|-----|
| OS | Ubuntu Linux |
| 서버 사설 IP | `192.168.0.8` |
| 서버 공인 IP | `121.130.218.79` |
| 도메인 | `blotus.duckdns.org` (DuckDNS 무료 도메인) |
| SSH 접속 | `ssh server@192.168.0.8` |
| 프로젝트 경로 | `~/Lotus` |
| GitHub | `https://github.com/Jincchus/Lotus` |

### 공유기 포트포워딩 (ipTIME)
| 외부 포트 | 내부 IP | 내부 포트 | 용도 |
|-----------|---------|-----------|------|
| 80 | 192.168.0.8 | 80 | HTTP → HTTPS 리다이렉트 |
| 443 | 192.168.0.8 | 443 | HTTPS (Nginx) |
| 3001 | 192.168.0.8 | 3001 | 백엔드 직접 접근 (선택) |

---

## 2. 기술 스택 및 포트 구성

| 서비스 | 포트 | 설명 |
|--------|------|------|
| Next.js (프론트엔드) | 3000 | PM2로 실행 |
| NestJS (백엔드) | 3001 | PM2로 실행 |
| PostgreSQL | 5432 | Docker 컨테이너 |
| Nginx | 80, 443 | 리버스 프록시 |

외부에서는 모두 `https://blotus.duckdns.org` 단일 도메인으로 접근:
- `/` → 프론트엔드 (localhost:3000)
- `/api/*` → 백엔드 (localhost:3001)

---

## 3. 서버 사전 요구사항

### Node.js 20 설치
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # v20.x.x 확인
```

### Docker 설치
```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER  # 현재 사용자명으로 자동 적용됨
# 로그아웃 후 재로그인해야 적용됨
```

### Nginx + Certbot 설치
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### PM2 설치
```bash
sudo npm install -g pm2
```

---

## 4. 환경변수 설정

프로젝트 루트(`~/Lotus/.env`)에 아래 파일을 생성합니다.  
**실제 값은 프로젝트 오너에게 문의하세요.**

```bash
nano ~/Lotus/.env
```

```env
# Google OAuth
GOOGLE_CLIENT_ID=           # Google Cloud Console에서 발급
GOOGLE_CLIENT_SECRET=       # Google Cloud Console에서 발급
GOOGLE_CALLBACK_URL=https://blotus.duckdns.org/api/auth/google/callback

# 환율 API (https://www.exchangerate-api.com)
EXCHANGE_RATE_API_KEY=      # ExchangeRate-API에서 발급 (무료 플랜 가능)

# DB (docker-compose와 일치해야 함)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=finance_user
DB_PASSWORD=finance_password
DB_DATABASE=finance_db

# JWT (랜덤 문자열, 길수록 좋음)
JWT_SECRET=                 # 임의의 긴 문자열 입력

# 프론트엔드 URL (CORS 허용)
FRONTEND_URL=https://blotus.duckdns.org
```

### 프론트엔드 환경변수
```bash
nano ~/Lotus/apps/frontend/.env.local
```

```env
NEXT_PUBLIC_BACKEND_URL=https://blotus.duckdns.org
```

### Google Cloud Console 설정
1. [console.cloud.google.com](https://console.cloud.google.com) 접속
2. APIs & Services → Credentials → OAuth 2.0 클라이언트
3. **승인된 리디렉션 URI** 에 아래 추가:
   ```
   https://blotus.duckdns.org/api/auth/google/callback
   ```

---

## 5. 최초 배포 절차

```bash
# 1. 프로젝트 클론
git clone https://github.com/Jincchus/Lotus.git
cd Lotus

# 2. 환경변수 파일 생성 (위 섹션 4 참고)

# 3. PostgreSQL 실행
docker compose up -d
docker ps  # finance_db 컨테이너 확인

# 4. 백엔드 설치 및 마이그레이션
cd apps/backend
npm install
npm run migration:run
npm run seed
npm run build

# 5. 프론트엔드 설치 및 빌드
cd ../frontend
npm install
npm run build

# 6. PM2로 서비스 실행
cd ~/Lotus/apps/backend
pm2 start dist/main.js --name lotus-backend

cd ~/Lotus/apps/frontend
pm2 start npm --name lotus-frontend -- start

# 7. PM2 재부팅 자동 시작 등록
pm2 startup   # 출력된 sudo 명령어 복사 후 실행
pm2 save

# 8. 상태 확인
pm2 list
```

---

## 6. Nginx 설정

```bash
sudo nano /etc/nginx/sites-available/lotus
```

아래 내용 입력:

```nginx
server {
    listen 443 ssl;
    server_name blotus.duckdns.org;

    ssl_certificate /etc/letsencrypt/live/blotus.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/blotus.duckdns.org/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name blotus.duckdns.org;
    return 301 https://$host$request_uri;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/lotus /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## 7. SSL 인증서

### 최초 발급
```bash
# Nginx 중지 후 발급
sudo systemctl stop nginx
sudo certbot certonly --standalone -d blotus.duckdns.org --email your@email.com --agree-tos
sudo systemctl start nginx
```

### 자동 갱신 확인
Let's Encrypt 인증서는 90일마다 만료됩니다. Ubuntu는 설치 시 자동 갱신 타이머가 등록됩니다.

```bash
# 타이머 상태 확인
sudo systemctl status certbot.timer

# 갱신 테스트
sudo certbot renew --nginx --dry-run
```

---

## 8. 서비스 관리 (PM2)

```bash
# 상태 확인
pm2 list

# 로그 확인
pm2 logs lotus-backend
pm2 logs lotus-frontend

# 재시작
pm2 restart lotus-backend
pm2 restart lotus-frontend

# 중지
pm2 stop lotus-backend

# 전체 재시작
pm2 restart all
```

---

## 9. DB 관리

### PostgreSQL 컨테이너
```bash
# 시작/중지
docker compose up -d
docker compose down

# 컨테이너 접속
docker exec -it finance_db psql -U finance_user -d finance_db

# 데이터 볼륨 위치
# Docker volume: postgres_data
```

### 마이그레이션
```bash
cd ~/Lotus/apps/backend

# 마이그레이션 실행
npm run migration:run

# 마이그레이션 되돌리기
npm run migration:revert

# 마이그레이션 상태 확인
npm run migration:show
```

### 시드 데이터 (증권사 목록 등 기초 데이터)
```bash
cd ~/Lotus/apps/backend
npm run seed
```

---

## 10. 코드 업데이트 배포

```bash
cd ~/Lotus

# 최신 코드 가져오기
git pull origin main

# 백엔드 업데이트
cd apps/backend
npm install
npm run migration:run   # 새 마이그레이션 있을 경우
npm run build
pm2 restart lotus-backend

# 프론트엔드 업데이트
cd ../frontend
npm install
npm run build
pm2 restart lotus-frontend
```

---

## 11. 트러블슈팅

### 서비스 접속 안 됨
```bash
pm2 list                    # 서비스 상태 확인
pm2 logs lotus-backend      # 백엔드 오류 확인
sudo systemctl status nginx # Nginx 상태 확인
docker ps                   # DB 컨테이너 확인
```

### DB 연결 오류
- `.env`의 `DB_PASSWORD`와 `docker-compose.yml`의 `DB_PASSWORD`가 일치하는지 확인
- `docker compose up -d`를 반드시 **프로젝트 루트(`~/Lotus`)에서** 실행해야 `.env`를 읽음

### Google 로그인 403 오류
- Google Cloud Console에서 리디렉션 URI 등록 여부 확인
- 카카오톡 등 인앱 브라우저에서는 Google OAuth 차단됨 → Chrome/Safari에서 접속

### Certbot 포트 80 충돌
```bash
sudo systemctl stop nginx
sudo certbot renew --standalone
sudo systemctl start nginx
# 또는 nginx 플러그인 사용:
sudo certbot renew --nginx
```

### 프론트엔드가 localhost:3001로 요청
- `apps/frontend/.env.local`에 `NEXT_PUBLIC_BACKEND_URL=https://blotus.duckdns.org` 설정 확인
- 설정 후 `npm run build` + `pm2 restart lotus-frontend` 필요
