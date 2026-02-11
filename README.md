# Staywise Agent

AI 네이티브 호텔 예약 시스템 — MCP 기반 모노레포 프로젝트.

## 구조

- **frontend** — Next.js + Tailwind 4 (예약 UI, AI 채팅)
- **backend** — FastAPI 백엔드 (비즈니스 로직, DB)
- **apps/mcp-bridge** — MCP 서버 (호텔 검색/예약 도구)
- **packages/shared-types** — Zod/Pydantic 공통 스키마
- **packages/database** — DB 모델 (PostgreSQL/pgvector)

## 시작

```bash
pnpm install
```
