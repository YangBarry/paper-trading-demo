# Nasdaq 100 Challenge - GenAI Behavioral Research Demo Platform

This is a high-fidelity, interactive browser-based demonstration platform designed for showcase meetings. It demonstrates the experimental interfaces, variables, user flows, and logging mechanisms of the gamified paper-trading system described in the research **Proposal** and **Platform Design**.

## Quick Start (How to Run)

To run the demo, simply navigate to the `demo` directory and open `index.html` in any web browser. 

For the best experience (ensuring the Line Charts render correctly via the Chart.js CDN), you can run a lightweight local web server. Open your terminal in the workspace and execute:

```bash
conda run -n paper-trading python -m http.server 8000
```

Then, open your browser and go to: **`http://localhost:8000/demo/`**

---

> **Presenter tip:** The left **Demo Controller** (A/B toggles + timeline) can be collapsed with the **«** button in its header to show the clean participant-facing view full-width; a floating **» Demo Controls** button restores it. Assets are cache-busted with a `?v=` query — if you edit `app.js`/`styles.css`, bump that number (or hard-refresh) so changes load.

## Key Functions to Showcase in Your Meeting

### 1. Mandatory Onboarding Survey Flow
*   **What it shows**: Upon launch (or clicking **Reset** in the top left), a modal prompts the user to complete a simplified 5-question onboarding survey (under 1 minute).
*   **Research Elements**:
    *   **Background & Sophistication**: Captures investing experience and trading frequency.
    *   **Financial Literacy Check**: Screens for interest rate compounding knowledge using a standard benchmark.
    *   **AI Experience & Attitude (H2 Core)**: Captures objective usage frequency (E2, predictor) and dispositional trust (E4, control) to analyze cross-domain competence transfer (H2) and test the discriminant "experience, not enthusiasm" claim.
*   **Data Logs**: Look at the Console Monitor at the bottom. Completing the survey immediately commits the survey response payload and generates a research diagnostic flag (e.g. `SURVEY_COMPLETED`, `HALO_EFFECT_DIAGNOSIS`).

