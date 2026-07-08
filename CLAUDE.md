# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**智学通** - AI试卷批改与远程打印平台

- Scanner uploads class exam PDFs via WebDAV
- AI automatically splits pages, performs OCR, grades, and adds red ink annotations
- Generates two PDF types: merged (original + annotations) and overlay (annotations only for re-feeding paper)
- Teacher reviews, then sends to intranet printer with one click
- Supports double-sided exams, WebDAV auto-discovery, FRP intranet penetration, and stress testing

## Tech Stack

- **Framework**: Next.js 16 App Router (React 19), `output: 'standalone'`
- **Auth**: NextAuth (Credentials JWT)
- **Database**: PostgreSQL + Prisma ORM 5.22.0 (locked, Prisma 7 incompatible)
- **Queue**: Postgres `SELECT FOR UPDATE SKIP LOCKED` polling (single-process, no Redis)
- **AI**: SiliconFlow API (Qwen VL for OCR + Qwen3.6 for grading)
- **PDF**: pdf-lib + @pdf-lib/fontkit (embeds NotoSansSC Chinese fonts)
- **PDF Rasterization**: pdfjs-dist + node-canvas (server-side JPG rendering)
- **Printing**: Node.js `net.Socket` (RAW 9100) / `ipp` npm library (IPP 631)
- **Deployment**: Docker + docker-compose, single process running UI/API/queue/WebDAV poller

## Common Commands

### npm Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Generate Prisma client and build production bundle |
| `npm run start` | Start Next.js production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:seed` | Seed database with test data |
| `npm run db:setup` | Full DB setup: generate + push + seed |

### Docker Compose

| Command | Description |
|---------|-------------|
| `docker compose up -d --build` | Build and start app + PostgreSQL containers |
| `docker compose logs -f app` | Follow app logs |
| `docker compose logs -f postgres` | Follow PostgreSQL logs |
| `docker compose restart app` | Restart app (after .env changes) |
| `docker compose down` | Stop and remove containers (keeps data) |
| `docker compose down -v` | Stop, remove containers and DELETE volumes (⚠️ destroys data) |
| `docker compose exec app sh` | Open shell in app container |

### Utility Scripts

| Command | Description |
|---------|-------------|
| `npx tsx scripts/test-lib.mjs` | Core library unit tests (planner/duplicatePdf/render) |
| `npx tsx scripts/verify-pdf.ts <pdf-file>` | Verify PDF validity |
| `npx tsx scripts/make-test-pdf.mjs` | Generate 6-page mock exam PDF |

### Local Printer Testing (without real printer)

```bash
# Terminal 1: Listen on 9100 and save to PDF
nc -l 9100 > /tmp/recv.pdf

