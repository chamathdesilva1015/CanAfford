# The 10-Minute Test Suite & Manual Checklist

Welcome to CanAfford! Please follow these manual verification steps to ensure our Auth0, Backboard, and AI Affordability Engine pipelines are functioning beautifully. 

> [!CAUTION] 
> **The Fail-Safe**: If ANY of these steps fail, do not try to fix them locally. Copy and paste the console error back to me (Antigravity), and I will provide an autonomous fix.

## 1. Auth0 Check
- [ ] Ensure you have run `npm run dev` from the root directory so both frontend and backend are running.
- [ ] Navigate to `http://localhost:5173` (or the Vite dev URL provided in your console).
- [ ] Click the **"Log In to View Dashboard"** button.
- [ ] **Verification**: Confirm you are redirected correctly to the Auth0 Universal Login page.
- [ ] Authenticate normally with Google or Email/Password.
- [ ] **Verification**: Once redirected back, confirm you land on the `/dashboard` route.
- [ ] **Verification**: Verify your Auth0 Profile data (such as "Welcome, [Your Name]") accurately displays at the top of the dashboard.

## 2. Backboard Connection Verification
- [ ] While on the `/dashboard` page, open your browser's Developer Tools (typically `F12` or `Cmd+Option+I` on Mac).
- [ ] Navigate to the **Network** tab and filter by `Fetch/XHR`.
- [ ] In the UI, locate the "Your Backboard.io AI Memory" card and click **Edit Preferences**.
- [ ] Change the "Housing Budget" amount to a different number (e.g., `$1800`) and click **Save to Memory**.
- [ ] **Verification**: Monitor the Network tab. You should observe the state change (or if using a real API URL, observe a `200 OK` or `201 Created` HTTP response confirming the payload of your budget constraints was saved).

## 3. The 'CanAfford' Logic Test (Automated)
To mathematically verify our affordability criteria before the Gemini LLM sees it, we use an automated test suite.
- [ ] Open a fresh terminal tab.
- [ ] Navigate to the backend directory: `cd backend`
- [ ] Run the test suite: `npm run test`
- [ ] **Verification**: The terminal output should show a passing test (`✓ should correctly label a $1400 rent against a $1500 budget as 'GREEN' (Affordable)`).

## Ready to Start?
Run the following root command to fire everything up simultaneously:
```bash
npm run dev
```
