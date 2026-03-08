# CanAfford

**Don't just find a place to live. Find out if you can actually afford to survive there.**

---

## The Core Problem: The Hidden Math of Survival

The modern rental market is broken, and base rent is a lie. Renters—especially students transitioning from dorms to the real world like us at McMaster University—get blindsided by the 'hidden math' of independent living. You find a place for $1,600 a month, but no one calculates the localized grocery inflation of that specific neighborhood, or the sudden $150 transit pass you now need because the apartment is in a transit desert. 

The **'Information Silo'** problem makes this mathematically impossible for the average renter to solve manually:
- **Financial Silos:** Rent prices are on Kijiji, while cost-of-living data is buried in StatCan reports.
- **Geographic Silos:** Commute times require manual Google Maps queries for every single listing.
- **Legal Silos:** Predatory landlords rely on young renters not knowing their rights. Illegal "No Pets" clauses or illegal "Damage Deposits" are slipped into standard leases, bleeding tenants dry before they even move in.

We built CanAfford to smash these silos. The engine doesn't just show you houses; it calculates exactly how much it will cost you to stay alive in them.

---

## The Solution: A Financial Reality Engine

CanAfford is a localized, AI-powered real estate engine designed to compute the "True Cost" of a property. We intercept the search process and inject real-world financial friction before a renter signs a lease.

### Core Features

*   **The True Cost Engine**: This is the heart of the platform. We aggregate base rent, calculate localized 2026 transit data (routing between Adult vs. Student passes dynamically), and blend in grocery inflation data. We map this against the user's dietary focus (Budget vs. Premium) to project actual survival costs.
*   **The Roommate Pivot**: A dynamic, global UI toggle that instantly recalculates the financial viability of the entire map. By dividing rent burdens among roommates, previously "Red" (Unaffordable) zones instantly flip to "Green" (Affordable), exposing entirely new housing markets.
*   **The Implicit Learner (Behavioral Vault)**: Renters often lie to themselves about their budget. The Vault tracks the properties a user actually saves, analyzes their behavior via LLM, and highlights the gap between their *Stated* preferences and their *Revealed* reality. If they state a budget of $1500 but quietly save $2100 listings, the AI steps in to recalibrate their reality.
*   **AI Lease Advocate**: Users paste a prospective lease into the Advocate engine. The AI audits the contract line-by-line, acting as a strict Ontario paralegal. It categorizes clauses into Standard, Unusual, and Illegal—explicitly citing the Ontario Residential Tenancies Act (RTA) to void illegal pet bans or guest fees instantly.

---

## The Tech Stack: Driven by Next-Gen AI

CanAfford isn't a wrapper; it's a deeply integrated intelligence platform built on powerful infrastructure.

*   **Google AI Studio & Gemini 2.5 Flash**: Powers the core analytical intelligence. We engineered extremely strict, low-temperature JSON schemas to force Gemini to act as a precision data-extraction engine and an Ontario paralegal, stripping away conversational hallucination in favor of hard JSON arrays.
*   **Google Search Grounding**: We bypass static, outdated datasets. Grounding is used alongside Gemini to pull live, real-time 2026 rental inventory directly from the web, and to cite specific, up-to-date sections of the Ontario e-Laws database for legal red flags.
*   **Backboard API (Memory State)**: We utilized Backboard for bi-directional memory management. It doesn't just read static user profiles; our 'Implicit Learner' architecture autonomously writes revealed behavioral updates *back* to the Backboard memory, allowing the application's intelligence to evolve alongside the user.
*   **Vultr Cloud Compute**: The engine is deployed live on a high-performance, Toronto-based bare-metal instance. We used Vultr to bypass standard serverless timeouts, providing the sustained, low-latency backend required to process massive NLP payloads and heavy geographic mapping operations instantly.
*   **ElevenLabs Voice AI**: Integrated state-of-the-art Text-to-Speech (TTS) to transform dense, complex financial breakdowns and legal lease audits into accessible, natural-sounding audio briefs. Users can listen to their financial reality while navigating the map.
*   **Frontend Architecture**: React, Vite, and TailwindCSS, layered with "Holy Grail" CSS grids and React-Leaflet for spatial mapping.

---

## How to Run Locally

Get the True Cost engine running on your own machine.

1.  **Clone the infrastructure:**
    ```bash
    git clone https://github.com/chamathdesilva1015/CanAfford.git
    cd CanAfford
    ```

2.  **Initialize the monorepo:**
    ```bash
    npm install
    # Note: If running via root workspaces, ensure dependencies for both /frontend and /backend are mapped.
    ```

3.  **Secure your Environment:**
    Create a `.env` file in your `/frontend` directory containing your vital API keys:
    ```env
    VITE_GEMINI_API_KEY=gemini_key
    VITE_CLOUDINARY_CLOUD_NAME=dummy_cloud_name
    VITE_CLOUDINARY_UPLOAD_PRESET=dummy_preset
    VITE_ELEVENLABS_API_KEY=elevenlabs_key
    ```

4.  **Ignite the Engine:**
    ```bash
    npm run dev
    ```

---

## The Future Roadmap: Scaling Tenant Power

CanAfford is currently optimized for the Ontario market, but the architecture is built to scale tenant power globally.

*   **Multi-Roommate Backboard Syncing**: Moving beyond single-player mode. We will synchronize budgets and geographic constraints across multiple users, calculating the optimal central nexus for 3-4 roommates looking for shared housing based on all their distinct commute destinations.
*   **Direct Landlord Verification**: Integration with municipal databases to score the legitimacy of landlords and buildings directly within the platform, flagging notorious slumlords before a viewing is even booked.
*   **Blockchain-Timestamped Maintenance Log**: A secure vault for tenants to track and log maintenance issues. Photos of mold, broken heaters, or damages will be cryptographically locked with timestamps, providing bulletproof legal protection for LTB (Landlord and Tenant Board) hearings.

---
*Built with ❤️ for the ultimate rental survival experience. Survive the market. Know your math.*