# Terminal 2: Start dev server, click "Send Print" in browser
npm run dev
```

## High-Level Architecture

### Project Structure

```
├── prisma/                      # Prisma schema & migrations
├── public/fonts/                # Embedded Chinese fonts (NotoSansSC)
├── scripts/                     # Test/seed/utility scripts
├── src/
│   ├── instrumentation.ts       # Next.js startup hook (starts queue scheduler)
│   ├── app/
│   │   ├── login/               # Login page
│   │   ├── teacher/
│   │   │   ├── page.tsx         # Dashboard (pending review/grading/print queue)
│   │   │   ├── batches/         # Batch list + details
│   │   │   ├── submissions/[id]/review/  # Core review page (annotation canvas + toolbar + print)
│   │   │   └── settings/        # Printer config + testing
│   │   ├── parent/              # Parent portal (preserved)
│   │   └── api/
│   │       ├── batches/         # Batch upload/list/detail/resplit
│   │       ├── sheets/[id]      # Correct student identity
│   │       ├── submissions/     # full/annotations/approve/print
│   │       ├── pdfs/[id]        # PDF streaming download
│   │       ├── storage/[...key] # Protected file access
│   │       ├── print-jobs/      # Print queue list/retry/cancel
│   │       ├── print/stress-test # Stress test: copy N copies into big PDF
│   │       ├── printers/test    # Test printer connection
│   │       └── webhooks/webdav  # Scanner upload callback
│   ├── components/
│   │   ├── annotate/            # PaperCanvas + AnnotationLayer(SVG) + Toolbar + useAnnotations
│   │   ├── batches/SheetCard    # Exam thumbnail cards
│   │   └── print/PrintButton, PrintQueue
│   └── lib/
│       ├── storage/local.ts     # Local file storage (/data/storage)
│       ├── ocr/parsePaper.ts    # VL OCR (bbox coordinates + double-sided + name field)
│       ├── ai/grade.ts          # Grading logic (local objective + AI subjective)
│       ├── annotate/planner.ts  # Annotation planning (√/×/-N/comment/total + IOU avoidance)
│       ├── pdf/
│       │   ├── rasterize.ts     # PDF→JPG (pdfjs + node-canvas)
│       │   ├── split.ts         # Split by 2 pages/student
│       │   └── render.ts        # renderMergedPdf / renderOverlayPdf / duplicatePdf
│       ├── webdav/client.ts     # WebDAV client
│       ├── queue/
│       │   ├── scheduler.ts     # 2s polling with FOR UPDATE SKIP LOCKED
│       │   ├── dispatcher.ts    # Job routing + retry backoff
│       │   ├── webdav-poller.ts # WebDAV polling for new files
│       │   └── jobs/            # split/ocr/grade/annotate/render/stress_gen/print
│       └── print/
│           ├── raw.ts           # TCP 9100 RAW printing
│           ├── ipp.ts           # IPP 631 printing
│           └── index.ts         # Protocol dispatch
```

### Key Data Models (prisma/schema.prisma)

- **User**: Teacher/parent users
- **Class**: Classes taught by teachers
- **Student**: Students in classes
- **Homework**: Assignments/exams with answer key
- **Question**: Individual questions with bbox positions
- **Submission**: Student submissions with grading results
- **PaperBatch**: A scanned batch (full class PDF)
- **PaperSheet**: Individual student exam split from batch
- **Annotation**: Annotations in percentage coordinates (√/×/score/comment/circle/underline)
- **GeneratedPdf**: Generated PDFs (merged or overlay)
- **PrintJob**: Print jobs tracking
- **Job**: Async queue jobs (split/ocr/grade/annotate/render/print)
- **WebdavSeen**: WebDAV processed files dedup

### Workflow

```
Scanner finishes → WebDAV folder → webhook/poll detection
                            ↓
            POST /api/webhooks/webdav
                            ↓
            Create PaperBatch → enqueue split
                            ↓
            split: Split PDF by pagesPerStudent (default 2) → N PaperSheets
                            ↓
            Parallel ocr × N: VL recognize each page → name/studentNo/question bboxes/answers
                            ↓
            Parallel grade × N: Local objective scoring + AI subjective
                            ↓
            Parallel annotate × N: planner generates annotation coords + IOU avoidance
                            ↓
            Parallel render × N: Generate merged.pdf + overlay.pdf
                            ↓
            batch.status=ready → Teacher review page:
              · View SVG annotations over original
              · Drag/add/delete/change score/correct student
              · Click "Send Print" → create PrintJob
                            ↓
            Serial print: TCP connect to PRINTER_HOST:PORT → send PDF bytes
                            ↓
                      Paper output 🎉
```

## Key Configuration Files

- `package.json`: Dependencies (Prisma locked at 5.22.0)
- `docker-compose.yml`: App + PostgreSQL services
- `Dockerfile`: Multi-stage build (node:20-alpine)
- `next.config.ts`: `output: 'standalone'`, 200MB body limit, external packages
- `prisma/schema.prisma`: Database schema
- `.env.local.example`: Local dev env vars template
- `env.docker.example`: Docker env vars template
- `docker-entrypoint.sh`: Container startup (runs migrations)

## Important Notes

### Prisma Version Lock

The project explicitly locks Prisma at **5.22.0** - Prisma 7 is incompatible with the existing schema. The Dockerfile ensures this by force-installing prisma@5.22.0 after npm install.

### Docker Build Notes

- Uses `npm install` instead of `npm ci` because Mac-generated lockfiles lack linux-musl native binaries
- Rebuilds lightningcss, sharp, and canvas for musl libc
- `output: 'standalone'` in next.config.ts creates minimal production bundle

### Queue System

- Built-in Postgres-based queue (no Redis)
- Polls every 2 seconds using `SELECT FOR UPDATE SKIP LOCKED`
- Started via `instrumentation.ts` on server boot when `RUN_QUEUE=1`
- Also handles WebDAV polling (configurable interval)

### Printing Requirements

- Printer must natively support **PDF Direct Print** (most 2015+ enterprise laser printers, IPP Everywhere/AirPrint/Mopria certified)
- Two protocols: RAW (port 9100, default) or IPP (port 631)
- FRP + OpenWrt for intranet printer access

### Demo Credentials

- Teacher: `teacher` / `123456`
- Parent: `parent` / `123456`
