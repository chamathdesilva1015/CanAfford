# CanAfford 🇨🇦

### Beyond the Budget. The Ultimate AI Tenant Protection & Real Estate Execution Engine.

**CanAfford doesn't just filter rentals — it calculates the *True Cost of Living* by factoring in 2026 transit passes, grocery inflation, and commute distances, then goes further by auditing your prospective lease for illegal clauses and generating real-time neighborhood intelligence.** This is the app that turns renters from victims of hidden costs into informed, protected tenants.

> *"Ending hidden rental costs and predatory leasing in Canada."*

---

## ⚡ Powered By

| Technology | Role |
|---|---|
| **Google Gemini 2.5 Flash (Search Grounding)** | We do **NOT** use stale LLM training data. Every query scrapes the **live internet** for 2026 rental pricing, active listing URLs, Ontario RTA case law, and neighborhood crime stats — all in real time. |
| **ElevenLabs AI (Text-to-Speech)** | Multimodal accessibility layer. Every property card includes an **Audio Affordability Brief** — a synthesized voice summary of the rent, commute, and neighborhood data so users can listen while browsing. |
| **React + TypeScript** | Fully typed, component-driven SPA with modular architecture. |
| **Leaflet.js** | Interactive geographic mapping with live coordinate plotting for every listing. |
| **Auth0** | Secure authentication with persistent user preference storage (Memory Vault). |
| **Node.js + Express** | Lightweight backend API for budget persistence and affordability logic. |

---

## 🏗️ The Arsenal — Core Features

### 📊 The True Cost Engine

Most rental apps show you **base rent** and stop there. CanAfford calculates the **actual monthly burden** by dynamically layering:

- **Rent** — Extracted from live listings via Gemini Search Grounding (Realtor.ca, Rentals.ca, Kijiji)
- **Transit** — The exact 2026 TTC Adult Pass ($156) or Student U-Pass ($128), Ottawa OC Transpo ($138.50), and more
- **Groceries** — Statistics Canada's solo-living grocery average ($401/mo), adjusted for dietary focus (Budget / Health / Family)

Every listing is classified as **Affordable**, **Stretch**, or **Unavailable** — with full math transparency on every card.

---

### 🛡️ The RTA Lease Advocate

**Predatory landlords rely on tenants not knowing the law.** Our AI Paralegal scans any uploaded Ontario lease agreement and flags illegal clauses — citing the **exact section** of the Ontario Residential Tenancies Act (RTA), 2006:

- ❌ **"No Pets" clauses** — Void under RTA Section 14
- ❌ **Post-dated cheque requirements** — Illegal under RTA Section 108
- ❌ **Damage/security deposits** beyond last month's rent — RTA Sections 105/106
- ❌ **Forced professional cleaning** — Not enforceable under the RTA
- ✅ **Green Flags** — Compliant clauses are also identified with RTA citations

Every Red Flag includes a **clickable reference link** to the official Ontario e-Laws page. A permanent legal disclaimer ensures users verify findings with the LTB or a licensed paralegal.

---

### 🕵️ Neighborhood Deep-Dive

Click **"Run Deep Neighborhood Background Check"** on any listing to trigger an on-demand AI investigation of the specific address:

- **Landlord/Building Reputation** — Summarized Reddit threads, Google reviews, and news articles
- **Safety & Crime Profile** — Local police data and crime trend analysis
- **Environmental Vibe** — Noise levels, green spaces, and resident demographics

Every claim is returned as a **scannable bullet point** with an inline **source citation** and optional clickable URL — no dense paragraphs, no hallucinated data.

---

### ⚡ Execution & Logistics Toolkit

- **Roommate Pivot Toggle** — Instantly divide rent by 2 while keeping transit and groceries at the single-person rate. Watch "Unavailable" listings flip to "Affordable" in real time.
- **1-Click Intro Email** — AI-generated, tailored introduction email to the landlord using your exact profile (Student/Professional, budget, preferences). Copy to clipboard and send.
- **Lease Red Flag Scanner** — Available in the side panel for quick scans using a mock Ontario lease template.
- **Audio Affordability Briefs** — ElevenLabs-powered voice summaries for every property.

---

## 🚀 Quick Start (For Judges)

### Prerequisites

- **Node.js** v18+
- **npm** v9+

### Installation

```bash
# Clone the repository
git clone https://github.com/chamathdesilva1015/CanAfford.git
cd CanAfford

# Install all dependencies (frontend + backend)
npm run build

# Start the development server
cd frontend && npm run dev
```

The app will be available at **http://localhost:5173**.

### Required Environment Variables

Create a `.env` file in the `/frontend` directory:

```env
VITE_GEMINI_API_KEY=your_google_gemini_api_key
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key
VITE_CLOUDINARY_CLOUD_NAME=demo
```

> **Note:** The Gemini API key requires the **Generative Language API** enabled with Google Search Grounding capabilities. Free tier supports 15 RPM.

---

## 📁 Project Structure

```
CanAfford/
├── frontend/          # React + TypeScript SPA
│   ├── src/
│   │   ├── components/    # Dashboard, Advocate, SmartInsightPanel, etc.
│   │   ├── services/      # geminiService.ts, voiceService.ts
│   │   ├── hooks/         # useBackboard (state management)
│   │   └── auth/          # Auth0 provider configuration
│   └── .env               # API keys (not committed)
├── backend/           # Node.js + Express API
│   ├── index.js           # Server entry point
│   └── tests/             # Affordability logic tests
└── package.json       # Monorepo build & start scripts
```

---

## 🏛️ Built for Ontario

**Grounded in the 2026 Residential Tenancies Act. Powered by real-time Google Search Grounding. Designed to protect Canadian tenants.**

---

<p align="center"><strong>© 2026 CanAfford Inc.</strong> — Built with 🤖 Gemini AI & ❤️ in Ontario, Canada.</p>