### 2. A/B Testing Factor Controller (Admin Panel)
*   **What it shows**: The fixed sidebar on the left simulates A/B assignments. Toggling these dynamically adjusts the interface:
    *   **Citations Cue (H1)**: Toggles inline academic-style citations (`[1]`, `[2]`) and the "Sourcing & Verification Records" bibliography section at the bottom of the report.
    *   **Report Length (H1a)**: Swaps between the **Full** (~15-page structure with detailed paragraphs and deep analysis) and **Short** (~5-page concise summary) report formats.
    *   **Transparency Arm (H3, H5b)**: Toggles the **Skill-Diagnostic Disclosure** (showing the model's coin-flip prior accuracy, mature live accuracy, and index comparisons) on the report, in the leaderboards, and inside the weekly emails. Turning it *Off* hides the index and accuracy figures entirely, leaving only absolute P&L.

### 3. High-Resolution Dwell Gate Logger
*   **What it shows**: On the Research Report view, a status badge reads **"Dwell Gate: Reading..."** when the recommendation verdict banner is in the viewport.
*   **Research Elements**: Implements the *IntersectionObserver* tracking. If the reader holds the header in view for a contiguous **3.0 seconds**, the state updates to **"Dwell Gate: Verified"**.
*   **Data Logs**: The Console Monitor emits a `DWELL_GATE_CERTIFIED` payload, proving that the user engaged with the call before trading.

### 4. Deferred Market-Close Execution & Order Withdrawal (Market Rules, Part IV / §3.3)
*   **What it shows**:
    *   **Submit, don't execute**: Select any stock (AAPL, MSFT, GOOGL, NVDA, AMZN), enter a dollar amount, and click **Submit Buy / Submit Sell**. The order does *not* fill immediately — it becomes a **pending order** listed under "Pending Orders," and cash/holdings are unchanged until the cutoff.
    *   **Withdrawable until cutoff**: Each pending order has a **Withdraw** button. Resubmitting on the same ticker *replaces* the prior order (tagged "resubmitted ×N") — modeling that only the **net terminal state** at the close executes.
    *   **Run Market Close**: Click **Run Market Close** (or **Advance to Next Week**, which fills any still-pending orders first) to execute pending orders at the closing price.
    *   **One-Click Rebalancing (H4 - Delegation)**: Liquidates non-recommended names and splits capital among the active week's bullish calls (executes immediately as a delegation affordance).
*   **Data Logs**:
    *   The submit / withdraw / resubmit stream logs to a **behavioral-history ledger** (`ORDER_SUBMITTED`, `ORDER_RESUBMITTED`, `ORDER_WITHDRAWN`).
    *   At the cutoff, `MARKET_CLOSE_EXECUTION` plus `TRADE_EXECUTED` fires with `netTerminalState:true`, `concordant` (Primary DV), `reportWeek`, and `pendingDurationSec` — on the **concordance** ledger.
    *   Rebalances log `DELEGATION_EVENT`, separated by the platform's concordance wall.

### 4b. Forecast Tracker widget (Part III.7 — the transparency wedge, made visible)
*   **What it shows**: A compact traffic-light strip at the **top of the Deep Research** tab, tracking the selected ticker week by week:
    *   **Forecast row** (both arms): one light per week — 🟢 green = Bullish, 🟡 yellow = Uncertain, 🔴 red = Bearish — lit through the current drop and "off" (dashed) for weeks not yet dropped.
    *   **Outcome row** (transparency arm only): the realized weekly return per week, **green for a positive return, red for negative**, with the % shown inside the chip. This row is **hidden entirely for the control arm**.
*   **Why it matters**: The outcome row is the transparency wedge — the control arm sees only the forecast lights and must self-compute accuracy from the price chart, while the transparency arm additionally sees the realized-return record. It operationalizes the H5 self-correction story.
*   **Note**: The widget replaced the earlier standalone "Forecast Tracker" tab; it now lives inside the report so the prediction history sits right beside the current call.

### 5. Open-Scope Report Chatbot & Thread Management
*   **What it shows**: Ask the chatbot at the bottom of the report about parts of the report. You can create multiple independent chat threads per stock ticker, and select between them using the dropdown.
*   **Research Elements**: The chatbot acts as a general-purpose AI financial assistant holding the active stock's report in context. It is **open-scope** — users can ask report-specific questions *and* broader verifiable/normative questions (factual lookups, saving/allocation/life-cycle reasoning), which is load-bearing for the H2b experienced-competence measure (Platform Design §I.3). It tracks credit usage ($0.15 per message).
*   **Data Logs**: Chat queries log `CHATBOT_QUERY` containing detailed research parameters (`threadId`, `reportWeekLabel`, `threadContinuity` as `"new-chat"` or `"continue-prior"`, `timeInterval` since the last message, and full `query`/`response` text) to feed the H2b behavioral competence and Mechanism 2 qualitative analyses.

### 5b. My Portfolio Tab (holdings + performance visuals)
*   **What it shows**: A dedicated **My Portfolio** tab holds the user's current **holdings** table and the **Portfolio Performance** equity curve (your portfolio vs. the GenAI value-weighted portfolio, plus the Nasdaq 100 index line for the transparency arm). Holdings were moved off the left panel, which is now the lean **Market & Trading** rail (watchlist, rebalance, submit order, pending orders).
*   **Why it matters**: Keeps the participant workspace uncluttered and keeps the **Leaderboard** tab a single, clean standings table (no embedded chart), so peer standing reads as one focused surface.

### 6. Timeline & Feedback Progression (8-Week Window)
*   **What it shows**: Click **"Advance to Next Week"** in the controller to step through the full 8-week study window (weeks 1–3 use hand-authored reports; weeks 4–8 are compiled on the fly, including the Week-4 NVDA corporate-action delisting).
*   **Research Elements**:
    *   Prices shift based on historical performance, adjusting the user's P&L and Sharpe ratio.
    *   The Leaderboard updates ranks and assigns wide categorical tiers (Platinum, Gold, Silver, Bronze) to blunt rank-chasing.
    *   *Transparency Arm*: Displays the Nasdaq 100 Index passive benchmark on the Portfolio performance chart, as a leaderboard benchmark row, and in the weekly emails.
    *   *Control Arm*: All index benchmark lines are hidden; the user only compares absolute returns against peers.

### 7. Standard AI Disclaimer (Held Constant, Both Arms)
*   **What it shows**: Beneath every report in both the Control and Transparency arms, the standard native Gemini disclaimer—"Gemini is AI and can make mistakes."—is rendered verbatim in its native footer position.
*   **Research Elements**: Replicates the deployed artifact and establishes a generic fallibility notice as the common baseline across both arms. This shows that the transparency manipulation (H3) is an incremental skill-diagnostic bundle layered on top of a standard disclaimer that users already encounter in the wild.

