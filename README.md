# CanAfford: Predictive Budgeting Engine

<p align="center">
  <em>A hyper-personalized rental engine that calculates your True Cost of Living.</em>
</p>

## Overview

Traditional rental platforms only show you the **Base Rent**, leaving users blind to the hidden costs of their lifestyle, commute, and local grocery markets. **CanAfford** flips this paradigm. 

By leveraging **Gemini 2.5 Flash**, CanAfford acts as a strict, localized budgeting evaluator. It searches for active listings tailored to your limits, then aggressively recalculates the actual cost of living in that precise location based on your **commute type**, **student status**, and **dietary focus**.

---

## ✨ Key Features

### 1. True Cost Evaluator (Two-Step Pipeline)
Instead of relying on rigid, pre-coded databases, CanAfford uses a two-step "Fetch and Evaluate" pipeline:
- **Dumb Fetch**: Gemini dynamically searches Google for active listings in your target city centered around your target budget (including realistic 15% stretch options).
- **Smart Evaluate**: The React engine intercepts the listings and calculates your true personalized cost. It dynamically generates localized Transit costs (based on whether you drive, take the TTC, or rely on a U-Pass) and Grocery costs (scaled by whether you live alone, have a family, or eat on a strict budget). 

### 2. Backboard "AI Memory"
Powered by `Backboard.io`, CanAfford remembers who you are across sessions. Unlike static sliders, you declare your identity once:
- **Occupation & School**: Selecting "Student" dynamically maps the exact universities in your search city.
- **Granular Commute**: Provide your *exact* destination address (or campus building) for high-precision real-time geographical commute math.
- **Dietary Focus**: Adjusts baseline local grocery inflation data to fit a "Budget", "Health", or "Family" profile.

### 3. Smart Insight & Logistics Vault
Every property comes with a **Smart Insight Panel**, detailing exact mathematical breakdown logic.
- **ElevenLabs Integration**: Listen to a localized audio "Affordability Brief" to reduce reading fatigue.
- **Contextual Survival Tips**: Gemini provides personalized commentary (e.g., *"We added an estimated $250 for gas/parking since you selected 'Car'—parking is rarely included in Toronto base rent."*).
- **Lease Scanner**: Users can upload standard Ontario lease text and have Gemini explicitly flag illegal or aggressive clauses.

### 4. Human-Sensing UI (Presage SDK)
Integrated with the **Presage SDK**, CanAfford reads user stress metrics. If a user is highly stressed (Calm Mode), the UI dynamically softens—hiding terrifying financial jargon and instructing the AI to output gentle, supportive survival tips.

---

## 🏗 Tech Stack & Architecture

### Frontend
- **Framework**: React + Vite (TypeScript)
- **Styling**: Vanilla CSS utilizing CSS Grid ("Holy Grail" layouts), Tailwind-inspired utility logic, and strict WCAG accessibility profiling.
- **Maps**: `react-leaflet` for dynamic geographical panning (`flyTo` rendering).
- **Assets**: Cloudinary AI React SDK for image optimization; Unsplash API for dynamic real-estate imagery.

### Backend & Logic
- **Server**: Node.js + Express
- **AI / LLM**: `@google/generative-ai` (`gemini-1.5-flash-latest`)
- **Authentication**: Auth0 JWT wrappers
- **Testing**: Jest (`affordability.test.js` strictly validates that the financial math never hallucinates).

---

## 🛠 Getting Started

### Prerequisites
1. Node.js (v18+)
2. API Keys for Gemini, Auth0, and Cloudinary.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/chamathdesilva1015/CanAfford.git
   cd CanAfford
   ```

2. **Install Frontend Dependencies:**
   ```bash
   cd frontend
   npm install
   ```

3. **Install Backend Dependencies:**
   ```bash
   cd ../backend
   npm install
   ```

4. **Environment Setup:**
   Create a `.env` in the `frontend` folder containing:
   ```env
   VITE_GEMINI_API_KEY=your_google_ai_key
   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
   ```

   Create a `.env` in the `backend` folder containing:
   ```env
   PORT=3000
   GEMINI_API_KEY=your_google_ai_key
   ```

5. **Run the Application (Dual-Boot):**
   ```bash
   # From the root directory:
   npm run dev
   ```
   *The frontend will boot on `localhost:5173` and the Node API will boot on `localhost:3000` (or as configured in `.env`).*

---

## 🧠 Design Philosophy

CanAfford was transitioned from a standard prototype into a premium SaaS product. 
- **No Hallucinated Math**: The LLM is strictly forbidden from doing its own math on property limits. The UI parses explicit integers from the AI and executes deterministic local math.
- **No Dead Ends**: Fallbacks and hardcoded dummy data were eradicated. If the AI cannot find properties matching the criteria, the UI clearly displays data-driven blank states outlining exactly why the query failed so the user can adjust effectively.
- **Deep Routing**: URL parsing intercepts hallucinated root domains (like `rentals.ca/`) and dynamically synthesizes secure Google Search fallback links using standard property addresses, ensuring you are always one click away from the real listing.

---

*Built with ❤️ to make renting mathematically transparent.*
