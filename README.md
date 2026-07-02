# Nasdaq 100 Challenge - Paper Trading Demo Platform

An interactive, browser-based demo of a gamified paper-trading platform. It showcases the interface, trading flow, and event logging of the product.

## Quick Start (How to Run)

To run the demo, simply navigate to the `demo` directory and open `index.html` in any web browser.

For the best experience (ensuring the Line Charts render correctly via the Chart.js CDN), you can run a lightweight local web server. Open your terminal in the workspace and execute:

```bash
conda run -n paper-trading python -m http.server 8000
```

Then, open your browser and go to: **`http://localhost:8000/demo/`**

---

> **Presenter tip:** The left **Demo Controller** (display toggles + timeline) can be collapsed with the **«** button in its header to show the clean participant-facing view full-width; a floating **» Demo Controls** button restores it. Assets are cache-busted with a `?v=` query — if you edit `app.js`/`styles.css`, bump that number (or hard-refresh) so changes load.

## Key Functions to Showcase in Your Meeting

### 1. Onboarding Survey Flow
A short onboarding survey (under 1 minute) covers investing background, a financial literacy check, and AI usage/attitude questions. Completion is tracked in the Console Monitor at the bottom of the page.

### 2. Display Controller (Admin Panel)
The fixed sidebar on the left toggles a few interface variables live: inline citations on the report, full vs. short report length, and a diagnostic/transparency panel showing model accuracy stats.

### 3. Dwell Gate Logger
On the report view, a status badge tracks whether the reader has held the recommendation banner in view long enough to register as "read," logged to the Console Monitor.

### 4. Deferred Market-Close Execution & Order Withdrawal
Orders are submitted but don't fill immediately — they sit as pending until "Run Market Close" (or advancing to the next week) executes them at the closing price. Orders can be withdrawn or resubmitted before the cutoff. A one-click rebalance option liquidates non-recommended names and reallocates into the current week's recommended picks.

### 4b. Forecast Tracker Widget
A compact traffic-light strip at the top of the report tracks the selected ticker's forecast history week by week, with an optional row showing realized returns when the diagnostic panel is enabled.

### 5. Report Chatbot & Thread Management
A chatbot at the bottom of the report answers questions about the active stock's report and general financial questions. Supports multiple independent chat threads per ticker.

### 5b. My Portfolio Tab
Holdings table and a performance chart comparing the user's portfolio against a model portfolio and an index benchmark.

### 6. Timeline Progression (8-Week Window)
"Advance to Next Week" steps through an 8-week window with evolving prices, P&L, and leaderboard standings.

### 7. Standard AI Disclaimer
A standard AI disclaimer is rendered beneath every report, matching the native footer text of the underlying model.
