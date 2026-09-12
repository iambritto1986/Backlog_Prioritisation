# Product Planner & Collaborative Prioritization Working Board

A collaborative requirement and backlog prioritization working board designed to turn project spreadsheets into structured, facilitated working sessions. Teams evaluate business value, vote on priorities, record shared discussion notes, resolve validation gaps, assign follow-up action items, and agree on delivery plans in real-time.

![Product Planner](https://img.shields.io/badge/PRD%20Compliance-12%2F12%20Verified-gold?style=for-the-badge)
![Deploy to Render](https://img.shields.io/badge/Deploy%20to-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)
![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

---

## 🌟 Key Capabilities

### 1. Interactive Multi-Mode Working Board
- **Priority Board (`P0` to `P3`)**: Group deliverables by priority with 1-click quick-reassignment and Delphi consensus indicators.
- **Workshop Disposition Board**: Sort by agreed outcomes (**Selected**, **Reserve**, **Defer**, **Drop**, **Needs Validation**, **Not Discussed**).
- **Value vs Effort 2x2 Matrix**: Quad view for strategic decision-making:
  - 🟢 **Quick Wins** (High Value, Small Effort)
  - 🟡 **Strategic Bets** (High Value, Large Effort)
  - 🔵 **Fill-ins / Incremental** (Medium/Low Value, Small Effort)
  - ⚪ **Thankless Tasks / Reconsider** (Low Value, Large Effort)
- **Workstream Tracks**: Organized by autonomous tracks of work with track leads and progress meters.
- **Delivery Stage Kanban**: Requirements &rarr; Architecture &rarr; Development &rarr; Testing &rarr; Delivered.

### 2. Live Working Session Drawer
- Slide-over collaborative drawer on any card allowing real-time editing of:
  - **Proposed Priority** vs Preserved Project Priority
  - **Story Points (Complexity)**
  - **Quad Sizing**: Business Value, Member/Customer Impact, Urgency, Effort
  - **Workstream Rank** with automatic duplicate rank reordering
  - **Milestone Outcome** & Target Horizon
  - **Team Rationale** & Shared Discussion Notes
  - **Validation Needs** & Unresolved Questions
  - **Follow-up Action Items** with assigned owner and target due date
  - **Threaded Stakeholder Comments** feed

### 3. Live Delphi Planning Poker & Priority Voting
- Blind voting round controls for the Facilitator.
- Support for **Story Points Fibonacci pad** (`1, 2, 3, 5, 8, 13, 21, ?`), **Priorities** (`P0–P3`), or **Dispositions**.
- Real-time voter tracking and participation counter.
- Automated average story point computation, vote distribution bar chart, and 1-click consensus confirmation directly into card records.

### 4. Excel & CSV Import Engine with Safe Re-Import
- 5-step guided import wizard supporting `.xlsx`, `.xls`, and `.csv`.
- Automatic worksheet selector and custom header row detector.
- Intelligent column auto-mapping with live row preview.
- **Display-Only Owner Resolution**: Imported names appear immediately without inventing fake email addresses or sending unverified invitations. Explicit **TBD gaps** are flagged.
- **Safe Re-import**: Choose between *Update by Record ID* (preserves in-session notes/comments) and *Append as New*.
- 1-click fictional dataset loader with full sample backlog.

### 5. Comprehensive 5-Way Export Suite
- 📊 **Full Project 8-Sheet Excel Workbook**: `README`, `Cards`, `Workstreams`, `People & Assignments`, `Session Assessments`, `Comments`, `Decisions`, `Follow-up Actions`.
- 📑 **Session Results Excel**: Executive summary, KPI breakdown, deliverable decisions, comments, action items.
- 📁 **Filtered CSVs**: Filtered deliverables, follow-up action items, comments.
- 🌐 **Self-Contained Standalone HTML Snapshot**: High-contrast, responsive visual snapshot for offline distribution.
- 📋 **1-Click Markdown Summary**: Ready for Slack, Microsoft Teams, Jira, or Executive Email reports.

### 6. Multi-User Collaboration & Facilitator Controls
- **Presence Cursors**: Labeled cursors showing live participant locations across the workspace.
- **"Bring Everyone Here"**: Facilitator broadcast that navigates all connected attendees to the active deliverable.
- **"Follow Facilitator" / "Free Explore"**: Attendee toggle to follow the leader or review independently.
- **Simultaneous Edit Conflict Protection**: Non-destructive visual conflict resolution modal preventing silent overwrites.

---

## 🎨 Visual Design System

- **Navigation Shell**: Refined Matte Charcoal (`#121417`, `#18191c`, `#20222a`)
- **Accent Palette**: Restrained Warm Gold & Amber (`#d4af37`, `#fcd34d`, `#b45309`)
- **Content Surfaces**: High-contrast, readable surfaces (`#faf9f5`, `#f3f4f6`, `#ffffff`)
- **Theme Toggle**: Instant switch between Matte Charcoal dark theme and Warm Light mode.

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn or bun

### 1. Clone & Install
```bash
git clone https://github.com/iambritto1986/Backlog_Prioritisation.git
cd Backlog_Prioritisation
npm install
```

### 2. Development Mode
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build & Test Server
```bash
npm run build
npm start
```
The server will start on [http://localhost:3000](http://localhost:3000) with health check at `/api/health`.

---

## ☁️ Deploying to Render

This repository is pre-configured for instant zero-configuration deployment to [Render](https://render.com).

### Option 1: Using the Render Blueprint (`render.yaml`)
1. Push this repository to your GitHub account: `https://github.com/iambritto1986/Backlog_Prioritisation.git`
2. In Render Dashboard, click **New +** &rarr; **Blueprint**.
3. Connect your GitHub repository `Backlog_Prioritisation`.
4. Render will automatically read `render.yaml`, run `npm install && npm run build`, and launch the web service using `npm start`.

### Option 2: Manual Web Service in Render Dashboard
1. Click **New +** &rarr; **Web Service**.
2. Select your repository `Backlog_Prioritisation`.
3. Set the following settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
4. Click **Deploy Web Service**.

---

## 🏛️ Architecture & Services

The application follows clean architectural separation behind pluggable service interfaces:

- **`IPersistenceService`**: Abstracts data storage. Supports browser local storage with seed data defaults and is plug-and-play ready for Firebase Firestore or Cloud SQL backends.
- **`IPresenceService`**: BroadcastChannel and WebSocket synchronization for multi-tab collaboration, presence heartbeats, live cursors, facilitator commands, and Delphi voting rounds.
- **`IAuthService`**: Multi-role personas (`Workspace Admin`, `Project Lead`, `Facilitator`, `Editor`, `Contributor`, `Viewer`) with verified access and invitation code redemption.

---

## 📜 PRD Verification & Acceptance

The application includes an in-app **PRD Verification Checklist** (accessible via the header badge) testing all 12 acceptance criteria defined in the Product Requirements Document.
