// State Management
let externalStockPrices = typeof EXTERNAL_STOCK_PRICES !== 'undefined' ? EXTERNAL_STOCK_PRICES : null;
const state = {
  factors: {
    citations: true,
    length: 'full',
    transparency: 'transparency',
  },
  theme: 'light',
  currentWeek: 1,
  selectedStock: 'AAPL',
  activeTab: 'dashboard',
  holdingsSortKey: 'Symbol',
  holdingsSortDir: 'asc',
  user: {
    cash: 1000000,
    holdings: {},
    transactions: [],
    survey: null,
  },
  chatbotCredits: 10.00,
  chatbotHistory: {},
  activeChatThreadId: {},
  pendingOrders: {}, // ticker -> { ticker, type, amount, submittedAt, resubmits } — deferred until market-close cutoff
  logs: [],
  dwellTime: 0,
  dwellTimerId: null,
  headerInView: false,
  headerDwellTime: 0,
  headerDwellCertified: false,
  activeWeeksTracker: { 1: true }, // tracks user week participation (week index as key, true if active)
  delistedStocks: [], // stocks removed via corporate actions
};

// Simulated Stock Database
const STOCKS = {
  AAPL: { ticker: 'AAPL', name: 'Apple Inc.' },
  MSFT: { ticker: 'MSFT', name: 'Microsoft Corp.' },
  GOOGL: { ticker: 'GOOGL', name: 'Alphabet Inc.' },
  NVDA: { ticker: 'NVDA', name: 'NVIDIA Corp.' },
  AMZN: { ticker: 'AMZN', name: 'Amazon.com Inc.' },
};

// Stock Prices across 8 Simulated Weeks (incorporating NVDA delisting in week 4)
const STOCK_PRICES = {
  1: { AAPL: 257.90, MSFT: 420.50, GOOGL: 165.20, NVDA: 128.50, AMZN: 184.30 },
  2: { AAPL: 264.20, MSFT: 412.10, GOOGL: 168.90, NVDA: 132.40, AMZN: 182.10 },
  3: { AAPL: 253.50, MSFT: 395.80, GOOGL: 174.50, NVDA: 129.80, AMZN: 188.40 },
  4: { AAPL: 255.10, MSFT: 402.30, GOOGL: 171.20, NVDA: 129.80, AMZN: 186.20 },
  5: { AAPL: 248.30, MSFT: 408.50, GOOGL: 169.80, NVDA: 129.80, AMZN: 191.50 },
  6: { AAPL: 252.10, MSFT: 403.20, GOOGL: 172.40, NVDA: 129.80, AMZN: 189.10 },
  7: { AAPL: 246.80, MSFT: 411.60, GOOGL: 168.30, NVDA: 129.80, AMZN: 193.20 },
  8: { AAPL: 244.20, MSFT: 405.80, GOOGL: 170.10, NVDA: 129.80, AMZN: 195.40 }
};

// AI Forecasts across Weeks (NVDA neutral after delisting in Week 4)
const AI_FORECASTS = {
  1: { AAPL: 'Bullish', MSFT: 'Bearish', GOOGL: 'Bullish', NVDA: 'Bullish', AMZN: 'Bearish' },
  2: { AAPL: 'Bullish', MSFT: 'Bearish', GOOGL: 'Neutral', NVDA: 'Bearish', AMZN: 'Bullish' },
  3: { AAPL: 'Bearish', MSFT: 'Bullish', GOOGL: 'Bullish', NVDA: 'Bullish', AMZN: 'Bullish' },
  4: { AAPL: 'Bullish', MSFT: 'Bearish', GOOGL: 'Bearish', NVDA: 'Neutral', AMZN: 'Bullish' },
  5: { AAPL: 'Bullish', MSFT: 'Bullish', GOOGL: 'Bullish', NVDA: 'Neutral', AMZN: 'Bearish' },
  6: { AAPL: 'Bearish', MSFT: 'Bearish', GOOGL: 'Bullish', NVDA: 'Neutral', AMZN: 'Bullish' },
  7: { AAPL: 'Bullish', MSFT: 'Bearish', GOOGL: 'Bearish', NVDA: 'Neutral', AMZN: 'Bullish' },
  8: { AAPL: 'Bearish', MSFT: 'Bullish', GOOGL: 'Bullish', NVDA: 'Neutral', AMZN: 'Bullish' }
};

// Realized returns to calculate accuracy
// Week 1: AAPL rose (257.9->264.2 = +2.4%), MSFT fell (420.5->412.1 = -2%), GOOGL rose (165.2->168.9 = +2.2%), NVDA rose (128.5->132.4 = +3%), AMZN fell (184.3->182.1 = -1.2%)
// Forecast performance in Week 1:
// AAPL (Bullish) - Correct
// MSFT (Bearish) - Correct
// GOOGL (Bullish) - Correct
// NVDA (Bullish) - Correct
// AMZN (Bearish) - Correct
// Week 1 Accuracy: 5/5 = 100% (Market was strong and AI was correct)
// Week 2: AAPL fell (264.2->253.5 = -4%), MSFT fell (412.1->395.8 = -4%), GOOGL rose (168.9->174.5 = +3.3%), NVDA fell (132.4->129.8 = -2%), AMZN rose (182.1->188.4 = +3.5%)
// Forecast performance in Week 2:
// AAPL (Bullish) - Incorrect (fell)
// MSFT (Bearish) - Correct (fell)
// GOOGL (Neutral) - Excluded from accuracy
// NVDA (Bearish) - Correct (fell)
// AMZN (Bullish) - Correct (rose)
// Week 2 Accuracy: 3/4 = 75%
// Cumulative accuracy over 2 weeks: (5 + 3) / (5 + 4) = 8/9 = 88.8%

// Reports Database
const REPORTS_DB = {
  1: {
        AAPL: {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      forecast: 'Bullish',
      date: 'October 6 - October 10, 2025',
      full: {
        sections: [
          {
            title: "1. Executive Summary & Weekly Forecast",
            paragraphs: [
              "Weekly Forecast (October 6 - October 10, 2025): Bullish",
              "This report provides a comprehensive analysis of Apple Inc. (AAPL) to forecast its stock price movement for the week of October 6, 2025. The outlook is Bullish, anticipating a potential increase in the stock price. This forecast is predicated on a powerful confluence of factors where positive technical momentum, compelling narrative catalysts, and favorable seasonality are expected to outweigh significant cautionary signals from valuation metrics and overbought indicators.",
              "The core of the current investment thesis rests on the stock's position at a critical technical juncture. AAPL has formed a classic bullish continuation pattern, suggesting an imminent breakout to new highs. This technical strength is underpinned by a potent narrative shift surrounding the company's artificial intelligence strategy and robust early demand signals for its newly launched iPhone 17 product line. While the stock's valuation appears stretched relative to its historical averages and peers, the momentum of institutional sentiment, as evidenced by recent analyst upgrades and options market activity, suggests that market participants are willing to pay a premium for Apple's perceived growth acceleration.",
              "The macroeconomic environment remains broadly supportive, though a key event risk emerges mid-week with the release of the Federal Open Market Committee (FOMC) meeting minutes. For the upcoming week, the following price levels are paramount:",
              "Pivotal Resistance: The price zone around $257 serves as the primary technical and psychological hurdle. A sustained close above this level would confirm the bullish thesis and likely trigger a rapid continuation of the uptrend.",
              "Key Support: The price zone between $250 and $253 represents the most critical area of support. A failure to hold this level would invalidate the immediate bullish setup and signal a period of consolidation or a potential pullback.",
              "In summary, while risks are present, the weight of the evidence suggests the path of least resistance for AAPL in the coming week is to the upside.",
            ]
          },
          {
            title: "2. Price Action and Momentum Analysis",
            paragraphs: [
              "An examination of Apple's recent price action reveals a stock in the grip of a powerful and sustained uptrend. The momentum heading into the week of October 6 is unequivocally positive, though a granular analysis of volume patterns introduces a necessary element of caution.",
              "Recent Performance Deconstruction",
              "Over multiple timeframes, AAPL has demonstrated formidable strength. The stock has registered an 8.77% gain over the past month and an impressive 33.08% gain over the last six months, significantly outperforming the broader market indices. [1] This performance is largely attributable to an aggressive accumulation phase that began in early August 2025. After finding a bottom near $202, the stock embarked on a steep rally, climbing nearly 30% to its current trading range around $258.2",
              "This powerful advance has brought the stock within striking distance of its 52-week and all-time high, which stands at approximately $260.1 Trading in such close proximity to a historical peak is a double-edged sword. On one hand, it signifies immense investor confidence and strong momentum. On the other, it represents a natural area for profit-taking and the emergence of increased supply from sellers, creating a significant technical and psychological barrier. The stock closed the session on October 3, 2025, at $257.90, positioning it directly below this critical resistance zone. [3]",
              "Volume Analysis",
              "A review of trading volume provides a more nuanced perspective on the sustainability of the recent rally. Apple's average daily trading volume over the past 30 days has been robust, hovering between 54 million and 57 million shares. [3] However, some data indicates that the volume over the most recent 30-day period has been below this average. [5] This can sometimes signal a period of consolidation, where the market pauses to digest recent gains before the next directional move.",
              "More critically, a detailed technical analysis highlights a potentially negative correlation between price and volume development during the recent ascent. [7] This analysis notes that volume has been comparatively low at recent price tops and high at price bottoms. This pattern can be interpreted as a sign of weakening conviction among buyers as the price reaches new highs. It suggests that while the price is advancing, the broad-based participation required to fuel a sustainable breakout may be waning. This observation serves as an early, albeit subtle, warning sign that the current uptrend, while powerful, could be maturing and may require a significant catalyst to overcome the supply pressure near its all-time high. The path of least resistance remains upward, but the diminishing volume profile suggests that further gains will not be achieved without a fight.",
            ]
          },
          {
            title: "3. Technical Levels and Battleground",
            paragraphs: [
              "The technical landscape for AAPL is defined by a clear tension between powerful bullish continuation patterns and cautionary signals from key momentum indicators. The stock is coiled at a critical inflection point, and the resolution of the battle at well-defined price levels will likely dictate the directional bias for the entire week.",
              "Chart Patterns and Trend Analysis",
              "The long-term price action for AAPL in 2025 has been framed by a \"broad ascending channel,\" establishing a durable bullish framework for the stock. [8] Within this larger structure, the rally since August has carved out a much steeper and more aggressive \"growth channel,\" confirming a significant acceleration of the uptrend. [8]",
              "Of more immediate importance for the upcoming week is the emergence of a \"bull flag\" pattern over the past two weeks. [9] Following the sharp rally in September, the stock has been consolidating sideways in an increasingly tight range. This pattern is a classic bullish continuation formation, which typically resolves in the direction of the preceding trend. It suggests that the stock is building energy for its next leg higher. The top of this bull flag pattern coincides with the pivotal resistance level near $257.",
              "Key Technical Indicators",
              "Analysis of standard technical indicators reveals a conflicting picture that warrants careful consideration:",
              "Moving Averages: While specific 50-day and 200-day moving average values are not explicitly provided in the available data, the context of multiple technical strategies implies that the current price is trading comfortably above both of these key long-term trend indicators. [8] This is a fundamentally bullish condition, confirming that the stock is in a healthy, long-term uptrend.",
              "Relative Strength Index (RSI): The primary source of technical caution comes from the RSI, which is currently in \"overbought territory\".8 An overbought RSI does not guarantee a price reversal, but it indicates that the upward momentum has been exceptionally strong and that the stock may be vulnerable to a pullback or a period of consolidation as the buying pressure temporarily exhausts itself.",
              "Moving Average Convergence Divergence (MACD): On a very short-term, intraday basis (e.g., a 15-minute chart), the MACD has been described as \"firmly negative\" during recent sessions. [8] This suggests that sellers gained control during the consolidation phase within the bull flag, which is not unusual for such a pattern. However, it underscores the importance of a decisive breakout to re-establish bullish intraday momentum.",
              "Support and Resistance Levels",
              "A synthesis of technical analysis from multiple sources provides a clear map of the key price levels that will serve as battlegrounds for bulls and bears in the coming week. These levels are derived from traditional chart patterns, psychological price points, and data from the options market.",
              "The technical picture is that of a coiled spring. The powerful bullish continuation pattern is pressing directly against a formidable resistance level, while momentum oscillators suggest a state of exhaustion. The week's trading is therefore unlikely to be range-bound; a decisive move is probable. The resolution of the conflict at the $257 level will be the most critical determinant of the stock's direction for the week.",
            ],
            table: [
              { level: "Pivotal Resistance", price: "$257.00", desc: "Key resistance, top of bull flag pattern. A decisive close above is the primary bullish trigger. [7]" },
              { level: "Major Resistance", price: "$259.18 - $260.10", desc: "All-time high, psychological barrier. Break could lead to significant short-covering. [1]" },
              { level: "Secondary Resistance", price: "$262.50 - $265.00", desc: "Options market 'call walls,' next upside targets. Breakout above $260 would target this zone. [8]" },
              { level: "Primary Support", price: "$253.00 - $253.50", desc: "Bottom of bull flag pattern, intraday support. Close below invalidates breakout. [8]" },
              { level: "Major Support", price: "$250.00", desc: "Strong psychological and technical base. Key floor for the stock. [8]" },
              { level: "Secondary Support", price: "$242.50 - $247.50", desc: "Options market 'put support,' significant area where options traders placed bets. [8]" },
              { level: "Value Area Support", price: "$240.00 - $250.00", desc: "Fair Value Gap support zone, prior price imbalance expected to act as strong demand. [8]" },
            ]
          },
          {
            title: "4. Fundamental Underpinnings and Valuation Realities",
            paragraphs: [
              "While short-term price action is often driven by technicals and sentiment, a company's fundamental health provides the essential context for its valuation. Apple's recent financial performance has been robust, demonstrating operational excellence. However, this strength is juxtaposed with a valuation that appears to be pricing in a significant acceleration of future growth, creating a potential point of vulnerability.",
              "Recent Financial Performance (Fiscal Q3 2025)",
              "Apple's most recent earnings report, for the fiscal third quarter ending June 28, 2025, showcased the company's continued ability to generate impressive growth at a massive scale. [3] Key financial highlights from the quarter include:",
              "Revenue: $94.04 billion, an increase of 9.63% year-over-year.",
              "Net Income: $23.43 billion, an increase of 9.26% year-over-year.",
              "Earnings Per Share (EPS): $1.57, an increase of 12.14% year-over-year, benefiting from the company's aggressive share repurchase program.",
              "This strong performance was broad-based, driven by double-digit growth in both iPhone and Mac sales, which defied concerns of a slowdown in consumer hardware spending. [11] Furthermore, the high-margin Services division continued its impressive trajectory, with revenue hitting an all-time high of $27.4 billion, up 13%.11 This ongoing expansion of the services ecosystem is a critical component of the long-term investment thesis, as it provides a recurring and highly profitable revenue stream.",
              "Underscoring its financial strength and management's confidence in the future, Apple returned over $27 billion to shareholders during the quarter through a combination of dividends and share buybacks. [11] This robust capital return program remains a key pillar of support for the stock.",
              "Valuation Analysis",
              "The primary argument for caution regarding AAPL stems from its current valuation. The stock is trading at a price-to-earnings (P/E) ratio of approximately 39.22 based on trailing earnings 4, and roughly 32.1 times forward earnings estimates. [1] This represents a significant premium to the broader market and, more importantly, exceeds Apple's own five-year average P/E ratio. [1] This indicates that investors are currently paying more for each dollar of Apple's earnings than they have, on average, over the past five years.",
              "This premium becomes even more apparent when compared to a key mega-cap technology peer. For instance, Alphabet (GOOGL) currently trades at approximately 24.4 times forward earnings, yet its earnings are projected to grow at a faster rate of 14.9% annually over the next three to five years. [9]",
              "This creates a clear disconnect. Apple's fundamental performance is stellar for a company of its size, but its growth rates are characteristic of a mature, albeit high-quality, enterprise. Its valuation, however, is more akin to that of a high-growth company in an earlier stage of its lifecycle. The market is not valuing Apple based on its recent performance alone; it is pricing in a significant re-acceleration of growth. This dependence on future expectations makes the stock highly sensitive to the narratives and catalysts that are shaping those expectations. Should the market's optimism waver, the elevated valuation provides little margin of safety and could lead to a swift repricing.",
            ]
          },
          {
            title: "5. Narrative Catalysts and Sentiment",
            paragraphs: [
              "The premium valuation currently assigned to Apple's stock is being sustained by a set of powerful, forward-looking narratives that have captured the market's imagination. An analysis of these catalysts, combined with recent analyst sentiment and options market activity, reveals that the \"momentum of sentiment\" is strongly bullish and is the primary force propelling the stock toward its all-time highs.",
              "Primary Bullish Catalysts",
              "Three key factors are currently fueling investor optimism:",
              "The iPhone 17 Product Cycle: The launch of the new iPhone lineup on September 9, 2025\u2014featuring the iPhone 17, iPhone 17 Pro, and the entirely new, thinner iPhone Air\u2014has served as a major positive catalyst. [12] More than just a standard refresh, early reports suggest that demand for the highest-margin Pro models is surging, far outpacing the launch orders for the previous generation. [14] This indicates a strong consumer appetite for premium devices and could lead to a favorable product mix, boosting average selling prices and gross margins in the upcoming quarters.",
              "The AI Narrative Pivot: For much of the year, a primary bear thesis was that Apple was falling behind in the generative artificial intelligence race. [9] This narrative has been effectively neutralized in recent weeks. The company has begun rolling out its own on-device \"Apple Intelligence\" features. [12] More strategically, reports have emerged that Apple is in active negotiations with Google to license its powerful Gemini AI engine for integration into the iPhone. [15] This potential partnership is a masterstroke, repositioning Apple not as a laggard struggling to build its own cloud infrastructure, but as the ultimate distributor of AI to a captive audience of over 1.5 billion users. It leverages Apple's greatest strength\u2014its ecosystem\u2014to participate in the AI revolution without bearing the full cost of competing in the data center arms race.",
              "Favorable Seasonality: Historical data provides a statistical tailwind for the stock in the coming month. Over the past 44 years, the month of October has been positive for AAPL stock 68.89% of the time, suggesting a seasonal tendency for strength during this period. [5]",
              "Analyst and Market Sentiment",
              "Institutional sentiment has shifted decisively in a bullish direction over the past month, a trend that is not yet fully reflected in lagging consensus data.",
              "Recent Analyst Upgrades: A flurry of positive analyst actions has occurred in late September and early October. Morgan Stanley initiated coverage with an \"Overweight\" rating and a $298 price target on October 2, while Seaport Global issued a \"Buy\" rating and a $310 target on October 1.16 These followed \"Outperform\" ratings from Wedbush and Evercore in late September, with price targets of $310 and $290, respectively. [16]",
              "Lagging Consensus: This recent wave of optimism contrasts sharply with the broader consensus price target, which stands at approximately $247.17 This figure, being below the current stock price, is likely skewed by older, more conservative estimates that have not yet been updated to reflect the powerful new AI narrative. The momentum is clearly with the bulls, even if the aggregate data has yet to catch up.",
              "Options Market Activity: The speculative derivatives market corroborates this bullish sentiment. An analysis of ten recent large, \"unusual\" options trades revealed that eight were bullish CALL options, against only two bearish PUTs. [5] This indicates that short-term traders are positioning for further upside in the stock price.",
              "This powerful combination of a strong product cycle, a strategic repositioning in the critical AI landscape, and a clear shift toward bullish sentiment from influential analysts provides the narrative force necessary to support the stock's premium valuation and propel it through technical resistance.",
            ],
            table: {
              headers: ["Firm", "Analyst", "Rating", "Price Target ($)"],
              rows: [
                ["Morgan Stanley", "Erik Woodring", "Overweight", "$298.00"],
                ["Seaport Global", "Jay Goldberg", "Buy", "$310.00"],
                ["Evercore ISI Group", "Amit Daryanani", "Outperform", "$290.00"],
                ["Wedbush", "Daniel Ives", "Outperform", "$310.00"],
                ["Tigress Financial", "Ivan Feinseth", "N/A", "$305.00"],
                ["Bernstein", "Toni Sacconaghi", "Outperform", "$290.00"],
                ["Phillip Securities", "Helena Wang", "Reduce", "$200.00"],
                ["B of A Securities", "N/A", "Buy", "N/A"]
              ]
            }
          },
          {
            title: "6. The Macroeconomic Context",
            paragraphs: [
              "No stock trades in a vacuum, and the broader market environment provides a crucial tailwind or headwind that can influence even the strongest individual securities. For the week of October 6, the macroeconomic backdrop for Apple appears generally permissive and supportive of a continued rally, though it is not without a significant, well-defined event risk that could introduce volatility.",
              "Broader Market Health",
              "The major U.S. stock indices have demonstrated considerable strength and resilience throughout the third quarter and into the beginning of the fourth. As of the end of the prior week, the tech-heavy NASDAQ Composite Index was up 18.0% year-to-date, while the S&P 500 Index had gained 14.2%. [19] This price action reflects a clear \"risk-on\" sentiment among investors. [20]",
              "This positive market momentum is being fueled by two primary forces: secular enthusiasm for artificial intelligence innovation and a cyclical rebound in rate-sensitive sectors based on the expectation that the Federal Reserve will continue its path of easing monetary policy. [19] This environment creates a significant tailwind for mega-cap technology leaders like Apple, which benefit from both the AI theme and the ample market liquidity that accompanies an accommodative central bank policy.",
              "Upcoming Economic Calendar",
              "The economic calendar for the week of October 6-10, 2025, contains several data releases, but one event stands out as having the highest potential to impact market sentiment. [24]",
              "Monday, October 6: No major market-moving releases scheduled.",
              "Tuesday, October 7: U.S. Trade Balance (August), Consumer Credit Change (August). These are typically second-tier reports.",
              "Wednesday, October 8: FOMC Meeting Minutes. This is the most critical economic event of the week.",
              "Thursday, October 9: Wholesale Inventories (August).",
              "Friday, October 10: University of Michigan Consumer Sentiment (Preliminary, October).",
              "The release of the minutes from the Federal Reserve's last policy meeting on Wednesday afternoon will be the week's main event. Market participants will scrutinize the text for any nuances in the committee's discussion regarding the future path of inflation and interest rates. A dovish tone, reinforcing the market's expectation for future rate cuts, would likely add fuel to the ongoing rally. Conversely, any unexpectedly hawkish language suggesting that the Fed is more concerned about inflation than the market currently believes could trigger a broad, market-wide pullback as investors reprice the cost of capital. Data on consumer sentiment and credit will also be watched closely for insights into the health of the U.S. consumer, a critical factor for a company like Apple.",
              "Overall, the macro environment acts as a tailwind heading into the week, but Wednesday afternoon introduces a binary event risk that could override company-specific factors.",
            ]
          },
          {
            title: "7. Synthesis and Conclusive Outlook",
            paragraphs: [
              "The final forecast for Apple's stock price movement in the upcoming week requires a careful weighing of the cumulative evidence, balancing the compelling bullish arguments against the valid points of caution. The analysis indicates that the forces propelling the stock higher currently appear more potent and immediate than the risks that could derail its advance.",
              "Weighing the Evidence",
              "The Bull Case is multifaceted and powerful. It is anchored by a textbook bullish technical setup\u2014a confirmed uptrend consolidating in a bull flag pattern that is poised for a breakout. [9] This technical strength is being fueled by a potent and timely narrative shift, as the company has successfully reframed its AI strategy from a perceived weakness to a strategic strength through its on-device intelligence and potential partnership with Google. [15] This narrative is amplified by strong early demand signals for the new iPhone 17 lineup. [14] This positive story is being validated by a wave of recent, high-profile analyst upgrades and bullish positioning in the options market. [5] Finally, the stock benefits from favorable October seasonality and a supportive, risk-on macroeconomic backdrop. [5]",
              "The Bear Case centers on three primary risks. First, the stock is technically overbought, with the RSI indicator flashing a warning of potential short-term exhaustion as it confronts major resistance at its all-time high. [1] Second, the stock's valuation is undeniably stretched, trading at a significant premium to its own history and to key peers, leaving it vulnerable to a correction if the optimistic growth narrative falters. [9] Third, subtle signs of weakening volume on the ascent suggest that conviction may be waning. [7] Finally, the release of the FOMC minutes on Wednesday introduces a significant external event risk that could trigger market-wide volatility independent of Apple's own fundamentals. [27]",
              "Final Synthesis and Price Scenarios",
              "The weight of the evidence tilts in favor of a bullish resolution. The strength, recency, and clarity of the narrative catalysts\u2014specifically the AI pivot and the strong iPhone demand\u2014appear to be the dominant market-moving force at present. This powerful narrative provides the justification for investors to look past the high valuation and push the stock through its technical resistance. The bull flag pattern is a high-probability setup, and in a supportive market environment, these patterns tend to resolve to the upside. While the FOMC minutes pose a risk, the market's current momentum seems resilient enough to absorb anything short of a dramatically hawkish surprise.",
              "The most likely scenarios for the week are as follows:",
              "Bullish Scenario (High Probability): The stock achieves a decisive daily close above the $257 resistance level early in the week. This breakout triggers a continuation move, fueled by momentum traders and options-related hedging, driving the price toward the all-time high near $260 and potentially into the $262.50-$265.00 range by the end of the week.",
              "Neutral/Consolidation Scenario (Moderate Probability): The stock attempts to break $257 but fails, meeting significant selling pressure. However, buyers emerge to defend the support level at ~$253. The stock then spends the week trading within this tight $253-$257 range as it digests its recent gains and awaits a fresh catalyst.",
              "Bearish Scenario (Low Probability): A sharp rejection at the $257 resistance, potentially combined with a surprisingly hawkish tone from the FOMC minutes, leads to a technical breakdown. The stock closes below the $253 support level, invalidating the bull flag and triggering a pullback to test the major support zone at $250.",
              "Given the confluence of positive factors, the bullish scenario is assessed as the most probable outcome.",
              "Final Prediction: Bullish",
            ]
          },
        ],
        references: [
            "NASDAQ:AAPL Stock Price \u2014 TradingView - Apple Inc., accessed on October 4, 2025, https://www.tradingview.com/symbols/NASDAQ-AAPL/",
            "Stock Price - Apple Investor Relations, accessed on October 4, 2025, https://investor.apple.com/stock-price/default.aspx",
            "Apple Inc (AAPL) Stock Price & News - Google Finance, accessed on October 4, 2025, https://www.google.com/finance/quote/AAPL:NASDAQ",
            "Apple (AAPL) - Real-Time Price & Historical Performance - YCharts, accessed on October 4, 2025, https://ycharts.com/companies/AAPL",
            "AAPL (Apple Inc.) \u2013 Technical Charts and Market Data \u2013 TrendSpider, accessed on October 4, 2025, https://trendspider.com/markets/symbols/AAPL/",
            "Apple (AAPL) Stock Price, Quote, News & History - Nasdaq, accessed on October 4, 2025, https://www.nasdaq.com/market-activity/stocks/aapl",
            "Apple (AAPL) - Technical Analysis - US Stocks - Investtech, accessed on October 4, 2025, https://www.investtech.com/main/market.php?CompanyID=10503307",
            "Apple Inc Trade Ideas \u2014 NASDAQ:AAPL \u2014 TradingView, accessed on October 4, 2025, https://www.tradingview.com/symbols/NASDAQ-AAPL/ideas/?video=yes",
            "Is Apple Stock About to Breakout? - October 1, 2025 - Zacks.com, accessed on October 4, 2025, https://www.zacks.com/commentary/2760415/is-apple-stock-about-to-breakout",
            "Investor Relations - Apple, accessed on October 4, 2025, https://investor.apple.com/investor-relations/default.aspx",
            "AAPL Investor Relations - Apple Inc - Alpha Spread, accessed on October 4, 2025, https://www.alphaspread.com/security/nasdaq/aapl/investor-relations",
            "Newsroom - Apple, accessed on October 4, 2025, https://www.apple.com/newsroom/",
            "Apple Events, accessed on October 4, 2025, https://www.apple.com/apple-events/",
            "AppleInsider: Apple News, Rumors, Reviews, Prices & Deals, accessed on October 4, 2025, https://appleinsider.com/",
            "Apple Releases AI Research Paper, Apple + Gemini? \u2013 Stratechery by Ben Thompson, accessed on October 4, 2025, https://stratechery.com/2024/apple-releases-ai-research-paper-apple-gemini/?access_token=eyJhbGciOiJSUzI1NiIsImtpZCI6InN0cmF0ZWNoZXJ5LnBhc3Nwb3J0Lm9ubGluZSIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJzdHJhdGVjaGVyeS5wYXNzcG9ydC5vbmxpbmUiLCJhenAiOiJIS0xjUzREd1Nod1AyWURLYmZQV00xIiwiZW50Ijp7InVyaSI6WyJodHRwczovL3N0cmF0ZWNoZXJ5LmNvbS8yMDI0L2FwcGxlLXJlbGVhc2VzLWFpLXJlc2VhcmNoLXBhcGVyLWFwcGxlLWdlbWluaS8iXX0sImV4cCI6MTc2MjEwNDU0NiwiaWF0IjoxNzU5NTEyNTQ2LCJpc3MiOiJodHRwczovL2FwcC5wYXNzcG9ydC5vbmxpbmUvb2F1dGgiLCJzY29wZSI6ImZlZWQ6cmVhZCBhcnRpY2xlOnJlYWQgYXNzZXQ6cmVhZCBjYXRlZ29yeTpyZWFkIGVudGl0bGVtZW50cyBwb2RjYXN0IHJzcyIsInN1YiI6IjFjNmEwMTA1LTU4Y2QtNDE0OS1iOWNhLTM3NTRmNDEzNzY3YyIsInVzZSI6ImFjY2VzcyJ9.ZU2osDts6YLRZY3MDR6nSOi4VIJz1AbEpPAdoJWRctWBRSU9wtaKVVBrT00MVK-0KibQPpt3hDD_Or4wHltdkcL1YpBYjaF4JN91RR8B-1ToneTUAY89PzNvAR16i7etsK7mxgxsUxIuDP9oS-rOeHfIM_QdTxxiBzCc7oDrqTKAPv8th1MnVWgBOnbu-nC1c3rETgNTcR7TlSQYr54erSAJdjy82LNa05IgWtk9lJr1tdvof7S8iBndN7kEFN0shgyjwImngmJCwibwQP-mqD3avyTRA1NNIiaNzB0i4Zo_gE9iS8wDFMP51FSIbuCK-mKwMqnJEUQXo9Ix8IoR1A",
            "New Analyst Forecast: $AAPL Given 'Overweight' Rating, accessed on October 4, 2025, https://www.quiverquant.com/news/New+Analyst+Forecast%3A+%24AAPL+Given+%27Overweight%27+Rating",
            "Apple (AAPL) Stock Forecast: Analyst Ratings, Predictions & Price ..., accessed on October 4, 2025, https://public.com/stocks/aapl/forecast-price-target",
            "What is the current Price Target and Forecast for Apple (AAPL) - Zacks Investment Research, accessed on October 4, 2025, https://www.zacks.com/stock/research/AAPL/price-target-stock-forecast",
            "Weekly Stock Market Update | Edward Jones, accessed on October 4, 2025, https://www.edwardjones.com/us-en/market-news-insights/stock-market-news/stock-market-weekly-update",
            "NASDAQ Composite Index (COMP) Historical Data, accessed on October 4, 2025, https://www.nasdaq.com/market-activity/index/comp/historical",
            "S&P 500 (Monthly) - United States - Historical Data & Trends - YCharts, accessed on October 4, 2025, https://ycharts.com/indicators/sp_500",
            "S&P 500 PR (SPX) Performance - Morningstar, accessed on October 4, 2025, https://www.morningstar.com/indexes/spi/spx/performance",
            "United States Stock Market Index - Quote - Chart - Historical Data - Trading Economics, accessed on October 4, 2025, https://tradingeconomics.com/united-states/stock-market",
            "October 2025 - Economic Calendar - Equals Money, accessed on October 4, 2025, https://equalsmoney.com/economic-calendar/october",
            "Economic Calendar - Trading Economics, accessed on October 4, 2025, https://tradingeconomics.com/calendar",
            "United States Economic Calendar for October 6, 2025 - FOREX TradingCharts.com, accessed on October 4, 2025, https://forex.tradingcharts.com/economic_calendar/2025-10-06.html?code=USD",
            "Economic Calendar - FINVIZ.com, accessed on October 4, 2025, https://finviz.com/calendar/economic?dateFrom=2025-10-06",
            "Economic Indicators Calendar - FEDERAL RESERVE BANK of NEW YORK, accessed on October 4, 2025, https://www.newyorkfed.org/research/calendars/nationalecon_cal"
  ]
      },
      short: {
        sections: [
          {
            title: "1. Executive Summary & Weekly Forecast",
            paragraphs: [
              "Weekly Forecast (October 6 - October 10, 2025): Bullish",
              "This report provides a comprehensive analysis of Apple Inc. (AAPL) to forecast its stock price movement for the week of October 6, 2025. The outlook is Bullish, predicting a potential price increase as positive technical momentum, compelling narrative catalysts, and favorable seasonality outweigh high valuations and macro risks.",
              "AAPL is at a critical technical juncture, forming a classic bullish continuation pattern that suggests an imminent breakout. This is supported by Apple's generative AI strategy pivot and robust early demand for the iPhone 17 line. While valuation is historically stretched, institutional buying and options activity suggest investors are willing to pay a premium for growth.",
              "The macroeconomic environment remains generally supportive, though the mid-week release of the FOMC minutes represents a key event risk. Paramount levels for the week include Pivotal Resistance at $257 (a breakout trigger) and Key Support at $250-$253 (a critical technical floor).",
            ]
          },
          {
            title: "2. Price Action and Momentum Analysis",
            paragraphs: [
              "An examination of Apple's price action reveals a sustained uptrend, though declining volume patterns suggest some caution.",
              "AAPL has registered an 8.77% gain over the past month and 33.08% over six months, outperforming broader indices. [1] An accumulation phase starting in August pushed the stock from $202 to around $258. [2] This advance places the stock just below its all-time high of approximately $260, a double-edged sword representing both momentum and potential profit-taking. The stock closed on October 3, 2025, at $257.90. [3]",
              "Average daily volume is robust at 54-57 million shares, though recent volume has hovered below this average. [3] [5] Crucially, a negative price-volume correlation during the ascent suggests weakening conviction among buyers as the price reaches new highs. [7] This warning sign implies that the current uptrend may be maturing and will require a significant catalyst to overcome supply pressure near the all-time high.",
            ]
          },
          {
            title: "3. Technical Levels and Battleground",
            paragraphs: [
              "The technical landscape shows tension between bullish continuation patterns and overbought oscillators.",
              "Apple's long-term price action is framed by a broad ascending channel, with a steeper growth channel confirming trend acceleration since August. [8] A classic bullish bull flag pattern has formed over the past two weeks, consolidating sideways in a tight range that typically resolves upward. [9] The top of this flag aligns with the pivotal resistance at $257.",
              "Technical indicators show a conflicting picture: the price is comfortably above the 50-day and 200-day moving averages [8], but the Relative Strength Index (RSI) is in overbought territory, suggesting vulnerability to a pullback. [8] The short-term intraday MACD is negative [8], but resolving the bull flag with a breakout would restore bullish momentum. The technical battle will likely center on the pivotal resistance level at $257. [7] [1] [8]",
            ],
            table: [
              { level: "Pivotal Resistance", price: "$257.00", desc: "Key resistance, top of bull flag pattern. A decisive close above is the primary bullish trigger. [7]" },
              { level: "Major Resistance", price: "$259.18 - $260.10", desc: "All-time high, psychological barrier. Break could lead to significant short-covering. [1]" },
              { level: "Primary Support", price: "$253.00 - $253.50", desc: "Bottom of bull flag pattern, intraday support. Close below invalidates breakout. [8]" },
              { level: "Major Support", price: "$250.00", desc: "Strong psychological and technical base. Key floor for the stock. [8]" },
            ]
          },
          {
            title: "4. Fundamental Underpinnings and Valuation Realities",
            paragraphs: [
              "Apple's robust fundamental health is currently contrasted against an elevated valuation that prices in significant growth re-acceleration.",
              "In fiscal Q3 2025, Apple generated revenue of $94.04B (+9.63% YoY) and net income of $23.43B (+9.26% YoY), with EPS up 12.14% to $1.57. [3] This was driven by hardware strength and a record $27.4B Services revenue (+13% YoY). [11] Management returned over $27B to shareholders through dividends and buybacks. [11]",
              "However, the stock trades at a trailing P/E of 39.22 [4] and forward P/E of 32.1. [1] This represents a significant premium to historical averages. [1] By comparison, Alphabet (GOOGL) trades at 24.4x forward earnings with a faster projected growth rate of 14.9%. [9] Apple's premium valuation leaves little margin of safety and relies heavily on future narrative catalysts to justify it.",
            ]
          },
          {
            title: "5. Narrative Catalysts and Sentiment",
            paragraphs: [
              "A set of powerful bullish narratives continues to sustain Apple's premium valuation and propel institutional sentiment.",
              "Three primary catalysts drive optimism: (1) Strong initial demand for premium iPhone 17 Pro and Air models launched on September 9. [12] [14] (2) A strategic AI pivot, including Apple Intelligence rollouts [12] and negotiations to license Google's Gemini AI engine. [15] This leverages Apple's 1.5B user base without the capital costs of a cloud data center race. [9] (3) Favorable October seasonality (positive 68.89% historically). [5]",
              "Institutional sentiment is strongly bullish, with upgrades from Morgan Stanley (target $298) [16] and Seaport Global (target $310) [16], contrasting with the lagging consensus target of $247. [17] Unusual options activity is heavily bullish, with CALL options dominating trade logs 8 to 2. [5]",
            ]
          },
          {
            title: "6. The Macroeconomic Context",
            paragraphs: [
              "The macroeconomic backdrop is generally supportive of tech leaders, though it introduces a significant mid-week event risk.",
              "Tech-heavy indices have shown strong risk-on performance, with NASDAQ up 18.0% and S&P 500 up 14.2% YTD. [19] [20] AI enthusiasm and expectations of monetary easing from the Fed support high mega-cap liquidity. [19] However, the release of the FOMC minutes on Wednesday, October 8, represents a key binary event risk that could trigger market volatility. [24]",
            ]
          },
          {
            title: "7. Synthesis and Conclusive Outlook",
            paragraphs: [
              "The forces driving Apple higher\u2014a bull flag technical breakout, iPhone demand, and the strategic AI pivot\u2014outweigh the valuation and event risks. [9] [14] [15] [5] Short-term overbought signals [1] and the FOMC release [27] warrant caution, but technical structures point to an upward resolution.",
              "Under the bullish scenario (high probability), a close above $257 triggers a breakout toward the all-time high of $260 [1] and potentially the $262.50-$265.00 range by week-end. [8] Failing this, the stock may consolidate between support at $253 [8] and resistance at $257. A breakdown below support at $253 would target the major Technical Support floor at $250. [8] Given the momentum, the bullish breakout is the most probable prediction.",
              "Final Prediction: Bullish",
            ]
          },
        ],
        references: [
            "NASDAQ:AAPL Stock Price \u2014 TradingView - Apple Inc., accessed on October 4, 2025, https://www.tradingview.com/symbols/NASDAQ-AAPL/",
            "Stock Price - Apple Investor Relations, accessed on October 4, 2025, https://investor.apple.com/stock-price/default.aspx",
            "Apple Inc (AAPL) Stock Price & News - Google Finance, accessed on October 4, 2025, https://www.google.com/finance/quote/AAPL:NASDAQ",
            "Apple (AAPL) - Real-Time Price & Historical Performance - YCharts, accessed on October 4, 2025, https://ycharts.com/companies/AAPL",
            "AAPL (Apple Inc.) \u2013 Technical Charts and Market Data \u2013 TrendSpider, accessed on October 4, 2025, https://trendspider.com/markets/symbols/AAPL/",
            "Apple (AAPL) Stock Price, Quote, News & History - Nasdaq, accessed on October 4, 2025, https://www.nasdaq.com/market-activity/stocks/aapl",
            "Apple (AAPL) - Technical Analysis - US Stocks - Investtech, accessed on October 4, 2025, https://www.investtech.com/main/market.php?CompanyID=10503307",
            "Apple Inc Trade Ideas \u2014 NASDAQ:AAPL \u2014 TradingView, accessed on October 4, 2025, https://www.tradingview.com/symbols/NASDAQ-AAPL/ideas/?video=yes",
            "Is Apple Stock About to Breakout? - October 1, 2025 - Zacks.com, accessed on October 4, 2025, https://www.zacks.com/commentary/2760415/is-apple-stock-about-to-breakout",
            "Investor Relations - Apple, accessed on October 4, 2025, https://investor.apple.com/investor-relations/default.aspx",
            "AAPL Investor Relations - Apple Inc - Alpha Spread, accessed on October 4, 2025, https://www.alphaspread.com/security/nasdaq/aapl/investor-relations",
            "Newsroom - Apple, accessed on October 4, 2025, https://www.apple.com/newsroom/",
            "Apple Events, accessed on October 4, 2025, https://www.apple.com/apple-events/",
            "AppleInsider: Apple News, Rumors, Reviews, Prices & Deals, accessed on October 4, 2025, https://appleinsider.com/",
            "Apple Releases AI Research Paper, Apple + Gemini? \u2013 Stratechery by Ben Thompson, accessed on October 4, 2025, https://stratechery.com/2024/apple-releases-ai-research-paper-apple-gemini/?access_token=eyJhbGciOiJSUzI1NiIsImtpZCI6InN0cmF0ZWNoZXJ5LnBhc3Nwb3J0Lm9ubGluZSIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJzdHJhdGVjaGVyeS5wYXNzcG9ydC5vbmxpbmUiLCJhenAiOiJIS0xjUzREd1Nod1AyWURLYmZQV00xIiwiZW50Ijp7InVyaSI6WyJodHRwczovL3N0cmF0ZWNoZXJ5LmNvbS8yMDI0L2FwcGxlLXJlbGVhc2VzLWFpLXJlc2VhcmNoLXBhcGVyLWFwcGxlLWdlbWluaS8iXX0sImV4cCI6MTc2MjEwNDU0NiwiaWF0IjoxNzU5NTEyNTQ2LCJpc3MiOiJodHRwczovL2FwcC5wYXNzcG9ydC5vbmxpbmUvb2F1dGgiLCJzY29wZSI6ImZlZWQ6cmVhZCBhcnRpY2xlOnJlYWQgYXNzZXQ6cmVhZCBjYXRlZ29yeTpyZWFkIGVudGl0bGVtZW50cyBwb2RjYXN0IHJzcyIsInN1YiI6IjFjNmEwMTA1LTU4Y2QtNDE0OS1iOWNhLTM3NTRmNDEzNzY3YyIsInVzZSI6ImFjY2VzcyJ9.ZU2osDts6YLRZY3MDR6nSOi4VIJz1AbEpPAdoJWRctWBRSU9wtaKVVBrT00MVK-0KibQPpt3hDD_Or4wHltdkcL1YpBYjaF4JN91RR8B-1ToneTUAY89PzNvAR16i7etsK7mxgxsUxIuDP9oS-rOeHfIM_QdTxxiBzCc7oDrqTKAPv8th1MnVWgBOnbu-nC1c3rETgNTcR7TlSQYr54erSAJdjy82LNa05IgWtk9lJr1tdvof7S8iBndN7kEFN0shgyjwImngmJCwibwQP-mqD3avyTRA1NNIiaNzB0i4Zo_gE9iS8wDFMP51FSIbuCK-mKwMqnJEUQXo9Ix8IoR1A",
            "New Analyst Forecast: $AAPL Given 'Overweight' Rating, accessed on October 4, 2025, https://www.quiverquant.com/news/New+Analyst+Forecast%3A+%24AAPL+Given+%27Overweight%27+Rating",
            "Apple (AAPL) Stock Forecast: Analyst Ratings, Predictions & Price ..., accessed on October 4, 2025, https://public.com/stocks/aapl/forecast-price-target",
            "What is the current Price Target and Forecast for Apple (AAPL) - Zacks Investment Research, accessed on October 4, 2025, https://www.zacks.com/stock/research/AAPL/price-target-stock-forecast",
            "Weekly Stock Market Update | Edward Jones, accessed on October 4, 2025, https://www.edwardjones.com/us-en/market-news-insights/stock-market-news/stock-market-weekly-update",
            "NASDAQ Composite Index (COMP) Historical Data, accessed on October 4, 2025, https://www.nasdaq.com/market-activity/index/comp/historical",
            "S&P 500 (Monthly) - United States - Historical Data & Trends - YCharts, accessed on October 4, 2025, https://ycharts.com/indicators/sp_500",
            "S&P 500 PR (SPX) Performance - Morningstar, accessed on October 4, 2025, https://www.morningstar.com/indexes/spi/spx/performance",
            "United States Stock Market Index - Quote - Chart - Historical Data - Trading Economics, accessed on October 4, 2025, https://tradingeconomics.com/united-states/stock-market",
            "October 2025 - Economic Calendar - Equals Money, accessed on October 4, 2025, https://equalsmoney.com/economic-calendar/october",
            "Economic Calendar - Trading Economics, accessed on October 4, 2025, https://tradingeconomics.com/calendar",
            "United States Economic Calendar for October 6, 2025 - FOREX TradingCharts.com, accessed on October 4, 2025, https://forex.tradingcharts.com/economic_calendar/2025-10-06.html?code=USD",
            "Economic Calendar - FINVIZ.com, accessed on October 4, 2025, https://finviz.com/calendar/economic?dateFrom=2025-10-06",
            "Economic Indicators Calendar - FEDERAL RESERVE BANK of NEW YORK, accessed on October 4, 2025, https://www.newyorkfed.org/research/calendars/nationalecon_cal"
  ]
      }
    },
    MSFT: {
      ticker: 'MSFT',
      name: 'Microsoft Corp.',
      forecast: 'Bearish',
      date: 'October 6 - October 10, 2025',
      full: {
        sections: [
          {
            title: "1. Executive Summary & Weekly Forecast",
            paragraphs: [
              "This report presents an analysis of Microsoft Corp. (MSFT) for the week of October 6, 2025. The overall outlook is Bearish. While Microsoft's long-term cloud growth narrative remains intact, short-term headwinds including margin compression from heavy AI CapEx investments and technical resistance lines suggest a high probability of a near-term correction.",
              "Market sentiment around AI has shifted from uncritical enthusiasm to strict margin inspection. As Microsoft continues to ramp up data center spending, the return on invested capital is lagging. Combined with overbought technical signals and macroeconomic event risks (the Wednesday FOMC minutes), we anticipate selling pressure on MSFT during the upcoming sessions."
            ]
          },
          {
            title: "2. Valuation and CapEx Concerns",
            paragraphs: [
              "Microsoft trades at a forward P/E of 33.4x, which represents a premium to its peer group. [1] More importantly, Capital Expenditures grew by 28% year-over-year to support Azure AI capacity. [2] Analysts are raising concerns that depreciation costs will drag down operating margins by 150-200 basis points in the next two quarters, creating a valuation headwind. [3]"
            ]
          }
        ],
        references: [
          "Zacks Investment Research MSFT analysis - Oct 2025",
          "Microsoft Q4 Fiscal 2025 Earnings Transcript",
          "Goldman Sachs Technology Research - Cloud CapEx Report, Sep 2025"
        ]
      },
      short: {
        sections: [
          {
            title: "Executive Summary",
            paragraphs: [
              "Microsoft Corp. (MSFT) has a Bearish outlook for the week of October 6, 2025, due to valuation pressure from escalating AI CapEx costs and overhead technical resistance."
            ]
          }
        ],
        references: []
      }
    },
    GOOGL: {
      ticker: 'GOOGL',
      name: 'Alphabet Inc.',
      forecast: 'Bullish',
      date: 'October 6 - October 10, 2025',
      full: {
        sections: [
          {
            title: "1. Executive Summary & Weekly Forecast",
            paragraphs: [
              "Alphabet Inc. (GOOGL) exhibits a Bullish outlook. Trading at a highly attractive valuation relative to other mega-cap tech peers (24.4x forward earnings), Google is poised for a re-rating. [1] Licensing negotiations with Apple to integrate Gemini AI onto the iPhone serve as a major catalyst. [2]"
            ]
          }
        ],
        references: [
          "Alpha Spread GOOGL Valuation Analysis - September 2025",
          "Stratechery by Ben Thompson - Apple + Gemini Licensing, Sep 2025"
        ]
      },
      short: {
        sections: [
          {
            title: "Executive Summary",
            paragraphs: [
              "Alphabet Inc. (GOOGL) is Bullish due to a low relative valuation (24.4x forward P/E) and potential licensing catalysts surrounding Gemini integrations."
            ]
          }
        ],
        references: []
      }
    },
    NVDA: {
      ticker: 'NVDA',
      name: 'NVIDIA Corp.',
      forecast: 'Bullish',
      date: 'October 6 - October 10, 2025',
      full: {
        sections: [
          {
            title: "1. Executive Summary",
            paragraphs: [
              "NVIDIA (NVDA) remains Bullish. Supply constraints for Blackwell chips remain the primary limiting factor for revenue, meaning demand is essentially infinite for the next three quarters. [1] Institutional accumulation continues ahead of hardware shipments. [2]"
            ]
          }
        ],
        references: [
          "KeyBanc Capital Markets NVIDIA chip tracker - Sep 2025",
          "Bloomberg Supply Chain Analysis - Blackwell Production, Oct 2025"
        ]
      },
      short: {
        sections: [
          {
            title: "Executive Summary",
            paragraphs: [
              "NVIDIA (NVDA) is Bullish as massive demand for Blackwell GPU architectures continues to outstrip production capacity, driving solid institutional inflows."
            ]
          }
        ],
        references: []
      }
    },
    AMZN: {
      ticker: 'AMZN',
      name: 'Amazon.com Inc.',
      forecast: 'Bearish',
      date: 'October 6 - October 10, 2025',
      full: {
        sections: [
          {
            title: "1. Executive Summary",
            paragraphs: [
              "Amazon (AMZN) is Bearish for the week. Rising logistics costs and worker wage adjustments are expected to pressure e-commerce operating margins. [1] Additionally, technical resistance at $190 has held twice, suggesting a near-term reversion to support. [2]"
            ]
          }
        ],
        references: [
          "Morgan Stanley Retail E-commerce margin report - Sep 2025",
          "Zacks.com AMZN Technical Analysis - Oct 1, 2025"
        ]
      },
      short: {
        sections: [
          {
            title: "Executive Summary",
            paragraphs: [
              "Amazon (AMZN) is Bearish as rising labor and transport costs squeeze retail margins, coupled with technical failure at $190 resistance."
            ]
          }
        ],
        references: []
      }
    }
  },
  2: {
        AAPL: {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      forecast: 'Bullish',
      date: 'October 6 - October 10, 2025',
      full: {
        sections: [
          {
            title: "1. Executive Summary & Weekly Forecast",
            paragraphs: [
              "Weekly Forecast (October 6 - October 10, 2025): Bullish",
              "This report provides a comprehensive analysis of Apple Inc. (AAPL) to forecast its stock price movement for the week of October 6, 2025. The outlook is Bullish, anticipating a potential increase in the stock price. This forecast is predicated on a powerful confluence of factors where positive technical momentum, compelling narrative catalysts, and favorable seasonality are expected to outweigh significant cautionary signals from valuation metrics and overbought indicators.",
              "The core of the current investment thesis rests on the stock's position at a critical technical juncture. AAPL has formed a classic bullish continuation pattern, suggesting an imminent breakout to new highs. This technical strength is underpinned by a potent narrative shift surrounding the company's artificial intelligence strategy and robust early demand signals for its newly launched iPhone 17 product line. While the stock's valuation appears stretched relative to its historical averages and peers, the momentum of institutional sentiment, as evidenced by recent analyst upgrades and options market activity, suggests that market participants are willing to pay a premium for Apple's perceived growth acceleration.",
              "The macroeconomic environment remains broadly supportive, though a key event risk emerges mid-week with the release of the Federal Open Market Committee (FOMC) meeting minutes. For the upcoming week, the following price levels are paramount:",
              "Pivotal Resistance: The price zone around $257 serves as the primary technical and psychological hurdle. A sustained close above this level would confirm the bullish thesis and likely trigger a rapid continuation of the uptrend.",
              "Key Support: The price zone between $250 and $253 represents the most critical area of support. A failure to hold this level would invalidate the immediate bullish setup and signal a period of consolidation or a potential pullback.",
              "In summary, while risks are present, the weight of the evidence suggests the path of least resistance for AAPL in the coming week is to the upside.",
            ]
          },
          {
            title: "2. Price Action and Momentum Analysis",
            paragraphs: [
              "An examination of Apple's recent price action reveals a stock in the grip of a powerful and sustained uptrend. The momentum heading into the week of October 6 is unequivocally positive, though a granular analysis of volume patterns introduces a necessary element of caution.",
              "Recent Performance Deconstruction",
              "Over multiple timeframes, AAPL has demonstrated formidable strength. The stock has registered an 8.77% gain over the past month and an impressive 33.08% gain over the last six months, significantly outperforming the broader market indices. [1] This performance is largely attributable to an aggressive accumulation phase that began in early August 2025. After finding a bottom near $202, the stock embarked on a steep rally, climbing nearly 30% to its current trading range around $258.2",
              "This powerful advance has brought the stock within striking distance of its 52-week and all-time high, which stands at approximately $260.1 Trading in such close proximity to a historical peak is a double-edged sword. On one hand, it signifies immense investor confidence and strong momentum. On the other, it represents a natural area for profit-taking and the emergence of increased supply from sellers, creating a significant technical and psychological barrier. The stock closed the session on October 3, 2025, at $257.90, positioning it directly below this critical resistance zone. [3]",
              "Volume Analysis",
              "A review of trading volume provides a more nuanced perspective on the sustainability of the recent rally. Apple's average daily trading volume over the past 30 days has been robust, hovering between 54 million and 57 million shares. [3] However, some data indicates that the volume over the most recent 30-day period has been below this average. [5] This can sometimes signal a period of consolidation, where the market pauses to digest recent gains before the next directional move.",
              "More critically, a detailed technical analysis highlights a potentially negative correlation between price and volume development during the recent ascent. [7] This analysis notes that volume has been comparatively low at recent price tops and high at price bottoms. This pattern can be interpreted as a sign of weakening conviction among buyers as the price reaches new highs. It suggests that while the price is advancing, the broad-based participation required to fuel a sustainable breakout may be waning. This observation serves as an early, albeit subtle, warning sign that the current uptrend, while powerful, could be maturing and may require a significant catalyst to overcome the supply pressure near its all-time high. The path of least resistance remains upward, but the diminishing volume profile suggests that further gains will not be achieved without a fight.",
            ]
          },
          {
            title: "3. Technical Levels and Battleground",
            paragraphs: [
              "The technical landscape for AAPL is defined by a clear tension between powerful bullish continuation patterns and cautionary signals from key momentum indicators. The stock is coiled at a critical inflection point, and the resolution of the battle at well-defined price levels will likely dictate the directional bias for the entire week.",
              "Chart Patterns and Trend Analysis",
              "The long-term price action for AAPL in 2025 has been framed by a \"broad ascending channel,\" establishing a durable bullish framework for the stock. [8] Within this larger structure, the rally since August has carved out a much steeper and more aggressive \"growth channel,\" confirming a significant acceleration of the uptrend. [8]",
              "Of more immediate importance for the upcoming week is the emergence of a \"bull flag\" pattern over the past two weeks. [9] Following the sharp rally in September, the stock has been consolidating sideways in an increasingly tight range. This pattern is a classic bullish continuation formation, which typically resolves in the direction of the preceding trend. It suggests that the stock is building energy for its next leg higher. The top of this bull flag pattern coincides with the pivotal resistance level near $257.",
              "Key Technical Indicators",
              "Analysis of standard technical indicators reveals a conflicting picture that warrants careful consideration:",
              "Moving Averages: While specific 50-day and 200-day moving average values are not explicitly provided in the available data, the context of multiple technical strategies implies that the current price is trading comfortably above both of these key long-term trend indicators. [8] This is a fundamentally bullish condition, confirming that the stock is in a healthy, long-term uptrend.",
              "Relative Strength Index (RSI): The primary source of technical caution comes from the RSI, which is currently in \"overbought territory\".8 An overbought RSI does not guarantee a price reversal, but it indicates that the upward momentum has been exceptionally strong and that the stock may be vulnerable to a pullback or a period of consolidation as the buying pressure temporarily exhausts itself.",
              "Moving Average Convergence Divergence (MACD): On a very short-term, intraday basis (e.g., a 15-minute chart), the MACD has been described as \"firmly negative\" during recent sessions. [8] This suggests that sellers gained control during the consolidation phase within the bull flag, which is not unusual for such a pattern. However, it underscores the importance of a decisive breakout to re-establish bullish intraday momentum.",
              "Support and Resistance Levels",
              "A synthesis of technical analysis from multiple sources provides a clear map of the key price levels that will serve as battlegrounds for bulls and bears in the coming week. These levels are derived from traditional chart patterns, psychological price points, and data from the options market.",
              "The technical picture is that of a coiled spring. The powerful bullish continuation pattern is pressing directly against a formidable resistance level, while momentum oscillators suggest a state of exhaustion. The week's trading is therefore unlikely to be range-bound; a decisive move is probable. The resolution of the conflict at the $257 level will be the most critical determinant of the stock's direction for the week.",
            ],
            table: [
              { level: "Pivotal Resistance", price: "$257.00", desc: "Key resistance, top of bull flag pattern. A decisive close above is the primary bullish trigger. [7]" },
              { level: "Major Resistance", price: "$259.18 - $260.10", desc: "All-time high, psychological barrier. Break could lead to significant short-covering. [1]" },
              { level: "Secondary Resistance", price: "$262.50 - $265.00", desc: "Options market 'call walls,' next upside targets. Breakout above $260 would target this zone. [8]" },
              { level: "Primary Support", price: "$253.00 - $253.50", desc: "Bottom of bull flag pattern, intraday support. Close below invalidates breakout. [8]" },
              { level: "Major Support", price: "$250.00", desc: "Strong psychological and technical base. Key floor for the stock. [8]" },
              { level: "Secondary Support", price: "$242.50 - $247.50", desc: "Options market 'put support,' significant area where options traders placed bets. [8]" },
              { level: "Value Area Support", price: "$240.00 - $250.00", desc: "Fair Value Gap support zone, prior price imbalance expected to act as strong demand. [8]" },
            ]
          },
          {
            title: "4. Fundamental Underpinnings and Valuation Realities",
            paragraphs: [
              "While short-term price action is often driven by technicals and sentiment, a company's fundamental health provides the essential context for its valuation. Apple's recent financial performance has been robust, demonstrating operational excellence. However, this strength is juxtaposed with a valuation that appears to be pricing in a significant acceleration of future growth, creating a potential point of vulnerability.",
              "Recent Financial Performance (Fiscal Q3 2025)",
              "Apple's most recent earnings report, for the fiscal third quarter ending June 28, 2025, showcased the company's continued ability to generate impressive growth at a massive scale. [3] Key financial highlights from the quarter include:",
              "Revenue: $94.04 billion, an increase of 9.63% year-over-year.",
              "Net Income: $23.43 billion, an increase of 9.26% year-over-year.",
              "Earnings Per Share (EPS): $1.57, an increase of 12.14% year-over-year, benefiting from the company's aggressive share repurchase program.",
              "This strong performance was broad-based, driven by double-digit growth in both iPhone and Mac sales, which defied concerns of a slowdown in consumer hardware spending. [11] Furthermore, the high-margin Services division continued its impressive trajectory, with revenue hitting an all-time high of $27.4 billion, up 13%.11 This ongoing expansion of the services ecosystem is a critical component of the long-term investment thesis, as it provides a recurring and highly profitable revenue stream.",
              "Underscoring its financial strength and management's confidence in the future, Apple returned over $27 billion to shareholders during the quarter through a combination of dividends and share buybacks. [11] This robust capital return program remains a key pillar of support for the stock.",
              "Valuation Analysis",
              "The primary argument for caution regarding AAPL stems from its current valuation. The stock is trading at a price-to-earnings (P/E) ratio of approximately 39.22 based on trailing earnings 4, and roughly 32.1 times forward earnings estimates. [1] This represents a significant premium to the broader market and, more importantly, exceeds Apple's own five-year average P/E ratio. [1] This indicates that investors are currently paying more for each dollar of Apple's earnings than they have, on average, over the past five years.",
              "This premium becomes even more apparent when compared to a key mega-cap technology peer. For instance, Alphabet (GOOGL) currently trades at approximately 24.4 times forward earnings, yet its earnings are projected to grow at a faster rate of 14.9% annually over the next three to five years. [9]",
              "This creates a clear disconnect. Apple's fundamental performance is stellar for a company of its size, but its growth rates are characteristic of a mature, albeit high-quality, enterprise. Its valuation, however, is more akin to that of a high-growth company in an earlier stage of its lifecycle. The market is not valuing Apple based on its recent performance alone; it is pricing in a significant re-acceleration of growth. This dependence on future expectations makes the stock highly sensitive to the narratives and catalysts that are shaping those expectations. Should the market's optimism waver, the elevated valuation provides little margin of safety and could lead to a swift repricing.",
            ]
          },
          {
            title: "5. Narrative Catalysts and Sentiment",
            paragraphs: [
              "The premium valuation currently assigned to Apple's stock is being sustained by a set of powerful, forward-looking narratives that have captured the market's imagination. An analysis of these catalysts, combined with recent analyst sentiment and options market activity, reveals that the \"momentum of sentiment\" is strongly bullish and is the primary force propelling the stock toward its all-time highs.",
              "Primary Bullish Catalysts",
              "Three key factors are currently fueling investor optimism:",
              "The iPhone 17 Product Cycle: The launch of the new iPhone lineup on September 9, 2025\u2014featuring the iPhone 17, iPhone 17 Pro, and the entirely new, thinner iPhone Air\u2014has served as a major positive catalyst. [12] More than just a standard refresh, early reports suggest that demand for the highest-margin Pro models is surging, far outpacing the launch orders for the previous generation. [14] This indicates a strong consumer appetite for premium devices and could lead to a favorable product mix, boosting average selling prices and gross margins in the upcoming quarters.",
              "The AI Narrative Pivot: For much of the year, a primary bear thesis was that Apple was falling behind in the generative artificial intelligence race. [9] This narrative has been effectively neutralized in recent weeks. The company has begun rolling out its own on-device \"Apple Intelligence\" features. [12] More strategically, reports have emerged that Apple is in active negotiations with Google to license its powerful Gemini AI engine for integration into the iPhone. [15] This potential partnership is a masterstroke, repositioning Apple not as a laggard struggling to build its own cloud infrastructure, but as the ultimate distributor of AI to a captive audience of over 1.5 billion users. It leverages Apple's greatest strength\u2014its ecosystem\u2014to participate in the AI revolution without bearing the full cost of competing in the data center arms race.",
              "Favorable Seasonality: Historical data provides a statistical tailwind for the stock in the coming month. Over the past 44 years, the month of October has been positive for AAPL stock 68.89% of the time, suggesting a seasonal tendency for strength during this period. [5]",
              "Analyst and Market Sentiment",
              "Institutional sentiment has shifted decisively in a bullish direction over the past month, a trend that is not yet fully reflected in lagging consensus data.",
              "Recent Analyst Upgrades: A flurry of positive analyst actions has occurred in late September and early October. Morgan Stanley initiated coverage with an \"Overweight\" rating and a $298 price target on October 2, while Seaport Global issued a \"Buy\" rating and a $310 target on October 1.16 These followed \"Outperform\" ratings from Wedbush and Evercore in late September, with price targets of $310 and $290, respectively. [16]",
              "Lagging Consensus: This recent wave of optimism contrasts sharply with the broader consensus price target, which stands at approximately $247.17 This figure, being below the current stock price, is likely skewed by older, more conservative estimates that have not yet been updated to reflect the powerful new AI narrative. The momentum is clearly with the bulls, even if the aggregate data has yet to catch up.",
              "Options Market Activity: The speculative derivatives market corroborates this bullish sentiment. An analysis of ten recent large, \"unusual\" options trades revealed that eight were bullish CALL options, against only two bearish PUTs. [5] This indicates that short-term traders are positioning for further upside in the stock price.",
              "This powerful combination of a strong product cycle, a strategic repositioning in the critical AI landscape, and a clear shift toward bullish sentiment from influential analysts provides the narrative force necessary to support the stock's premium valuation and propel it through technical resistance.",
            ],
            table: {
              headers: ["Firm", "Analyst", "Rating", "Price Target ($)"],
              rows: [
                ["Morgan Stanley", "Erik Woodring", "Overweight", "$298.00"],
                ["Seaport Global", "Jay Goldberg", "Buy", "$310.00"],
                ["Evercore ISI Group", "Amit Daryanani", "Outperform", "$290.00"],
                ["Wedbush", "Daniel Ives", "Outperform", "$310.00"],
                ["Tigress Financial", "Ivan Feinseth", "N/A", "$305.00"],
                ["Bernstein", "Toni Sacconaghi", "Outperform", "$290.00"],
                ["Phillip Securities", "Helena Wang", "Reduce", "$200.00"],
                ["B of A Securities", "N/A", "Buy", "N/A"]
              ]
            }
          },
          {
            title: "6. The Macroeconomic Context",
            paragraphs: [
              "No stock trades in a vacuum, and the broader market environment provides a crucial tailwind or headwind that can influence even the strongest individual securities. For the week of October 6, the macroeconomic backdrop for Apple appears generally permissive and supportive of a continued rally, though it is not without a significant, well-defined event risk that could introduce volatility.",
              "Broader Market Health",
              "The major U.S. stock indices have demonstrated considerable strength and resilience throughout the third quarter and into the beginning of the fourth. As of the end of the prior week, the tech-heavy NASDAQ Composite Index was up 18.0% year-to-date, while the S&P 500 Index had gained 14.2%. [19] This price action reflects a clear \"risk-on\" sentiment among investors. [20]",
              "This positive market momentum is being fueled by two primary forces: secular enthusiasm for artificial intelligence innovation and a cyclical rebound in rate-sensitive sectors based on the expectation that the Federal Reserve will continue its path of easing monetary policy. [19] This environment creates a significant tailwind for mega-cap technology leaders like Apple, which benefit from both the AI theme and the ample market liquidity that accompanies an accommodative central bank policy.",
              "Upcoming Economic Calendar",
              "The economic calendar for the week of October 6-10, 2025, contains several data releases, but one event stands out as having the highest potential to impact market sentiment. [24]",
              "Monday, October 6: No major market-moving releases scheduled.",
              "Tuesday, October 7: U.S. Trade Balance (August), Consumer Credit Change (August). These are typically second-tier reports.",
              "Wednesday, October 8: FOMC Meeting Minutes. This is the most critical economic event of the week.",
              "Thursday, October 9: Wholesale Inventories (August).",
              "Friday, October 10: University of Michigan Consumer Sentiment (Preliminary, October).",
              "The release of the minutes from the Federal Reserve's last policy meeting on Wednesday afternoon will be the week's main event. Market participants will scrutinize the text for any nuances in the committee's discussion regarding the future path of inflation and interest rates. A dovish tone, reinforcing the market's expectation for future rate cuts, would likely add fuel to the ongoing rally. Conversely, any unexpectedly hawkish language suggesting that the Fed is more concerned about inflation than the market currently believes could trigger a broad, market-wide pullback as investors reprice the cost of capital. Data on consumer sentiment and credit will also be watched closely for insights into the health of the U.S. consumer, a critical factor for a company like Apple.",
              "Overall, the macro environment acts as a tailwind heading into the week, but Wednesday afternoon introduces a binary event risk that could override company-specific factors.",
            ]
          },
          {
            title: "7. Synthesis and Conclusive Outlook",
            paragraphs: [
              "The final forecast for Apple's stock price movement in the upcoming week requires a careful weighing of the cumulative evidence, balancing the compelling bullish arguments against the valid points of caution. The analysis indicates that the forces propelling the stock higher currently appear more potent and immediate than the risks that could derail its advance.",
              "Weighing the Evidence",
              "The Bull Case is multifaceted and powerful. It is anchored by a textbook bullish technical setup\u2014a confirmed uptrend consolidating in a bull flag pattern that is poised for a breakout. [9] This technical strength is being fueled by a potent and timely narrative shift, as the company has successfully reframed its AI strategy from a perceived weakness to a strategic strength through its on-device intelligence and potential partnership with Google. [15] This narrative is amplified by strong early demand signals for the new iPhone 17 lineup. [14] This positive story is being validated by a wave of recent, high-profile analyst upgrades and bullish positioning in the options market. [5] Finally, the stock benefits from favorable October seasonality and a supportive, risk-on macroeconomic backdrop. [5]",
              "The Bear Case centers on three primary risks. First, the stock is technically overbought, with the RSI indicator flashing a warning of potential short-term exhaustion as it confronts major resistance at its all-time high. [1] Second, the stock's valuation is undeniably stretched, trading at a significant premium to its own history and to key peers, leaving it vulnerable to a correction if the optimistic growth narrative falters. [9] Third, subtle signs of weakening volume on the ascent suggest that conviction may be waning. [7] Finally, the release of the FOMC minutes on Wednesday introduces a significant external event risk that could trigger market-wide volatility independent of Apple's own fundamentals. [27]",
              "Final Synthesis and Price Scenarios",
              "The weight of the evidence tilts in favor of a bullish resolution. The strength, recency, and clarity of the narrative catalysts\u2014specifically the AI pivot and the strong iPhone demand\u2014appear to be the dominant market-moving force at present. This powerful narrative provides the justification for investors to look past the high valuation and push the stock through its technical resistance. The bull flag pattern is a high-probability setup, and in a supportive market environment, these patterns tend to resolve to the upside. While the FOMC minutes pose a risk, the market's current momentum seems resilient enough to absorb anything short of a dramatically hawkish surprise.",
              "The most likely scenarios for the week are as follows:",
              "Bullish Scenario (High Probability): The stock achieves a decisive daily close above the $257 resistance level early in the week. This breakout triggers a continuation move, fueled by momentum traders and options-related hedging, driving the price toward the all-time high near $260 and potentially into the $262.50-$265.00 range by the end of the week.",
              "Neutral/Consolidation Scenario (Moderate Probability): The stock attempts to break $257 but fails, meeting significant selling pressure. However, buyers emerge to defend the support level at ~$253. The stock then spends the week trading within this tight $253-$257 range as it digests its recent gains and awaits a fresh catalyst.",
              "Bearish Scenario (Low Probability): A sharp rejection at the $257 resistance, potentially combined with a surprisingly hawkish tone from the FOMC minutes, leads to a technical breakdown. The stock closes below the $253 support level, invalidating the bull flag and triggering a pullback to test the major support zone at $250.",
              "Given the confluence of positive factors, the bullish scenario is assessed as the most probable outcome.",
              "Final Prediction: Bullish",
            ]
          },
        ],
        references: [
            "NASDAQ:AAPL Stock Price \u2014 TradingView - Apple Inc., accessed on October 4, 2025, https://www.tradingview.com/symbols/NASDAQ-AAPL/",
            "Stock Price - Apple Investor Relations, accessed on October 4, 2025, https://investor.apple.com/stock-price/default.aspx",
            "Apple Inc (AAPL) Stock Price & News - Google Finance, accessed on October 4, 2025, https://www.google.com/finance/quote/AAPL:NASDAQ",
            "Apple (AAPL) - Real-Time Price & Historical Performance - YCharts, accessed on October 4, 2025, https://ycharts.com/companies/AAPL",
            "AAPL (Apple Inc.) \u2013 Technical Charts and Market Data \u2013 TrendSpider, accessed on October 4, 2025, https://trendspider.com/markets/symbols/AAPL/",
            "Apple (AAPL) Stock Price, Quote, News & History - Nasdaq, accessed on October 4, 2025, https://www.nasdaq.com/market-activity/stocks/aapl",
            "Apple (AAPL) - Technical Analysis - US Stocks - Investtech, accessed on October 4, 2025, https://www.investtech.com/main/market.php?CompanyID=10503307",
            "Apple Inc Trade Ideas \u2014 NASDAQ:AAPL \u2014 TradingView, accessed on October 4, 2025, https://www.tradingview.com/symbols/NASDAQ-AAPL/ideas/?video=yes",
            "Is Apple Stock About to Breakout? - October 1, 2025 - Zacks.com, accessed on October 4, 2025, https://www.zacks.com/commentary/2760415/is-apple-stock-about-to-breakout",
            "Investor Relations - Apple, accessed on October 4, 2025, https://investor.apple.com/investor-relations/default.aspx",
            "AAPL Investor Relations - Apple Inc - Alpha Spread, accessed on October 4, 2025, https://www.alphaspread.com/security/nasdaq/aapl/investor-relations",
            "Newsroom - Apple, accessed on October 4, 2025, https://www.apple.com/newsroom/",
            "Apple Events, accessed on October 4, 2025, https://www.apple.com/apple-events/",
            "AppleInsider: Apple News, Rumors, Reviews, Prices & Deals, accessed on October 4, 2025, https://appleinsider.com/",
            "Apple Releases AI Research Paper, Apple + Gemini? \u2013 Stratechery by Ben Thompson, accessed on October 4, 2025, https://stratechery.com/2024/apple-releases-ai-research-paper-apple-gemini/?access_token=eyJhbGciOiJSUzI1NiIsImtpZCI6InN0cmF0ZWNoZXJ5LnBhc3Nwb3J0Lm9ubGluZSIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJzdHJhdGVjaGVyeS5wYXNzcG9ydC5vbmxpbmUiLCJhenAiOiJIS0xjUzREd1Nod1AyWURLYmZQV00xIiwiZW50Ijp7InVyaSI6WyJodHRwczovL3N0cmF0ZWNoZXJ5LmNvbS8yMDI0L2FwcGxlLXJlbGVhc2VzLWFpLXJlc2VhcmNoLXBhcGVyLWFwcGxlLWdlbWluaS8iXX0sImV4cCI6MTc2MjEwNDU0NiwiaWF0IjoxNzU5NTEyNTQ2LCJpc3MiOiJodHRwczovL2FwcC5wYXNzcG9ydC5vbmxpbmUvb2F1dGgiLCJzY29wZSI6ImZlZWQ6cmVhZCBhcnRpY2xlOnJlYWQgYXNzZXQ6cmVhZCBjYXRlZ29yeTpyZWFkIGVudGl0bGVtZW50cyBwb2RjYXN0IHJzcyIsInN1YiI6IjFjNmEwMTA1LTU4Y2QtNDE0OS1iOWNhLTM3NTRmNDEzNzY3YyIsInVzZSI6ImFjY2VzcyJ9.ZU2osDts6YLRZY3MDR6nSOi4VIJz1AbEpPAdoJWRctWBRSU9wtaKVVBrT00MVK-0KibQPpt3hDD_Or4wHltdkcL1YpBYjaF4JN91RR8B-1ToneTUAY89PzNvAR16i7etsK7mxgxsUxIuDP9oS-rOeHfIM_QdTxxiBzCc7oDrqTKAPv8th1MnVWgBOnbu-nC1c3rETgNTcR7TlSQYr54erSAJdjy82LNa05IgWtk9lJr1tdvof7S8iBndN7kEFN0shgyjwImngmJCwibwQP-mqD3avyTRA1NNIiaNzB0i4Zo_gE9iS8wDFMP51FSIbuCK-mKwMqnJEUQXo9Ix8IoR1A",
            "New Analyst Forecast: $AAPL Given 'Overweight' Rating, accessed on October 4, 2025, https://www.quiverquant.com/news/New+Analyst+Forecast%3A+%24AAPL+Given+%27Overweight%27+Rating",
            "Apple (AAPL) Stock Forecast: Analyst Ratings, Predictions & Price ..., accessed on October 4, 2025, https://public.com/stocks/aapl/forecast-price-target",
            "What is the current Price Target and Forecast for Apple (AAPL) - Zacks Investment Research, accessed on October 4, 2025, https://www.zacks.com/stock/research/AAPL/price-target-stock-forecast",
            "Weekly Stock Market Update | Edward Jones, accessed on October 4, 2025, https://www.edwardjones.com/us-en/market-news-insights/stock-market-news/stock-market-weekly-update",
            "NASDAQ Composite Index (COMP) Historical Data, accessed on October 4, 2025, https://www.nasdaq.com/market-activity/index/comp/historical",
            "S&P 500 (Monthly) - United States - Historical Data & Trends - YCharts, accessed on October 4, 2025, https://ycharts.com/indicators/sp_500",
            "S&P 500 PR (SPX) Performance - Morningstar, accessed on October 4, 2025, https://www.morningstar.com/indexes/spi/spx/performance",
            "United States Stock Market Index - Quote - Chart - Historical Data - Trading Economics, accessed on October 4, 2025, https://tradingeconomics.com/united-states/stock-market",
            "October 2025 - Economic Calendar - Equals Money, accessed on October 4, 2025, https://equalsmoney.com/economic-calendar/october",
            "Economic Calendar - Trading Economics, accessed on October 4, 2025, https://tradingeconomics.com/calendar",
            "United States Economic Calendar for October 6, 2025 - FOREX TradingCharts.com, accessed on October 4, 2025, https://forex.tradingcharts.com/economic_calendar/2025-10-06.html?code=USD",
            "Economic Calendar - FINVIZ.com, accessed on October 4, 2025, https://finviz.com/calendar/economic?dateFrom=2025-10-06",
            "Economic Indicators Calendar - FEDERAL RESERVE BANK of NEW YORK, accessed on October 4, 2025, https://www.newyorkfed.org/research/calendars/nationalecon_cal"
  ]
      },
      short: {
        sections: [
          {
            title: "1. Executive Summary & Weekly Forecast",
            paragraphs: [
              "Weekly Forecast (October 6 - October 10, 2025): Bullish",
              "This report provides a comprehensive analysis of Apple Inc. (AAPL) to forecast its stock price movement for the week of October 6, 2025. The outlook is Bullish, predicting a potential price increase as positive technical momentum, compelling narrative catalysts, and favorable seasonality outweigh high valuations and macro risks.",
              "AAPL is at a critical technical juncture, forming a classic bullish continuation pattern that suggests an imminent breakout. This is supported by Apple's generative AI strategy pivot and robust early demand for the iPhone 17 line. While valuation is historically stretched, institutional buying and options activity suggest investors are willing to pay a premium for growth.",
              "The macroeconomic environment remains generally supportive, though the mid-week release of the FOMC minutes represents a key event risk. Paramount levels for the week include Pivotal Resistance at $257 (a breakout trigger) and Key Support at $250-$253 (a critical technical floor).",
            ]
          },
          {
            title: "2. Price Action and Momentum Analysis",
            paragraphs: [
              "An examination of Apple's price action reveals a sustained uptrend, though declining volume patterns suggest some caution.",
              "AAPL has registered an 8.77% gain over the past month and 33.08% over six months, outperforming broader indices. [1] An accumulation phase starting in August pushed the stock from $202 to around $258. [2] This advance places the stock just below its all-time high of approximately $260, a double-edged sword representing both momentum and potential profit-taking. The stock closed on October 3, 2025, at $257.90. [3]",
              "Average daily volume is robust at 54-57 million shares, though recent volume has hovered below this average. [3] [5] Crucially, a negative price-volume correlation during the ascent suggests weakening conviction among buyers as the price reaches new highs. [7] This warning sign implies that the current uptrend may be maturing and will require a significant catalyst to overcome supply pressure near the all-time high.",
            ]
          },
          {
            title: "3. Technical Levels and Battleground",
            paragraphs: [
              "The technical landscape shows tension between bullish continuation patterns and overbought oscillators.",
              "Apple's long-term price action is framed by a broad ascending channel, with a steeper growth channel confirming trend acceleration since August. [8] A classic bullish bull flag pattern has formed over the past two weeks, consolidating sideways in a tight range that typically resolves upward. [9] The top of this flag aligns with the pivotal resistance at $257.",
              "Technical indicators show a conflicting picture: the price is comfortably above the 50-day and 200-day moving averages [8], but the Relative Strength Index (RSI) is in overbought territory, suggesting vulnerability to a pullback. [8] The short-term intraday MACD is negative [8], but resolving the bull flag with a breakout would restore bullish momentum. The technical battle will likely center on the pivotal resistance level at $257. [7] [1] [8]",
            ],
            table: [
              { level: "Pivotal Resistance", price: "$257.00", desc: "Key resistance, top of bull flag pattern. A decisive close above is the primary bullish trigger. [7]" },
              { level: "Major Resistance", price: "$259.18 - $260.10", desc: "All-time high, psychological barrier. Break could lead to significant short-covering. [1]" },
              { level: "Primary Support", price: "$253.00 - $253.50", desc: "Bottom of bull flag pattern, intraday support. Close below invalidates breakout. [8]" },
              { level: "Major Support", price: "$250.00", desc: "Strong psychological and technical base. Key floor for the stock. [8]" },
            ]
          },
          {
            title: "4. Fundamental Underpinnings and Valuation Realities",
            paragraphs: [
              "Apple's robust fundamental health is currently contrasted against an elevated valuation that prices in significant growth re-acceleration.",
              "In fiscal Q3 2025, Apple generated revenue of $94.04B (+9.63% YoY) and net income of $23.43B (+9.26% YoY), with EPS up 12.14% to $1.57. [3] This was driven by hardware strength and a record $27.4B Services revenue (+13% YoY). [11] Management returned over $27B to shareholders through dividends and buybacks. [11]",
              "However, the stock trades at a trailing P/E of 39.22 [4] and forward P/E of 32.1. [1] This represents a significant premium to historical averages. [1] By comparison, Alphabet (GOOGL) trades at 24.4x forward earnings with a faster projected growth rate of 14.9%. [9] Apple's premium valuation leaves little margin of safety and relies heavily on future narrative catalysts to justify it.",
            ]
          },
          {
            title: "5. Narrative Catalysts and Sentiment",
            paragraphs: [
              "A set of powerful bullish narratives continues to sustain Apple's premium valuation and propel institutional sentiment.",
              "Three primary catalysts drive optimism: (1) Strong initial demand for premium iPhone 17 Pro and Air models launched on September 9. [12] [14] (2) A strategic AI pivot, including Apple Intelligence rollouts [12] and negotiations to license Google's Gemini AI engine. [15] This leverages Apple's 1.5B user base without the capital costs of a cloud data center race. [9] (3) Favorable October seasonality (positive 68.89% historically). [5]",
              "Institutional sentiment is strongly bullish, with upgrades from Morgan Stanley (target $298) [16] and Seaport Global (target $310) [16], contrasting with the lagging consensus target of $247. [17] Unusual options activity is heavily bullish, with CALL options dominating trade logs 8 to 2. [5]",
            ]
          },
          {
            title: "6. The Macroeconomic Context",
            paragraphs: [
              "The macroeconomic backdrop is generally supportive of tech leaders, though it introduces a significant mid-week event risk.",
              "Tech-heavy indices have shown strong risk-on performance, with NASDAQ up 18.0% and S&P 500 up 14.2% YTD. [19] [20] AI enthusiasm and expectations of monetary easing from the Fed support high mega-cap liquidity. [19] However, the release of the FOMC minutes on Wednesday, October 8, represents a key binary event risk that could trigger market volatility. [24]",
            ]
          },
          {
            title: "7. Synthesis and Conclusive Outlook",
            paragraphs: [
              "The forces driving Apple higher\u2014a bull flag technical breakout, iPhone demand, and the strategic AI pivot\u2014outweigh the valuation and event risks. [9] [14] [15] [5] Short-term overbought signals [1] and the FOMC release [27] warrant caution, but technical structures point to an upward resolution.",
              "Under the bullish scenario (high probability), a close above $257 triggers a breakout toward the all-time high of $260 [1] and potentially the $262.50-$265.00 range by week-end. [8] Failing this, the stock may consolidate between support at $253 [8] and resistance at $257. A breakdown below support at $253 would target the major Technical Support floor at $250. [8] Given the momentum, the bullish breakout is the most probable prediction.",
              "Final Prediction: Bullish",
            ]
          },
        ],
        references: [
            "NASDAQ:AAPL Stock Price \u2014 TradingView - Apple Inc., accessed on October 4, 2025, https://www.tradingview.com/symbols/NASDAQ-AAPL/",
            "Stock Price - Apple Investor Relations, accessed on October 4, 2025, https://investor.apple.com/stock-price/default.aspx",
            "Apple Inc (AAPL) Stock Price & News - Google Finance, accessed on October 4, 2025, https://www.google.com/finance/quote/AAPL:NASDAQ",
            "Apple (AAPL) - Real-Time Price & Historical Performance - YCharts, accessed on October 4, 2025, https://ycharts.com/companies/AAPL",
            "AAPL (Apple Inc.) \u2013 Technical Charts and Market Data \u2013 TrendSpider, accessed on October 4, 2025, https://trendspider.com/markets/symbols/AAPL/",
            "Apple (AAPL) Stock Price, Quote, News & History - Nasdaq, accessed on October 4, 2025, https://www.nasdaq.com/market-activity/stocks/aapl",
            "Apple (AAPL) - Technical Analysis - US Stocks - Investtech, accessed on October 4, 2025, https://www.investtech.com/main/market.php?CompanyID=10503307",
            "Apple Inc Trade Ideas \u2014 NASDAQ:AAPL \u2014 TradingView, accessed on October 4, 2025, https://www.tradingview.com/symbols/NASDAQ-AAPL/ideas/?video=yes",
            "Is Apple Stock About to Breakout? - October 1, 2025 - Zacks.com, accessed on October 4, 2025, https://www.zacks.com/commentary/2760415/is-apple-stock-about-to-breakout",
            "Investor Relations - Apple, accessed on October 4, 2025, https://investor.apple.com/investor-relations/default.aspx",
            "AAPL Investor Relations - Apple Inc - Alpha Spread, accessed on October 4, 2025, https://www.alphaspread.com/security/nasdaq/aapl/investor-relations",
            "Newsroom - Apple, accessed on October 4, 2025, https://www.apple.com/newsroom/",
            "Apple Events, accessed on October 4, 2025, https://www.apple.com/apple-events/",
            "AppleInsider: Apple News, Rumors, Reviews, Prices & Deals, accessed on October 4, 2025, https://appleinsider.com/",
            "Apple Releases AI Research Paper, Apple + Gemini? \u2013 Stratechery by Ben Thompson, accessed on October 4, 2025, https://stratechery.com/2024/apple-releases-ai-research-paper-apple-gemini/?access_token=eyJhbGciOiJSUzI1NiIsImtpZCI6InN0cmF0ZWNoZXJ5LnBhc3Nwb3J0Lm9ubGluZSIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJzdHJhdGVjaGVyeS5wYXNzcG9ydC5vbmxpbmUiLCJhenAiOiJIS0xjUzREd1Nod1AyWURLYmZQV00xIiwiZW50Ijp7InVyaSI6WyJodHRwczovL3N0cmF0ZWNoZXJ5LmNvbS8yMDI0L2FwcGxlLXJlbGVhc2VzLWFpLXJlc2VhcmNoLXBhcGVyLWFwcGxlLWdlbWluaS8iXX0sImV4cCI6MTc2MjEwNDU0NiwiaWF0IjoxNzU5NTEyNTQ2LCJpc3MiOiJodHRwczovL2FwcC5wYXNzcG9ydC5vbmxpbmUvb2F1dGgiLCJzY29wZSI6ImZlZWQ6cmVhZCBhcnRpY2xlOnJlYWQgYXNzZXQ6cmVhZCBjYXRlZ29yeTpyZWFkIGVudGl0bGVtZW50cyBwb2RjYXN0IHJzcyIsInN1YiI6IjFjNmEwMTA1LTU4Y2QtNDE0OS1iOWNhLTM3NTRmNDEzNzY3YyIsInVzZSI6ImFjY2VzcyJ9.ZU2osDts6YLRZY3MDR6nSOi4VIJz1AbEpPAdoJWRctWBRSU9wtaKVVBrT00MVK-0KibQPpt3hDD_Or4wHltdkcL1YpBYjaF4JN91RR8B-1ToneTUAY89PzNvAR16i7etsK7mxgxsUxIuDP9oS-rOeHfIM_QdTxxiBzCc7oDrqTKAPv8th1MnVWgBOnbu-nC1c3rETgNTcR7TlSQYr54erSAJdjy82LNa05IgWtk9lJr1tdvof7S8iBndN7kEFN0shgyjwImngmJCwibwQP-mqD3avyTRA1NNIiaNzB0i4Zo_gE9iS8wDFMP51FSIbuCK-mKwMqnJEUQXo9Ix8IoR1A",
            "New Analyst Forecast: $AAPL Given 'Overweight' Rating, accessed on October 4, 2025, https://www.quiverquant.com/news/New+Analyst+Forecast%3A+%24AAPL+Given+%27Overweight%27+Rating",
            "Apple (AAPL) Stock Forecast: Analyst Ratings, Predictions & Price ..., accessed on October 4, 2025, https://public.com/stocks/aapl/forecast-price-target",
            "What is the current Price Target and Forecast for Apple (AAPL) - Zacks Investment Research, accessed on October 4, 2025, https://www.zacks.com/stock/research/AAPL/price-target-stock-forecast",
            "Weekly Stock Market Update | Edward Jones, accessed on October 4, 2025, https://www.edwardjones.com/us-en/market-news-insights/stock-market-news/stock-market-weekly-update",
            "NASDAQ Composite Index (COMP) Historical Data, accessed on October 4, 2025, https://www.nasdaq.com/market-activity/index/comp/historical",
            "S&P 500 (Monthly) - United States - Historical Data & Trends - YCharts, accessed on October 4, 2025, https://ycharts.com/indicators/sp_500",
            "S&P 500 PR (SPX) Performance - Morningstar, accessed on October 4, 2025, https://www.morningstar.com/indexes/spi/spx/performance",
            "United States Stock Market Index - Quote - Chart - Historical Data - Trading Economics, accessed on October 4, 2025, https://tradingeconomics.com/united-states/stock-market",
            "October 2025 - Economic Calendar - Equals Money, accessed on October 4, 2025, https://equalsmoney.com/economic-calendar/october",
            "Economic Calendar - Trading Economics, accessed on October 4, 2025, https://tradingeconomics.com/calendar",
            "United States Economic Calendar for October 6, 2025 - FOREX TradingCharts.com, accessed on October 4, 2025, https://forex.tradingcharts.com/economic_calendar/2025-10-06.html?code=USD",
            "Economic Calendar - FINVIZ.com, accessed on October 4, 2025, https://finviz.com/calendar/economic?dateFrom=2025-10-06",
            "Economic Indicators Calendar - FEDERAL RESERVE BANK of NEW YORK, accessed on October 4, 2025, https://www.newyorkfed.org/research/calendars/nationalecon_cal"
  ]
      }
    },
    MSFT: {
      ticker: 'MSFT',
      name: 'Microsoft Corp.',
      forecast: 'Bearish',
      date: 'October 13 - October 17, 2025',
      full: {
        sections: [
          {
            title: "1. Executive Summary",
            paragraphs: [
              "Microsoft remains Bearish. Following a drop below the 50-day moving average, MSFT is facing technical breakdown momentum. CapEx concerns have been amplified by similar trends in other hyperscalers. [1] Next major support is at $390. [2]"
            ]
          }
        ],
        references: [
          "Bloomberg Hyperscale Spending Summary - Oct 2025",
          "Zacks.com MSFT Trend Breakdown - Oct 10, 2025"
        ]
      },
      short: {
        sections: [
          {
            title: "Executive Summary",
            paragraphs: [
              "Microsoft Corp. (MSFT) is Bearish. The stock broke key 50-day moving average support and targets $390 as AI margins are re-evaluated."
            ]
          }
        ],
        references: []
      }
    },
    GOOGL: {
      ticker: 'GOOGL',
      name: 'Alphabet Inc.',
      forecast: 'Neutral',
      date: 'October 13 - October 17, 2025',
      full: {
        sections: [
          {
            title: "1. Executive Summary",
            paragraphs: [
              "Alphabet is Neutral for the week. The stock has rallied 3% and is now fairly valued. Regulatory antitrust updates regarding Google Search create an event risk that offsets near-term bullish factors. [1]"
            ]
          }
        ],
        references: [
          "Department of Justice Antitrust Update - Oct 2025"
        ]
      },
      short: {
        sections: [
          {
            title: "Executive Summary",
            paragraphs: [
              "Alphabet Inc. (GOOGL) is Neutral as regulatory antitrust overhangs balance cheap valuation metrics after last week's rally."
            ]
          }
        ],
        references: []
      }
    },
    NVDA: {
      ticker: 'NVDA',
      name: 'NVIDIA Corp.',
      forecast: 'Bearish',
      date: 'October 13 - October 17, 2025',
      full: {
        sections: [
          {
            title: "1. Executive Summary",
            paragraphs: [
              "NVIDIA is Bearish for the week. Extreme overbought conditions on the daily RSI (78) indicate high risk of profit-taking. Reports of minor packaging delays in the Blackwell line may be used by the market as an excuse to sell. [1]"
            ]
          }
        ],
        references: [
          "DigiTimes Blackwell Packaging report - Oct 2025"
        ]
      },
      short: {
        sections: [
          {
            title: "Executive Summary",
            paragraphs: [
              "NVIDIA (NVDA) is Bearish. RSI indicates overbought territory, and minor supply-chain packaging reports may prompt tactical profit-taking."
            ]
          }
        ],
        references: []
      }
    },
    AMZN: {
      ticker: 'AMZN',
      name: 'Amazon.com Inc.',
      forecast: 'Bullish',
      date: 'October 13 - October 17, 2025',
      full: {
        sections: [
          {
            title: "1. Executive Summary",
            paragraphs: [
              "Amazon is Bullish. E-commerce transaction volume trends for the early fall show surprise resilience. AWS cloud growth is also accelerating as enterprise migrations ramp up. The stock has successfully tested its $180 floor. [1]"
            ]
          }
        ],
        references: [
          "Adobe Analytics Digital Economy Index - Oct 2025"
        ]
      },
      short: {
        sections: [
          {
            title: "Executive Summary",
            paragraphs: [
              "Amazon.com Inc. (AMZN) is Bullish. AWS cloud growth is showing solid enterprise momentum, and e-commerce volumes remain resilient."
            ]
          }
        ],
        references: []
      }
    }
  },
  3: {
        AAPL: {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      forecast: 'Bullish',
      date: 'October 6 - October 10, 2025',
      full: {
        sections: [
          {
            title: "1. Executive Summary & Weekly Forecast",
            paragraphs: [
              "Weekly Forecast (October 6 - October 10, 2025): Bullish",
              "This report provides a comprehensive analysis of Apple Inc. (AAPL) to forecast its stock price movement for the week of October 6, 2025. The outlook is Bullish, anticipating a potential increase in the stock price. This forecast is predicated on a powerful confluence of factors where positive technical momentum, compelling narrative catalysts, and favorable seasonality are expected to outweigh significant cautionary signals from valuation metrics and overbought indicators.",
              "The core of the current investment thesis rests on the stock's position at a critical technical juncture. AAPL has formed a classic bullish continuation pattern, suggesting an imminent breakout to new highs. This technical strength is underpinned by a potent narrative shift surrounding the company's artificial intelligence strategy and robust early demand signals for its newly launched iPhone 17 product line. While the stock's valuation appears stretched relative to its historical averages and peers, the momentum of institutional sentiment, as evidenced by recent analyst upgrades and options market activity, suggests that market participants are willing to pay a premium for Apple's perceived growth acceleration.",
              "The macroeconomic environment remains broadly supportive, though a key event risk emerges mid-week with the release of the Federal Open Market Committee (FOMC) meeting minutes. For the upcoming week, the following price levels are paramount:",
              "Pivotal Resistance: The price zone around $257 serves as the primary technical and psychological hurdle. A sustained close above this level would confirm the bullish thesis and likely trigger a rapid continuation of the uptrend.",
              "Key Support: The price zone between $250 and $253 represents the most critical area of support. A failure to hold this level would invalidate the immediate bullish setup and signal a period of consolidation or a potential pullback.",
              "In summary, while risks are present, the weight of the evidence suggests the path of least resistance for AAPL in the coming week is to the upside.",
            ]
          },
          {
            title: "2. Price Action and Momentum Analysis",
            paragraphs: [
              "An examination of Apple's recent price action reveals a stock in the grip of a powerful and sustained uptrend. The momentum heading into the week of October 6 is unequivocally positive, though a granular analysis of volume patterns introduces a necessary element of caution.",
              "Recent Performance Deconstruction",
              "Over multiple timeframes, AAPL has demonstrated formidable strength. The stock has registered an 8.77% gain over the past month and an impressive 33.08% gain over the last six months, significantly outperforming the broader market indices. [1] This performance is largely attributable to an aggressive accumulation phase that began in early August 2025. After finding a bottom near $202, the stock embarked on a steep rally, climbing nearly 30% to its current trading range around $258.2",
              "This powerful advance has brought the stock within striking distance of its 52-week and all-time high, which stands at approximately $260.1 Trading in such close proximity to a historical peak is a double-edged sword. On one hand, it signifies immense investor confidence and strong momentum. On the other, it represents a natural area for profit-taking and the emergence of increased supply from sellers, creating a significant technical and psychological barrier. The stock closed the session on October 3, 2025, at $257.90, positioning it directly below this critical resistance zone. [3]",
              "Volume Analysis",
              "A review of trading volume provides a more nuanced perspective on the sustainability of the recent rally. Apple's average daily trading volume over the past 30 days has been robust, hovering between 54 million and 57 million shares. [3] However, some data indicates that the volume over the most recent 30-day period has been below this average. [5] This can sometimes signal a period of consolidation, where the market pauses to digest recent gains before the next directional move.",
              "More critically, a detailed technical analysis highlights a potentially negative correlation between price and volume development during the recent ascent. [7] This analysis notes that volume has been comparatively low at recent price tops and high at price bottoms. This pattern can be interpreted as a sign of weakening conviction among buyers as the price reaches new highs. It suggests that while the price is advancing, the broad-based participation required to fuel a sustainable breakout may be waning. This observation serves as an early, albeit subtle, warning sign that the current uptrend, while powerful, could be maturing and may require a significant catalyst to overcome the supply pressure near its all-time high. The path of least resistance remains upward, but the diminishing volume profile suggests that further gains will not be achieved without a fight.",
            ]
          },
          {
            title: "3. Technical Levels and Battleground",
            paragraphs: [
              "The technical landscape for AAPL is defined by a clear tension between powerful bullish continuation patterns and cautionary signals from key momentum indicators. The stock is coiled at a critical inflection point, and the resolution of the battle at well-defined price levels will likely dictate the directional bias for the entire week.",
              "Chart Patterns and Trend Analysis",
              "The long-term price action for AAPL in 2025 has been framed by a \"broad ascending channel,\" establishing a durable bullish framework for the stock. [8] Within this larger structure, the rally since August has carved out a much steeper and more aggressive \"growth channel,\" confirming a significant acceleration of the uptrend. [8]",
              "Of more immediate importance for the upcoming week is the emergence of a \"bull flag\" pattern over the past two weeks. [9] Following the sharp rally in September, the stock has been consolidating sideways in an increasingly tight range. This pattern is a classic bullish continuation formation, which typically resolves in the direction of the preceding trend. It suggests that the stock is building energy for its next leg higher. The top of this bull flag pattern coincides with the pivotal resistance level near $257.",
              "Key Technical Indicators",
              "Analysis of standard technical indicators reveals a conflicting picture that warrants careful consideration:",
              "Moving Averages: While specific 50-day and 200-day moving average values are not explicitly provided in the available data, the context of multiple technical strategies implies that the current price is trading comfortably above both of these key long-term trend indicators. [8] This is a fundamentally bullish condition, confirming that the stock is in a healthy, long-term uptrend.",
              "Relative Strength Index (RSI): The primary source of technical caution comes from the RSI, which is currently in \"overbought territory\".8 An overbought RSI does not guarantee a price reversal, but it indicates that the upward momentum has been exceptionally strong and that the stock may be vulnerable to a pullback or a period of consolidation as the buying pressure temporarily exhausts itself.",
              "Moving Average Convergence Divergence (MACD): On a very short-term, intraday basis (e.g., a 15-minute chart), the MACD has been described as \"firmly negative\" during recent sessions. [8] This suggests that sellers gained control during the consolidation phase within the bull flag, which is not unusual for such a pattern. However, it underscores the importance of a decisive breakout to re-establish bullish intraday momentum.",
              "Support and Resistance Levels",
              "A synthesis of technical analysis from multiple sources provides a clear map of the key price levels that will serve as battlegrounds for bulls and bears in the coming week. These levels are derived from traditional chart patterns, psychological price points, and data from the options market.",
              "The technical picture is that of a coiled spring. The powerful bullish continuation pattern is pressing directly against a formidable resistance level, while momentum oscillators suggest a state of exhaustion. The week's trading is therefore unlikely to be range-bound; a decisive move is probable. The resolution of the conflict at the $257 level will be the most critical determinant of the stock's direction for the week.",
            ],
            table: [
              { level: "Pivotal Resistance", price: "$257.00", desc: "Key resistance, top of bull flag pattern. A decisive close above is the primary bullish trigger. [7]" },
              { level: "Major Resistance", price: "$259.18 - $260.10", desc: "All-time high, psychological barrier. Break could lead to significant short-covering. [1]" },
              { level: "Secondary Resistance", price: "$262.50 - $265.00", desc: "Options market 'call walls,' next upside targets. Breakout above $260 would target this zone. [8]" },
              { level: "Primary Support", price: "$253.00 - $253.50", desc: "Bottom of bull flag pattern, intraday support. Close below invalidates breakout. [8]" },
              { level: "Major Support", price: "$250.00", desc: "Strong psychological and technical base. Key floor for the stock. [8]" },
              { level: "Secondary Support", price: "$242.50 - $247.50", desc: "Options market 'put support,' significant area where options traders placed bets. [8]" },
              { level: "Value Area Support", price: "$240.00 - $250.00", desc: "Fair Value Gap support zone, prior price imbalance expected to act as strong demand. [8]" },
            ]
          },
          {
            title: "4. Fundamental Underpinnings and Valuation Realities",
            paragraphs: [
              "While short-term price action is often driven by technicals and sentiment, a company's fundamental health provides the essential context for its valuation. Apple's recent financial performance has been robust, demonstrating operational excellence. However, this strength is juxtaposed with a valuation that appears to be pricing in a significant acceleration of future growth, creating a potential point of vulnerability.",
              "Recent Financial Performance (Fiscal Q3 2025)",
              "Apple's most recent earnings report, for the fiscal third quarter ending June 28, 2025, showcased the company's continued ability to generate impressive growth at a massive scale. [3] Key financial highlights from the quarter include:",
              "Revenue: $94.04 billion, an increase of 9.63% year-over-year.",
              "Net Income: $23.43 billion, an increase of 9.26% year-over-year.",
              "Earnings Per Share (EPS): $1.57, an increase of 12.14% year-over-year, benefiting from the company's aggressive share repurchase program.",
              "This strong performance was broad-based, driven by double-digit growth in both iPhone and Mac sales, which defied concerns of a slowdown in consumer hardware spending. [11] Furthermore, the high-margin Services division continued its impressive trajectory, with revenue hitting an all-time high of $27.4 billion, up 13%.11 This ongoing expansion of the services ecosystem is a critical component of the long-term investment thesis, as it provides a recurring and highly profitable revenue stream.",
              "Underscoring its financial strength and management's confidence in the future, Apple returned over $27 billion to shareholders during the quarter through a combination of dividends and share buybacks. [11] This robust capital return program remains a key pillar of support for the stock.",
              "Valuation Analysis",
              "The primary argument for caution regarding AAPL stems from its current valuation. The stock is trading at a price-to-earnings (P/E) ratio of approximately 39.22 based on trailing earnings 4, and roughly 32.1 times forward earnings estimates. [1] This represents a significant premium to the broader market and, more importantly, exceeds Apple's own five-year average P/E ratio. [1] This indicates that investors are currently paying more for each dollar of Apple's earnings than they have, on average, over the past five years.",
              "This premium becomes even more apparent when compared to a key mega-cap technology peer. For instance, Alphabet (GOOGL) currently trades at approximately 24.4 times forward earnings, yet its earnings are projected to grow at a faster rate of 14.9% annually over the next three to five years. [9]",
              "This creates a clear disconnect. Apple's fundamental performance is stellar for a company of its size, but its growth rates are characteristic of a mature, albeit high-quality, enterprise. Its valuation, however, is more akin to that of a high-growth company in an earlier stage of its lifecycle. The market is not valuing Apple based on its recent performance alone; it is pricing in a significant re-acceleration of growth. This dependence on future expectations makes the stock highly sensitive to the narratives and catalysts that are shaping those expectations. Should the market's optimism waver, the elevated valuation provides little margin of safety and could lead to a swift repricing.",
            ]
          },
          {
            title: "5. Narrative Catalysts and Sentiment",
            paragraphs: [
              "The premium valuation currently assigned to Apple's stock is being sustained by a set of powerful, forward-looking narratives that have captured the market's imagination. An analysis of these catalysts, combined with recent analyst sentiment and options market activity, reveals that the \"momentum of sentiment\" is strongly bullish and is the primary force propelling the stock toward its all-time highs.",
              "Primary Bullish Catalysts",
              "Three key factors are currently fueling investor optimism:",
              "The iPhone 17 Product Cycle: The launch of the new iPhone lineup on September 9, 2025\u2014featuring the iPhone 17, iPhone 17 Pro, and the entirely new, thinner iPhone Air\u2014has served as a major positive catalyst. [12] More than just a standard refresh, early reports suggest that demand for the highest-margin Pro models is surging, far outpacing the launch orders for the previous generation. [14] This indicates a strong consumer appetite for premium devices and could lead to a favorable product mix, boosting average selling prices and gross margins in the upcoming quarters.",
              "The AI Narrative Pivot: For much of the year, a primary bear thesis was that Apple was falling behind in the generative artificial intelligence race. [9] This narrative has been effectively neutralized in recent weeks. The company has begun rolling out its own on-device \"Apple Intelligence\" features. [12] More strategically, reports have emerged that Apple is in active negotiations with Google to license its powerful Gemini AI engine for integration into the iPhone. [15] This potential partnership is a masterstroke, repositioning Apple not as a laggard struggling to build its own cloud infrastructure, but as the ultimate distributor of AI to a captive audience of over 1.5 billion users. It leverages Apple's greatest strength\u2014its ecosystem\u2014to participate in the AI revolution without bearing the full cost of competing in the data center arms race.",
              "Favorable Seasonality: Historical data provides a statistical tailwind for the stock in the coming month. Over the past 44 years, the month of October has been positive for AAPL stock 68.89% of the time, suggesting a seasonal tendency for strength during this period. [5]",
              "Analyst and Market Sentiment",
              "Institutional sentiment has shifted decisively in a bullish direction over the past month, a trend that is not yet fully reflected in lagging consensus data.",
              "Recent Analyst Upgrades: A flurry of positive analyst actions has occurred in late September and early October. Morgan Stanley initiated coverage with an \"Overweight\" rating and a $298 price target on October 2, while Seaport Global issued a \"Buy\" rating and a $310 target on October 1.16 These followed \"Outperform\" ratings from Wedbush and Evercore in late September, with price targets of $310 and $290, respectively. [16]",
              "Lagging Consensus: This recent wave of optimism contrasts sharply with the broader consensus price target, which stands at approximately $247.17 This figure, being below the current stock price, is likely skewed by older, more conservative estimates that have not yet been updated to reflect the powerful new AI narrative. The momentum is clearly with the bulls, even if the aggregate data has yet to catch up.",
              "Options Market Activity: The speculative derivatives market corroborates this bullish sentiment. An analysis of ten recent large, \"unusual\" options trades revealed that eight were bullish CALL options, against only two bearish PUTs. [5] This indicates that short-term traders are positioning for further upside in the stock price.",
              "This powerful combination of a strong product cycle, a strategic repositioning in the critical AI landscape, and a clear shift toward bullish sentiment from influential analysts provides the narrative force necessary to support the stock's premium valuation and propel it through technical resistance.",
            ],
            table: {
              headers: ["Firm", "Analyst", "Rating", "Price Target ($)"],
              rows: [
                ["Morgan Stanley", "Erik Woodring", "Overweight", "$298.00"],
                ["Seaport Global", "Jay Goldberg", "Buy", "$310.00"],
                ["Evercore ISI Group", "Amit Daryanani", "Outperform", "$290.00"],
                ["Wedbush", "Daniel Ives", "Outperform", "$310.00"],
                ["Tigress Financial", "Ivan Feinseth", "N/A", "$305.00"],
                ["Bernstein", "Toni Sacconaghi", "Outperform", "$290.00"],
                ["Phillip Securities", "Helena Wang", "Reduce", "$200.00"],
                ["B of A Securities", "N/A", "Buy", "N/A"]
              ]
            }
          },
          {
            title: "6. The Macroeconomic Context",
            paragraphs: [
              "No stock trades in a vacuum, and the broader market environment provides a crucial tailwind or headwind that can influence even the strongest individual securities. For the week of October 6, the macroeconomic backdrop for Apple appears generally permissive and supportive of a continued rally, though it is not without a significant, well-defined event risk that could introduce volatility.",
              "Broader Market Health",
              "The major U.S. stock indices have demonstrated considerable strength and resilience throughout the third quarter and into the beginning of the fourth. As of the end of the prior week, the tech-heavy NASDAQ Composite Index was up 18.0% year-to-date, while the S&P 500 Index had gained 14.2%. [19] This price action reflects a clear \"risk-on\" sentiment among investors. [20]",
              "This positive market momentum is being fueled by two primary forces: secular enthusiasm for artificial intelligence innovation and a cyclical rebound in rate-sensitive sectors based on the expectation that the Federal Reserve will continue its path of easing monetary policy. [19] This environment creates a significant tailwind for mega-cap technology leaders like Apple, which benefit from both the AI theme and the ample market liquidity that accompanies an accommodative central bank policy.",
              "Upcoming Economic Calendar",
              "The economic calendar for the week of October 6-10, 2025, contains several data releases, but one event stands out as having the highest potential to impact market sentiment. [24]",
              "Monday, October 6: No major market-moving releases scheduled.",
              "Tuesday, October 7: U.S. Trade Balance (August), Consumer Credit Change (August). These are typically second-tier reports.",
              "Wednesday, October 8: FOMC Meeting Minutes. This is the most critical economic event of the week.",
              "Thursday, October 9: Wholesale Inventories (August).",
              "Friday, October 10: University of Michigan Consumer Sentiment (Preliminary, October).",
              "The release of the minutes from the Federal Reserve's last policy meeting on Wednesday afternoon will be the week's main event. Market participants will scrutinize the text for any nuances in the committee's discussion regarding the future path of inflation and interest rates. A dovish tone, reinforcing the market's expectation for future rate cuts, would likely add fuel to the ongoing rally. Conversely, any unexpectedly hawkish language suggesting that the Fed is more concerned about inflation than the market currently believes could trigger a broad, market-wide pullback as investors reprice the cost of capital. Data on consumer sentiment and credit will also be watched closely for insights into the health of the U.S. consumer, a critical factor for a company like Apple.",
              "Overall, the macro environment acts as a tailwind heading into the week, but Wednesday afternoon introduces a binary event risk that could override company-specific factors.",
            ]
          },
          {
            title: "7. Synthesis and Conclusive Outlook",
            paragraphs: [
              "The final forecast for Apple's stock price movement in the upcoming week requires a careful weighing of the cumulative evidence, balancing the compelling bullish arguments against the valid points of caution. The analysis indicates that the forces propelling the stock higher currently appear more potent and immediate than the risks that could derail its advance.",
              "Weighing the Evidence",
              "The Bull Case is multifaceted and powerful. It is anchored by a textbook bullish technical setup\u2014a confirmed uptrend consolidating in a bull flag pattern that is poised for a breakout. [9] This technical strength is being fueled by a potent and timely narrative shift, as the company has successfully reframed its AI strategy from a perceived weakness to a strategic strength through its on-device intelligence and potential partnership with Google. [15] This narrative is amplified by strong early demand signals for the new iPhone 17 lineup. [14] This positive story is being validated by a wave of recent, high-profile analyst upgrades and bullish positioning in the options market. [5] Finally, the stock benefits from favorable October seasonality and a supportive, risk-on macroeconomic backdrop. [5]",
              "The Bear Case centers on three primary risks. First, the stock is technically overbought, with the RSI indicator flashing a warning of potential short-term exhaustion as it confronts major resistance at its all-time high. [1] Second, the stock's valuation is undeniably stretched, trading at a significant premium to its own history and to key peers, leaving it vulnerable to a correction if the optimistic growth narrative falters. [9] Third, subtle signs of weakening volume on the ascent suggest that conviction may be waning. [7] Finally, the release of the FOMC minutes on Wednesday introduces a significant external event risk that could trigger market-wide volatility independent of Apple's own fundamentals. [27]",
              "Final Synthesis and Price Scenarios",
              "The weight of the evidence tilts in favor of a bullish resolution. The strength, recency, and clarity of the narrative catalysts\u2014specifically the AI pivot and the strong iPhone demand\u2014appear to be the dominant market-moving force at present. This powerful narrative provides the justification for investors to look past the high valuation and push the stock through its technical resistance. The bull flag pattern is a high-probability setup, and in a supportive market environment, these patterns tend to resolve to the upside. While the FOMC minutes pose a risk, the market's current momentum seems resilient enough to absorb anything short of a dramatically hawkish surprise.",
              "The most likely scenarios for the week are as follows:",
              "Bullish Scenario (High Probability): The stock achieves a decisive daily close above the $257 resistance level early in the week. This breakout triggers a continuation move, fueled by momentum traders and options-related hedging, driving the price toward the all-time high near $260 and potentially into the $262.50-$265.00 range by the end of the week.",
              "Neutral/Consolidation Scenario (Moderate Probability): The stock attempts to break $257 but fails, meeting significant selling pressure. However, buyers emerge to defend the support level at ~$253. The stock then spends the week trading within this tight $253-$257 range as it digests its recent gains and awaits a fresh catalyst.",
              "Bearish Scenario (Low Probability): A sharp rejection at the $257 resistance, potentially combined with a surprisingly hawkish tone from the FOMC minutes, leads to a technical breakdown. The stock closes below the $253 support level, invalidating the bull flag and triggering a pullback to test the major support zone at $250.",
              "Given the confluence of positive factors, the bullish scenario is assessed as the most probable outcome.",
              "Final Prediction: Bullish",
            ]
          },
        ],
        references: [
            "NASDAQ:AAPL Stock Price \u2014 TradingView - Apple Inc., accessed on October 4, 2025, https://www.tradingview.com/symbols/NASDAQ-AAPL/",
            "Stock Price - Apple Investor Relations, accessed on October 4, 2025, https://investor.apple.com/stock-price/default.aspx",
            "Apple Inc (AAPL) Stock Price & News - Google Finance, accessed on October 4, 2025, https://www.google.com/finance/quote/AAPL:NASDAQ",
            "Apple (AAPL) - Real-Time Price & Historical Performance - YCharts, accessed on October 4, 2025, https://ycharts.com/companies/AAPL",
            "AAPL (Apple Inc.) \u2013 Technical Charts and Market Data \u2013 TrendSpider, accessed on October 4, 2025, https://trendspider.com/markets/symbols/AAPL/",
            "Apple (AAPL) Stock Price, Quote, News & History - Nasdaq, accessed on October 4, 2025, https://www.nasdaq.com/market-activity/stocks/aapl",
            "Apple (AAPL) - Technical Analysis - US Stocks - Investtech, accessed on October 4, 2025, https://www.investtech.com/main/market.php?CompanyID=10503307",
            "Apple Inc Trade Ideas \u2014 NASDAQ:AAPL \u2014 TradingView, accessed on October 4, 2025, https://www.tradingview.com/symbols/NASDAQ-AAPL/ideas/?video=yes",
            "Is Apple Stock About to Breakout? - October 1, 2025 - Zacks.com, accessed on October 4, 2025, https://www.zacks.com/commentary/2760415/is-apple-stock-about-to-breakout",
            "Investor Relations - Apple, accessed on October 4, 2025, https://investor.apple.com/investor-relations/default.aspx",
            "AAPL Investor Relations - Apple Inc - Alpha Spread, accessed on October 4, 2025, https://www.alphaspread.com/security/nasdaq/aapl/investor-relations",
            "Newsroom - Apple, accessed on October 4, 2025, https://www.apple.com/newsroom/",
            "Apple Events, accessed on October 4, 2025, https://www.apple.com/apple-events/",
            "AppleInsider: Apple News, Rumors, Reviews, Prices & Deals, accessed on October 4, 2025, https://appleinsider.com/",
            "Apple Releases AI Research Paper, Apple + Gemini? \u2013 Stratechery by Ben Thompson, accessed on October 4, 2025, https://stratechery.com/2024/apple-releases-ai-research-paper-apple-gemini/?access_token=eyJhbGciOiJSUzI1NiIsImtpZCI6InN0cmF0ZWNoZXJ5LnBhc3Nwb3J0Lm9ubGluZSIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJzdHJhdGVjaGVyeS5wYXNzcG9ydC5vbmxpbmUiLCJhenAiOiJIS0xjUzREd1Nod1AyWURLYmZQV00xIiwiZW50Ijp7InVyaSI6WyJodHRwczovL3N0cmF0ZWNoZXJ5LmNvbS8yMDI0L2FwcGxlLXJlbGVhc2VzLWFpLXJlc2VhcmNoLXBhcGVyLWFwcGxlLWdlbWluaS8iXX0sImV4cCI6MTc2MjEwNDU0NiwiaWF0IjoxNzU5NTEyNTQ2LCJpc3MiOiJodHRwczovL2FwcC5wYXNzcG9ydC5vbmxpbmUvb2F1dGgiLCJzY29wZSI6ImZlZWQ6cmVhZCBhcnRpY2xlOnJlYWQgYXNzZXQ6cmVhZCBjYXRlZ29yeTpyZWFkIGVudGl0bGVtZW50cyBwb2RjYXN0IHJzcyIsInN1YiI6IjFjNmEwMTA1LTU4Y2QtNDE0OS1iOWNhLTM3NTRmNDEzNzY3YyIsInVzZSI6ImFjY2VzcyJ9.ZU2osDts6YLRZY3MDR6nSOi4VIJz1AbEpPAdoJWRctWBRSU9wtaKVVBrT00MVK-0KibQPpt3hDD_Or4wHltdkcL1YpBYjaF4JN91RR8B-1ToneTUAY89PzNvAR16i7etsK7mxgxsUxIuDP9oS-rOeHfIM_QdTxxiBzCc7oDrqTKAPv8th1MnVWgBOnbu-nC1c3rETgNTcR7TlSQYr54erSAJdjy82LNa05IgWtk9lJr1tdvof7S8iBndN7kEFN0shgyjwImngmJCwibwQP-mqD3avyTRA1NNIiaNzB0i4Zo_gE9iS8wDFMP51FSIbuCK-mKwMqnJEUQXo9Ix8IoR1A",
            "New Analyst Forecast: $AAPL Given 'Overweight' Rating, accessed on October 4, 2025, https://www.quiverquant.com/news/New+Analyst+Forecast%3A+%24AAPL+Given+%27Overweight%27+Rating",
            "Apple (AAPL) Stock Forecast: Analyst Ratings, Predictions & Price ..., accessed on October 4, 2025, https://public.com/stocks/aapl/forecast-price-target",
            "What is the current Price Target and Forecast for Apple (AAPL) - Zacks Investment Research, accessed on October 4, 2025, https://www.zacks.com/stock/research/AAPL/price-target-stock-forecast",
            "Weekly Stock Market Update | Edward Jones, accessed on October 4, 2025, https://www.edwardjones.com/us-en/market-news-insights/stock-market-news/stock-market-weekly-update",
            "NASDAQ Composite Index (COMP) Historical Data, accessed on October 4, 2025, https://www.nasdaq.com/market-activity/index/comp/historical",
            "S&P 500 (Monthly) - United States - Historical Data & Trends - YCharts, accessed on October 4, 2025, https://ycharts.com/indicators/sp_500",
            "S&P 500 PR (SPX) Performance - Morningstar, accessed on October 4, 2025, https://www.morningstar.com/indexes/spi/spx/performance",
            "United States Stock Market Index - Quote - Chart - Historical Data - Trading Economics, accessed on October 4, 2025, https://tradingeconomics.com/united-states/stock-market",
            "October 2025 - Economic Calendar - Equals Money, accessed on October 4, 2025, https://equalsmoney.com/economic-calendar/october",
            "Economic Calendar - Trading Economics, accessed on October 4, 2025, https://tradingeconomics.com/calendar",
            "United States Economic Calendar for October 6, 2025 - FOREX TradingCharts.com, accessed on October 4, 2025, https://forex.tradingcharts.com/economic_calendar/2025-10-06.html?code=USD",
            "Economic Calendar - FINVIZ.com, accessed on October 4, 2025, https://finviz.com/calendar/economic?dateFrom=2025-10-06",
            "Economic Indicators Calendar - FEDERAL RESERVE BANK of NEW YORK, accessed on October 4, 2025, https://www.newyorkfed.org/research/calendars/nationalecon_cal"
  ]
      },
      short: {
        sections: [
          {
            title: "1. Executive Summary & Weekly Forecast",
            paragraphs: [
              "Weekly Forecast (October 6 - October 10, 2025): Bullish",
              "This report provides a comprehensive analysis of Apple Inc. (AAPL) to forecast its stock price movement for the week of October 6, 2025. The outlook is Bullish, predicting a potential price increase as positive technical momentum, compelling narrative catalysts, and favorable seasonality outweigh high valuations and macro risks.",
              "AAPL is at a critical technical juncture, forming a classic bullish continuation pattern that suggests an imminent breakout. This is supported by Apple's generative AI strategy pivot and robust early demand for the iPhone 17 line. While valuation is historically stretched, institutional buying and options activity suggest investors are willing to pay a premium for growth.",
              "The macroeconomic environment remains generally supportive, though the mid-week release of the FOMC minutes represents a key event risk. Paramount levels for the week include Pivotal Resistance at $257 (a breakout trigger) and Key Support at $250-$253 (a critical technical floor).",
            ]
          },
          {
            title: "2. Price Action and Momentum Analysis",
            paragraphs: [
              "An examination of Apple's price action reveals a sustained uptrend, though declining volume patterns suggest some caution.",
              "AAPL has registered an 8.77% gain over the past month and 33.08% over six months, outperforming broader indices. [1] An accumulation phase starting in August pushed the stock from $202 to around $258. [2] This advance places the stock just below its all-time high of approximately $260, a double-edged sword representing both momentum and potential profit-taking. The stock closed on October 3, 2025, at $257.90. [3]",
              "Average daily volume is robust at 54-57 million shares, though recent volume has hovered below this average. [3] [5] Crucially, a negative price-volume correlation during the ascent suggests weakening conviction among buyers as the price reaches new highs. [7] This warning sign implies that the current uptrend may be maturing and will require a significant catalyst to overcome supply pressure near the all-time high.",
            ]
          },
          {
            title: "3. Technical Levels and Battleground",
            paragraphs: [
              "The technical landscape shows tension between bullish continuation patterns and overbought oscillators.",
              "Apple's long-term price action is framed by a broad ascending channel, with a steeper growth channel confirming trend acceleration since August. [8] A classic bullish bull flag pattern has formed over the past two weeks, consolidating sideways in a tight range that typically resolves upward. [9] The top of this flag aligns with the pivotal resistance at $257.",
              "Technical indicators show a conflicting picture: the price is comfortably above the 50-day and 200-day moving averages [8], but the Relative Strength Index (RSI) is in overbought territory, suggesting vulnerability to a pullback. [8] The short-term intraday MACD is negative [8], but resolving the bull flag with a breakout would restore bullish momentum. The technical battle will likely center on the pivotal resistance level at $257. [7] [1] [8]",
            ],
            table: [
              { level: "Pivotal Resistance", price: "$257.00", desc: "Key resistance, top of bull flag pattern. A decisive close above is the primary bullish trigger. [7]" },
              { level: "Major Resistance", price: "$259.18 - $260.10", desc: "All-time high, psychological barrier. Break could lead to significant short-covering. [1]" },
              { level: "Primary Support", price: "$253.00 - $253.50", desc: "Bottom of bull flag pattern, intraday support. Close below invalidates breakout. [8]" },
              { level: "Major Support", price: "$250.00", desc: "Strong psychological and technical base. Key floor for the stock. [8]" },
            ]
          },
          {
            title: "4. Fundamental Underpinnings and Valuation Realities",
            paragraphs: [
              "Apple's robust fundamental health is currently contrasted against an elevated valuation that prices in significant growth re-acceleration.",
              "In fiscal Q3 2025, Apple generated revenue of $94.04B (+9.63% YoY) and net income of $23.43B (+9.26% YoY), with EPS up 12.14% to $1.57. [3] This was driven by hardware strength and a record $27.4B Services revenue (+13% YoY). [11] Management returned over $27B to shareholders through dividends and buybacks. [11]",
              "However, the stock trades at a trailing P/E of 39.22 [4] and forward P/E of 32.1. [1] This represents a significant premium to historical averages. [1] By comparison, Alphabet (GOOGL) trades at 24.4x forward earnings with a faster projected growth rate of 14.9%. [9] Apple's premium valuation leaves little margin of safety and relies heavily on future narrative catalysts to justify it.",
            ]
          },
          {
            title: "5. Narrative Catalysts and Sentiment",
            paragraphs: [
              "A set of powerful bullish narratives continues to sustain Apple's premium valuation and propel institutional sentiment.",
              "Three primary catalysts drive optimism: (1) Strong initial demand for premium iPhone 17 Pro and Air models launched on September 9. [12] [14] (2) A strategic AI pivot, including Apple Intelligence rollouts [12] and negotiations to license Google's Gemini AI engine. [15] This leverages Apple's 1.5B user base without the capital costs of a cloud data center race. [9] (3) Favorable October seasonality (positive 68.89% historically). [5]",
              "Institutional sentiment is strongly bullish, with upgrades from Morgan Stanley (target $298) [16] and Seaport Global (target $310) [16], contrasting with the lagging consensus target of $247. [17] Unusual options activity is heavily bullish, with CALL options dominating trade logs 8 to 2. [5]",
            ]
          },
          {
            title: "6. The Macroeconomic Context",
            paragraphs: [
              "The macroeconomic backdrop is generally supportive of tech leaders, though it introduces a significant mid-week event risk.",
              "Tech-heavy indices have shown strong risk-on performance, with NASDAQ up 18.0% and S&P 500 up 14.2% YTD. [19] [20] AI enthusiasm and expectations of monetary easing from the Fed support high mega-cap liquidity. [19] However, the release of the FOMC minutes on Wednesday, October 8, represents a key binary event risk that could trigger market volatility. [24]",
            ]
          },
          {
            title: "7. Synthesis and Conclusive Outlook",
            paragraphs: [
              "The forces driving Apple higher\u2014a bull flag technical breakout, iPhone demand, and the strategic AI pivot\u2014outweigh the valuation and event risks. [9] [14] [15] [5] Short-term overbought signals [1] and the FOMC release [27] warrant caution, but technical structures point to an upward resolution.",
              "Under the bullish scenario (high probability), a close above $257 triggers a breakout toward the all-time high of $260 [1] and potentially the $262.50-$265.00 range by week-end. [8] Failing this, the stock may consolidate between support at $253 [8] and resistance at $257. A breakdown below support at $253 would target the major Technical Support floor at $250. [8] Given the momentum, the bullish breakout is the most probable prediction.",
              "Final Prediction: Bullish",
            ]
          },
        ],
        references: [
            "NASDAQ:AAPL Stock Price \u2014 TradingView - Apple Inc., accessed on October 4, 2025, https://www.tradingview.com/symbols/NASDAQ-AAPL/",
            "Stock Price - Apple Investor Relations, accessed on October 4, 2025, https://investor.apple.com/stock-price/default.aspx",
            "Apple Inc (AAPL) Stock Price & News - Google Finance, accessed on October 4, 2025, https://www.google.com/finance/quote/AAPL:NASDAQ",
            "Apple (AAPL) - Real-Time Price & Historical Performance - YCharts, accessed on October 4, 2025, https://ycharts.com/companies/AAPL",
            "AAPL (Apple Inc.) \u2013 Technical Charts and Market Data \u2013 TrendSpider, accessed on October 4, 2025, https://trendspider.com/markets/symbols/AAPL/",
            "Apple (AAPL) Stock Price, Quote, News & History - Nasdaq, accessed on October 4, 2025, https://www.nasdaq.com/market-activity/stocks/aapl",
            "Apple (AAPL) - Technical Analysis - US Stocks - Investtech, accessed on October 4, 2025, https://www.investtech.com/main/market.php?CompanyID=10503307",
            "Apple Inc Trade Ideas \u2014 NASDAQ:AAPL \u2014 TradingView, accessed on October 4, 2025, https://www.tradingview.com/symbols/NASDAQ-AAPL/ideas/?video=yes",
            "Is Apple Stock About to Breakout? - October 1, 2025 - Zacks.com, accessed on October 4, 2025, https://www.zacks.com/commentary/2760415/is-apple-stock-about-to-breakout",
            "Investor Relations - Apple, accessed on October 4, 2025, https://investor.apple.com/investor-relations/default.aspx",
            "AAPL Investor Relations - Apple Inc - Alpha Spread, accessed on October 4, 2025, https://www.alphaspread.com/security/nasdaq/aapl/investor-relations",
            "Newsroom - Apple, accessed on October 4, 2025, https://www.apple.com/newsroom/",
            "Apple Events, accessed on October 4, 2025, https://www.apple.com/apple-events/",
            "AppleInsider: Apple News, Rumors, Reviews, Prices & Deals, accessed on October 4, 2025, https://appleinsider.com/",
            "Apple Releases AI Research Paper, Apple + Gemini? \u2013 Stratechery by Ben Thompson, accessed on October 4, 2025, https://stratechery.com/2024/apple-releases-ai-research-paper-apple-gemini/?access_token=eyJhbGciOiJSUzI1NiIsImtpZCI6InN0cmF0ZWNoZXJ5LnBhc3Nwb3J0Lm9ubGluZSIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJzdHJhdGVjaGVyeS5wYXNzcG9ydC5vbmxpbmUiLCJhenAiOiJIS0xjUzREd1Nod1AyWURLYmZQV00xIiwiZW50Ijp7InVyaSI6WyJodHRwczovL3N0cmF0ZWNoZXJ5LmNvbS8yMDI0L2FwcGxlLXJlbGVhc2VzLWFpLXJlc2VhcmNoLXBhcGVyLWFwcGxlLWdlbWluaS8iXX0sImV4cCI6MTc2MjEwNDU0NiwiaWF0IjoxNzU5NTEyNTQ2LCJpc3MiOiJodHRwczovL2FwcC5wYXNzcG9ydC5vbmxpbmUvb2F1dGgiLCJzY29wZSI6ImZlZWQ6cmVhZCBhcnRpY2xlOnJlYWQgYXNzZXQ6cmVhZCBjYXRlZ29yeTpyZWFkIGVudGl0bGVtZW50cyBwb2RjYXN0IHJzcyIsInN1YiI6IjFjNmEwMTA1LTU4Y2QtNDE0OS1iOWNhLTM3NTRmNDEzNzY3YyIsInVzZSI6ImFjY2VzcyJ9.ZU2osDts6YLRZY3MDR6nSOi4VIJz1AbEpPAdoJWRctWBRSU9wtaKVVBrT00MVK-0KibQPpt3hDD_Or4wHltdkcL1YpBYjaF4JN91RR8B-1ToneTUAY89PzNvAR16i7etsK7mxgxsUxIuDP9oS-rOeHfIM_QdTxxiBzCc7oDrqTKAPv8th1MnVWgBOnbu-nC1c3rETgNTcR7TlSQYr54erSAJdjy82LNa05IgWtk9lJr1tdvof7S8iBndN7kEFN0shgyjwImngmJCwibwQP-mqD3avyTRA1NNIiaNzB0i4Zo_gE9iS8wDFMP51FSIbuCK-mKwMqnJEUQXo9Ix8IoR1A",
            "New Analyst Forecast: $AAPL Given 'Overweight' Rating, accessed on October 4, 2025, https://www.quiverquant.com/news/New+Analyst+Forecast%3A+%24AAPL+Given+%27Overweight%27+Rating",
            "Apple (AAPL) Stock Forecast: Analyst Ratings, Predictions & Price ..., accessed on October 4, 2025, https://public.com/stocks/aapl/forecast-price-target",
            "What is the current Price Target and Forecast for Apple (AAPL) - Zacks Investment Research, accessed on October 4, 2025, https://www.zacks.com/stock/research/AAPL/price-target-stock-forecast",
            "Weekly Stock Market Update | Edward Jones, accessed on October 4, 2025, https://www.edwardjones.com/us-en/market-news-insights/stock-market-news/stock-market-weekly-update",
            "NASDAQ Composite Index (COMP) Historical Data, accessed on October 4, 2025, https://www.nasdaq.com/market-activity/index/comp/historical",
            "S&P 500 (Monthly) - United States - Historical Data & Trends - YCharts, accessed on October 4, 2025, https://ycharts.com/indicators/sp_500",
            "S&P 500 PR (SPX) Performance - Morningstar, accessed on October 4, 2025, https://www.morningstar.com/indexes/spi/spx/performance",
            "United States Stock Market Index - Quote - Chart - Historical Data - Trading Economics, accessed on October 4, 2025, https://tradingeconomics.com/united-states/stock-market",
            "October 2025 - Economic Calendar - Equals Money, accessed on October 4, 2025, https://equalsmoney.com/economic-calendar/october",
            "Economic Calendar - Trading Economics, accessed on October 4, 2025, https://tradingeconomics.com/calendar",
            "United States Economic Calendar for October 6, 2025 - FOREX TradingCharts.com, accessed on October 4, 2025, https://forex.tradingcharts.com/economic_calendar/2025-10-06.html?code=USD",
            "Economic Calendar - FINVIZ.com, accessed on October 4, 2025, https://finviz.com/calendar/economic?dateFrom=2025-10-06",
            "Economic Indicators Calendar - FEDERAL RESERVE BANK of NEW YORK, accessed on October 4, 2025, https://www.newyorkfed.org/research/calendars/nationalecon_cal"
  ]
      }
    },
    MSFT: {
      ticker: 'MSFT',
      name: 'Microsoft Corp.',
      forecast: 'Bullish',
      date: 'October 20 - October 24, 2025',
      full: {
        sections: [
          {
            title: "1. Executive Summary",
            paragraphs: [
              "Microsoft is Bullish. After a 6% pullback, valuation has compressed to a more supportive 31.0x forward earnings. Azure AI integrations are showing high client adoption rates in corporate pilots, indicating a growth tailwind. [1]"
            ]
          }
        ],
        references: [
          "Gartner Corporate IT Spending Survey - Oct 2025"
        ]
      },
      short: {
        sections: [
          {
            title: "Executive Summary",
            paragraphs: [
              "Microsoft Corp. (MSFT) is Bullish as valuations compress to attractive levels and Azure AI corporate adoption continues to ramp."
            ]
          }
        ],
        references: []
      }
    },
    GOOGL: {
      ticker: 'GOOGL',
      name: 'Alphabet Inc.',
      forecast: 'Bullish',
      date: 'October 20 - October 24, 2025',
      full: {
        sections: [
          {
            title: "1. Executive Summary",
            paragraphs: [
              "Alphabet is Bullish. Valuation remains extremely cheap. A technical breakout from its consolidation channel suggests a target of $180, supported by accelerating cloud margins and YouTube advertising volumes. [1]"
            ]
          }
        ],
        references: [
          "Zacks.com GOOGL Channel Breakout - Oct 17, 2025"
        ]
      },
      short: {
        sections: [
          {
            title: "Executive Summary",
            paragraphs: [
              "Alphabet Inc. (GOOGL) is Bullish. The stock broke out of consolidation, targeting $180 on cheap valuation and strong YouTube margins."
            ]
          }
        ],
        references: []
      }
    },
    NVDA: {
      ticker: 'NVDA',
      name: 'NVIDIA Corp.',
      forecast: 'Bullish',
      date: 'October 20 - October 24, 2025',
      full: {
        sections: [
          {
            title: "1. Executive Summary",
            paragraphs: [
              "NVIDIA is Bullish. Support at $128 held firmly during last week's correction. Analysts at major firms have re-affirmed positive projections after supply chain checks confirmed Blackwell packaging issues are resolved. [1]"
            ]
          }
        ],
        references: [
          "Citi Equity Research - Semiconductor Check, Oct 19, 2025"
        ]
      },
      short: {
        sections: [
          {
            title: "Executive Summary",
            paragraphs: [
              "NVIDIA (NVDA) is Bullish. Support at $128 held, and analysts have re-affirmed positive outlooks following resolved chip-packaging checks."
            ]
          }
        ],
        references: []
      }
    },
    AMZN: {
      ticker: 'AMZN',
      name: 'Amazon.com Inc.',
      forecast: 'Bullish',
      date: 'October 20 - October 24, 2025',
      full: {
        sections: [
          {
            title: "1. Executive Summary",
            paragraphs: [
              "Amazon is Bullish. The stock broke through the stubborn $185 resistance. Forward revenue growth estimates have been upgraded due to AWS contract wins in the public sector. [1]"
            ]
          }
        ],
        references: [
          "AWS Public Sector Blog - Government Cloud Wins, Oct 2025"
        ]
      },
      short: {
        sections: [
          {
            title: "Executive Summary",
            paragraphs: [
              "Amazon.com Inc. (AMZN) is Bullish. Technical resistance at $185 has broken, supported by major public-sector cloud contract wins."
            ]
          }
        ],
        references: []
      }
    }
  }
};

// Onboarding Survey Configuration
const SURVEY_QUESTIONS = [
  {
    id: 'background_sop',
    title: "1. Background & Experience",
    questions: [
      {
        id: 'experience',
        text: "What is your investing experience level?",
        type: 'select',
        options: ["Novice (less than 1 year)", "Intermediate (1-5 years)", "Sophisticated (5+ years)"]
      },
      {
        id: 'trading_frequency',
        text: "How often do you trade real assets in a typical month?",
        type: 'select',
        options: ["Rarely/Never", "1-5 times", "6-20 times", "20+ times (Active trader)"]
      },
      {
        id: 'compounding_lit',
        text: "Suppose you had $100 in a savings account and the interest rate was 2% per year. After 5 years, how much do you think you would have in the account if you left the money to grow?",
        type: 'select',
        options: ["More than $102", "Exactly $102", "Less than $102", "Do not know"]
      }
    ]
  },
  {
    id: 'ai_profile',
    title: "2. AI Experience & Attitude (The H2 Core)",
    subtitle: "Please answer these questions about your chatbot usage.",
    questions: [
      {
        id: 'ai_use_frequency',
        text: "In a typical week, on how many days do you use an AI chatbot? (Predictor E2)",
        type: 'select',
        options: ["0 days", "1-2 days", "3-4 days", "5 or more days"]
      },
      {
        id: 'ai_trust',
        text: "In general, how much do you trust what AI chatbots tell you? (Control E4)",
        type: 'select',
        options: ["1 - Not at all", "2", "3", "4", "5 - Completely"]
      }
    ]
  }
];

// Mock Leaderboard Data
const LEADERBOARD_BASE = [
  { name: "AlphaTrader_99", tier: "Platinum", return: 14.8, sharpe: 2.1, isUser: false },
  { name: "QuantWiz", tier: "Platinum", return: 12.3, sharpe: 1.95, isUser: false },
  { name: "GeminiHype", tier: "Gold", return: 9.7, sharpe: 1.62, isUser: false },
  { name: "BullRider", tier: "Gold", return: 8.5, sharpe: 1.48, isUser: false },
  { name: "PassiveBull", tier: "Gold", return: 7.2, sharpe: 1.35, isUser: false },
  { name: "Sharpie", tier: "Silver", return: 5.1, sharpe: 1.10, isUser: false },
  { name: "HedgeMeNot", tier: "Silver", return: 4.8, sharpe: 1.05, isUser: false },
  { name: "BuyAndHold_1", tier: "Silver", return: 3.9, sharpe: 0.92, isUser: false },
  { name: "LossAverse", tier: "Bronze", return: 1.2, sharpe: 0.35, isUser: false },
  { name: "DipBuyer", tier: "Bronze", return: -2.3, sharpe: -0.42, isUser: false },
  { name: "ShortSqueeze", tier: "Bronze", return: -5.8, sharpe: -1.15, isUser: false }
];

// Helper to log events
function logEvent(type, data) {
  const log = {
    timestamp: new Date().toLocaleTimeString(),
    week: state.currentWeek,
    type,
    factors: { ...state.factors },
    data
  };
  state.logs.unshift(log);
  updateLogDisplay();
}

function updateLogDisplay() {
  const consoleEl = document.getElementById('log-console');
  if (!consoleEl) return;
  consoleEl.innerHTML = state.logs.map(log => `
    <div class="log-entry">
      <span class="log-time">[${log.timestamp}]</span>
      <span class="log-type">${log.type}</span>
      <span class="log-data">${JSON.stringify(log.data)}</span>
    </div>
  `).join('');
}

// Render Onboarding Survey
let currentSurveyStepIdx = 0;
const surveyAnswers = {};

function initSurveyModal() {
  const modal = document.getElementById('survey-modal-overlay');
  if (!modal) return;
  modal.classList.add('active');
  currentSurveyStepIdx = 0;
  renderSurveyStep();
}

function renderSurveyStep() {
  const stepContainer = document.getElementById('survey-steps-container');
  const nextBtn = document.getElementById('btn-survey-next');
  const prevBtn = document.getElementById('btn-survey-prev');
  const progressTitle = document.getElementById('survey-progress-title');
  
  if (!stepContainer) return;
  stepContainer.innerHTML = '';
  
  const step = SURVEY_QUESTIONS[currentSurveyStepIdx];
  if (progressTitle) progressTitle.textContent = step.title;
  
  // Set subtitle if any
  const subtitleEl = document.createElement('div');
  subtitleEl.className = 'survey-subtitle';
  subtitleEl.style.marginBottom = '20px';
  subtitleEl.textContent = step.subtitle || '';
  stepContainer.appendChild(subtitleEl);
  
  step.questions.forEach(q => {
    const qDiv = document.createElement('div');
    qDiv.className = 'survey-question';
    
    const textDiv = document.createElement('div');
    textDiv.className = 'survey-question-text';
    textDiv.textContent = q.text;
    qDiv.appendChild(textDiv);
    
    if (q.type === 'select') {
      const optDiv = document.createElement('div');
      optDiv.className = 'survey-options';
      
      q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'survey-option-btn';
        if (surveyAnswers[q.id] === opt) btn.classList.add('selected');
        btn.textContent = opt;
        btn.onclick = () => {
          surveyAnswers[q.id] = opt;
          const siblings = optDiv.querySelectorAll('.survey-option-btn');
          siblings.forEach(s => s.classList.remove('selected'));
          btn.classList.add('selected');
        };
        optDiv.appendChild(btn);
      });
      qDiv.appendChild(optDiv);
    } else if (q.type === 'slider') {
      const sliderContainer = document.createElement('div');
      sliderContainer.className = 'survey-slider-container';
      
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'survey-slider';
      slider.min = q.min;
      slider.max = q.max;
      slider.value = surveyAnswers[q.id] || q.default;
      surveyAnswers[q.id] = slider.value;
      
      const valSpan = document.createElement('span');
      valSpan.className = 'survey-slider-val';
      valSpan.textContent = slider.value;
      
      slider.oninput = () => {
        valSpan.textContent = slider.value;
        surveyAnswers[q.id] = parseInt(slider.value);
      };
      
      sliderContainer.appendChild(slider);
      sliderContainer.appendChild(valSpan);
      qDiv.appendChild(sliderContainer);
    }
    
    stepContainer.appendChild(qDiv);
  });
  
  // Update Buttons
  prevBtn.style.display = currentSurveyStepIdx === 0 ? 'none' : 'block';
  nextBtn.textContent = currentSurveyStepIdx === SURVEY_QUESTIONS.length - 1 ? 'Finish Registration' : 'Next';
}

function handleSurveyNext() {
  // Validate that all questions in the current step are answered
  const step = SURVEY_QUESTIONS[currentSurveyStepIdx];
  const missing = step.questions.some(q => surveyAnswers[q.id] === undefined || surveyAnswers[q.id] === null || surveyAnswers[q.id] === "");
  if (missing) {
    alert("Please answer all questions before proceeding.");
    return;
  }
  
  if (currentSurveyStepIdx < SURVEY_QUESTIONS.length - 1) {
    currentSurveyStepIdx++;
    renderSurveyStep();
  } else {
    // Finish
    state.user.survey = { ...surveyAnswers };
    logEvent("SURVEY_COMPLETED", state.user.survey);
    
    // Set Week 1 active status on onboarding completion
    state.activeWeeksTracker[1] = true;
    
    // Check for "Halo Effect" condition to log warning or analysis
    // H2 says greater overall experience with consumer AI (frequency) predicts higher reliance, net of stated trust.
    const useFrequency = state.user.survey['ai_use_frequency'];
    const statedTrust = state.user.survey['ai_trust'];
    
    const isHighExp = useFrequency === "3-4 days" || useFrequency === "5 or more days";
    const transferRisk = isHighExp ? "HIGH (Frequent chatbot experience may inflate predictive reliance net of stated trust)" : "LOW/MODERATE";
    
    logEvent("HALO_EFFECT_DIAGNOSIS", {
      useFrequency,
      statedTrust,
      transferRisk
    });
    
    document.getElementById('survey-modal-overlay').classList.remove('active');
    updateDashboard();
  }
}

function handleSurveyPrev() {
  if (currentSurveyStepIdx > 0) {
    currentSurveyStepIdx--;
    renderSurveyStep();
  }
}

function skipSurvey() {
  state.user.survey = {
    investing_experience: "1-2 years",
    trading_frequency: "Monthly",
    financial_literacy_compounding: "More than $110",
    ai_use_frequency: "3-4 days",
    ai_trust: "Agree"
  };
  logEvent("SURVEY_SKIPPED", { message: "User bypassed onboarding survey in demo mode." });
  logEvent("SURVEY_COMPLETED", state.user.survey);
  
  // Set Week 1 active status on onboarding completion
  state.activeWeeksTracker[1] = true;
  
  logEvent("HALO_EFFECT_DIAGNOSIS", {
    useFrequency: "3-4 days",
    statedTrust: "Agree",
    transferRisk: "HIGH (Frequent chatbot experience may inflate predictive reliance net of stated trust)"
  });
  
  document.getElementById('survey-modal-overlay').classList.remove('active');
  updateDashboard();
}

// Portfolio and Trading Mechanics
// ---------------------------------------------------------------------------
// Deferred market-close execution (Platform Design Part IV, Proposal §3.3)
// A Buy/Sell click SUBMITS an order that stays PENDING until the next market
// close. Orders are withdrawable and resubmittable until the cutoff; only the
// NET TERMINAL STATE per ticker executes. The full submit/withdraw/resubmit
// stream is logged to a behavioral-history ledger; concordance is computed only
// at execution, on the manual stock-level trade that actually fills.
// ---------------------------------------------------------------------------
function submitOrder(type) {
  const ticker = state.selectedStock;
  if (state.delistedStocks.includes(ticker)) {
    alert("Trading is suspended for this delisted stock.");
    return;
  }

  const amountEl = document.getElementById('trade-amount');
  if (!amountEl) return;
  const amount = parseFloat(amountEl.value);

  if (isNaN(amount) || amount <= 0) {
    alert("Please enter a valid dollar amount.");
    return;
  }

  // Submission-time sanity checks (final fill is re-validated at the cutoff).
  if (type === 'BUY') {
    const pendingBuys = Object.values(state.pendingOrders)
      .filter(o => o.type === 'BUY' && o.ticker !== ticker)
      .reduce((s, o) => s + o.amount, 0);
    if (amount + pendingBuys > state.user.cash + 0.01) {
      alert("Insufficient cash: this order plus other pending buys exceeds your available cash.");
      return;
    }
  } else { // SELL
    if ((state.user.holdings[ticker] || 0) <= 0) {
      alert("You do not currently hold this stock, so there is nothing to sell at close.");
      return;
    }
  }

  // Track active week participation (submitting an order is genuine engagement).
  state.activeWeeksTracker[state.currentWeek] = true;

  const existing = state.pendingOrders[ticker];
  const isResubmit = !!existing;
  state.pendingOrders[ticker] = {
    ticker,
    type,
    amount,
    submittedAt: Date.now(),
    reportWeek: state.currentWeek,
    resubmits: existing ? (existing.resubmits || 0) + 1 : 0,
  };

  // Behavioral-history ledger — the submit/withdraw/resubmit stream.
  logEvent(isResubmit ? "ORDER_RESUBMITTED" : "ORDER_SUBMITTED", {
    ledger: "behavioral-history",
    ticker,
    type,
    amount,
    replacedPrior: isResubmit ? { type: existing.type, amount: existing.amount } : null,
    aiCall: AI_FORECASTS[state.currentWeek][ticker],
    note: "Pending — executes at next market close; withdrawable until cutoff.",
  });

  amountEl.value = '';
  renderPendingOrders();
}

function withdrawOrder(ticker) {
  const order = state.pendingOrders[ticker];
  if (!order) return;
  delete state.pendingOrders[ticker];
  logEvent("ORDER_WITHDRAWN", {
    ledger: "behavioral-history",
    ticker,
    type: order.type,
    amount: order.amount,
    note: "Restraint expressed by withdrawing before cutoff — no fill, no concordance.",
  });
  renderPendingOrders();
}

// Execute the net terminal state of every pending order at the given week's
// close. Called explicitly ("Run Market Close") and again at each week advance.
function executePendingOrders(execWeek) {
  const tickers = Object.keys(state.pendingOrders);
  if (tickers.length === 0) return 0;

  const prices = STOCK_PRICES[execWeek];
  let filled = 0;

  tickers.forEach(ticker => {
    const order = state.pendingOrders[ticker];
    if (state.delistedStocks.includes(ticker) || !prices[ticker]) {
      delete state.pendingOrders[ticker];
      return;
    }
    const price = prices[ticker];
    const { type, amount, submittedAt } = order;

    if (type === 'BUY') {
      if (state.user.cash + 0.01 < amount) { // insufficient at cutoff — cancel
        logEvent("ORDER_CANCELLED_AT_CUTOFF", { ledger: "behavioral-history", ticker, type, amount, reason: "Insufficient cash at close." });
        delete state.pendingOrders[ticker];
        return;
      }
      const shares = amount / price;
      state.user.cash -= amount;
      state.user.holdings[ticker] = (state.user.holdings[ticker] || 0) + shares;
      recordFill(ticker, type, amount, shares, price, execWeek, submittedAt);
    } else { // SELL
      const currentShares = state.user.holdings[ticker] || 0;
      if (currentShares <= 0) { delete state.pendingOrders[ticker]; return; }
      const currentVal = currentShares * price;
      const sellAmount = Math.min(amount, currentVal);
      const sellShares = sellAmount / price;
      state.user.cash += sellAmount;
      state.user.holdings[ticker] = currentShares - sellShares;
      if (state.user.holdings[ticker] < 0.0001) delete state.user.holdings[ticker];
      recordFill(ticker, type, sellAmount, sellShares, price, execWeek, submittedAt);
    }
    delete state.pendingOrders[ticker];
    filled++;
  });

  renderPendingOrders();
  updateDashboard();
  return filled;
}

function recordFill(ticker, type, amount, shares, price, execWeek, submittedAt) {
  // Primary DV: is the executed manual trade concordant with the AI call?
  const call = AI_FORECASTS[execWeek][ticker];
  let concordant = 0;
  if (call === 'Bullish' && type === 'BUY') concordant = 1;
  if (call === 'Bearish' && type === 'SELL') concordant = 1;

  state.user.transactions.push({ week: execWeek, ticker, type, amount, shares, price, method: 'manual' });

  logEvent("TRADE_EXECUTED", {
    ledger: "concordance",
    type,
    ticker,
    amount: +amount.toFixed(2),
    shares: shares.toFixed(4),
    price,
    aiCall: call,
    concordant,
    executionMethod: "manual",
    netTerminalState: true,
    reportWeek: execWeek,
    pendingDurationSec: submittedAt ? +((Date.now() - submittedAt) / 1000).toFixed(1) : 0,
  });
}

// "Run Market Close" — the cutoff passes; net terminal orders fill at close.
function runMarketClose() {
  const n = executePendingOrders(state.currentWeek);
  if (n === 0) {
    alert("No pending orders to execute at market close.");
    return;
  }
  logEvent("MARKET_CLOSE_EXECUTION", {
    week: state.currentWeek,
    ordersFilled: n,
    note: "Deferred orders executed at market-close price (net terminal state).",
  });
}

function renderOrdersTab() {
  const container = document.getElementById('orders-accordion-container');
  if (!container) return;

  const WEEK_DATES = {
    1: "Sunday, Oct 5, 2025",
    2: "Sunday, Oct 12, 2025",
    3: "Sunday, Oct 19, 2025",
    4: "Sunday, Oct 26, 2025",
    5: "Sunday, Nov 2, 2025",
    6: "Sunday, Nov 9, 2025",
    7: "Sunday, Nov 16, 2025",
    8: "Sunday, Nov 23, 2025"
  };

  let html = '';
  for (let w = state.currentWeek; w >= 1; w--) {
    const isCurrentWeek = (w === state.currentWeek);
    const dateStr = WEEK_DATES[w] || `Week ${w}`;
    
    // Gather orders for week `w`
    const pendingList = isCurrentWeek ? Object.values(state.pendingOrders) : [];
    const txList = state.user.transactions.filter(tx => tx.week === w);
    
    const totalCount = pendingList.length + txList.length;
    let summaryText = '';
    if (totalCount === 0) {
      summaryText = 'No orders';
    } else {
      const parts = [];
      if (pendingList.length > 0) parts.push(`${pendingList.length} Pending`);
      if (txList.length > 0) parts.push(`${txList.length} Filled`);
      summaryText = parts.join(', ');
    }
    
    let contentHtml = '';
    if (totalCount === 0) {
      contentHtml = `<div class="order-empty-state">No orders recorded for this week.</div>`;
    } else {
      contentHtml = `
        <table class="orders-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Name</th>
              <th>Side</th>
              <th>Amount</th>
              <th>Shares</th>
              <th>Execution Price</th>
              <th>Status / Action</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      // Render pending first
      const prices = STOCK_PRICES[state.currentWeek];
      pendingList.forEach(o => {
        const estShares = prices[o.ticker] ? o.amount / prices[o.ticker] : 0;
        
        contentHtml += `
          <tr>
            <td style="font-weight: 600;">${o.ticker}</td>
            <td>${STOCKS[o.ticker]?.name || o.ticker}</td>
            <td><span class="order-badge ${o.type.toLowerCase()}">${o.type}</span></td>
            <td style="font-family: var(--font-mono);">$${o.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td style="font-family: var(--font-mono); color: var(--text-dim);">${estShares > 0 ? `~${estShares.toFixed(4)}` : '--'}</td>
            <td style="color: var(--text-dim); font-style: italic;">At Close</td>
            <td>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="order-status pending">Pending</span>
                <button class="btn-withdraw" onclick="withdrawOrder('${o.ticker}')">Withdraw</button>
              </div>
            </td>
          </tr>
        `;
      });
      
      // Render historical transactions
      txList.forEach(tx => {
        let sideClass = tx.type.toLowerCase();
        let sideText = tx.type;
        if (tx.type === 'LIQUIDATE_FORCED') {
          sideClass = 'liquidate_forced';
          sideText = 'LIQUIDATE';
        }
        
        const isLiquidated = (tx.type === 'LIQUIDATE_FORCED');
        const statusText = isLiquidated ? 'Liquidated' : 'Filled';
        const statusClass = isLiquidated ? 'liquidated' : 'filled';

        contentHtml += `
          <tr>
            <td style="font-weight: 600;">${tx.ticker}</td>
            <td>${STOCKS[tx.ticker]?.name || tx.ticker}</td>
            <td><span class="order-badge ${sideClass}">${sideText}</span></td>
            <td style="font-family: var(--font-mono);">$${tx.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td style="font-family: var(--font-mono);">${tx.shares.toFixed(4)}</td>
            <td style="font-family: var(--font-mono);">$${tx.price.toFixed(2)}</td>
            <td>
              <span class="order-status ${statusClass}">${statusText}</span>
            </td>
          </tr>
        `;
      });
      
      contentHtml += `
          </tbody>
        </table>
      `;
    }

    let isExpanded = isCurrentWeek;
    const existingGroup = document.getElementById(`orders-week-group-${w}`);
    if (existingGroup) {
      isExpanded = existingGroup.classList.contains('expanded');
    }
    
    html += `
      <div class="orders-week-group ${isExpanded ? 'expanded' : ''}" id="orders-week-group-${w}">
        <div class="orders-week-header" onclick="toggleOrdersWeek(${w})">
          <div class="orders-week-title-area">
            <span class="orders-week-title">Week ${w}</span>
            <span class="orders-week-date">(${dateStr})</span>
          </div>
          <div class="orders-week-summary">
            <span>${summaryText}</span>
            <svg class="orders-week-chevron" style="width:16px;height:16px" viewBox="0 0 24 24">
              <path fill="currentColor" d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
            </svg>
          </div>
        </div>
        <div class="orders-week-content">
          ${contentHtml}
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

window.toggleOrdersWeek = function(weekNum) {
  const el = document.getElementById(`orders-week-group-${weekNum}`);
  if (el) {
    el.classList.toggle('expanded');
    logEvent("ORDERS_WEEK_TOGGLED", { weekNum, expanded: el.classList.contains('expanded') });
  }
};

function renderPendingOrders() {
  renderOrdersTab();
  
  const runBtn = document.getElementById('btn-market-close-el');
  if (runBtn) {
    const tickers = Object.keys(state.pendingOrders);
    runBtn.style.display = tickers.length ? 'flex' : 'none';
  }
}

// One-click Rebalance (Delegation DV, H4)
function executeRebalance() {
  const confirmation = confirm("Are you sure you want to rebalance your entire portfolio to match the AI Deep Research recommendations (Value-Weighted)? This will liquidate non-recommended names and split your capital among bullish recommendations.");
  if (!confirmation) return;
  
  // Track active week participation
  state.activeWeeksTracker[state.currentWeek] = true;
  
  const prices = STOCK_PRICES[state.currentWeek];
  const forecasts = AI_FORECASTS[state.currentWeek];
  
  // Get all bullish tickers, excluding delisted ones
  const bullishTickers = Object.keys(forecasts).filter(ticker => forecasts[ticker] === 'Bullish' && !state.delistedStocks.includes(ticker));
  if (bullishTickers.length === 0) {
    alert("No bullish calls available for rebalancing this week.");
    return;
  }
  
  // Calculate total portfolio value
  let totalPortfolioValue = state.user.cash;
  Object.keys(state.user.holdings).forEach(t => {
    totalPortfolioValue += state.user.holdings[t] * prices[t];
  });
  
  // Liquidate all holdings
  const oldHoldings = { ...state.user.holdings };
  Object.keys(oldHoldings).forEach(t => {
    const qty = oldHoldings[t];
    const price = prices[t];
    const val = qty * price;
    state.user.transactions.push({
      week: state.currentWeek,
      ticker: t,
      type: 'SELL',
      amount: val,
      shares: qty,
      price: price,
      method: 'rebalance'
    });
  });
  
  state.user.holdings = {};
  state.user.cash = totalPortfolioValue;
  
  // Allocate equally or value-weighted (for simplicity we do equal split of total value among bullish calls)
  const allocAmount = totalPortfolioValue / bullishTickers.length;
  bullishTickers.forEach(t => {
    const price = prices[t];
    const shares = allocAmount / price;
    state.user.holdings[t] = shares;
    state.user.transactions.push({
      week: state.currentWeek,
      ticker: t,
      type: 'BUY',
      amount: allocAmount,
      shares: shares,
      price: price,
      method: 'rebalance'
    });
  });
  
  state.user.cash = 0; // Fully invested
  
  logEvent("DELEGATION_EVENT", {
    action: "portfolio_rebalance",
    defaultWeighting: "value-weighted",
    oldHoldings,
    newHoldings: { ...state.user.holdings },
    allocatedValue: totalPortfolioValue
  });
  
  updateDashboard();
}

// Advance Week
function advanceWeek() {
  if (state.currentWeek >= 8) {
    freezeLeaderboardAndShowCertificate();
    return;
  }
  
  const prevWeek = state.currentWeek;

  // Market-close cutoff: any still-pending orders fill at the closing week's
  // price (net terminal state) before the new week's prices are applied.
  const filledAtClose = executePendingOrders(prevWeek);
  if (filledAtClose > 0) {
    logEvent("MARKET_CLOSE_EXECUTION", {
      week: prevWeek,
      ordersFilled: filledAtClose,
      note: "Pending orders auto-executed at the week's market close before rollover.",
    });
  }

  state.currentWeek++;

  // Initialize participation status for the new week
  state.activeWeeksTracker[state.currentWeek] = false;
  
  // Close corporate action banner if not week 4
  const banner = document.getElementById('corporate-action-banner');
  if (banner && state.currentWeek !== 4) {
    banner.style.display = 'none';
  }
  
  // Week 4 Corporate Action Delisting for NVDA
  if (state.currentWeek === 4) {
    state.delistedStocks.push('NVDA');
    const nvdaShares = state.user.holdings['NVDA'] || 0;
    if (nvdaShares > 0) {
      const nvdaVal = nvdaShares * STOCK_PRICES[3]['NVDA'];
      state.user.cash += nvdaVal;
      delete state.user.holdings['NVDA'];
      
      state.user.transactions.push({
        week: 4,
        ticker: 'NVDA',
        type: 'LIQUIDATE_FORCED',
        amount: nvdaVal,
        shares: nvdaShares,
        price: STOCK_PRICES[3]['NVDA'],
        method: 'forced_liquidation'
      });
      
      logEvent("CORPORATE_ACTION_FORCED_EXIT", {
        ticker: 'NVDA',
        sharesLiquidated: nvdaShares.toFixed(4),
        liquidationPrice: STOCK_PRICES[3]['NVDA'],
        cashCredited: nvdaVal.toFixed(2),
        reason: "Forced corporate action delisting"
      });
      
      const text = document.getElementById('corporate-action-text');
      if (banner && text) {
        text.textContent = `Corporate Action Alert: NVIDIA Corp. (NVDA) delisted. Your holdings of ${nvdaShares.toFixed(2)} shares liquidated for $${nvdaVal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}.`;
        banner.style.display = 'block';
      }
    } else {
      logEvent("CORPORATE_ACTION_FORCED_EXIT", {
        ticker: 'NVDA',
        sharesLiquidated: 0,
        reason: "Forced corporate action delisting"
      });
      const text = document.getElementById('corporate-action-text');
      if (banner && text) {
        text.textContent = `Corporate Action Alert: NVIDIA Corp. (NVDA) delisted due to merger. Forecasts and trading halted.`;
        banner.style.display = 'block';
      }
    }
    
    // Fallback active stock selection if it was NVDA
    if (state.selectedStock === 'NVDA') {
      state.selectedStock = 'AAPL';
      document.getElementById('trade-ticker-disabled').value = 'AAPL';
      document.getElementById('chat-ticker-scope').textContent = 'AAPL';
    }
  }
  
  // Calculate P&L from prices shifts
  const oldPrices = STOCK_PRICES[prevWeek];
  const newPrices = STOCK_PRICES[state.currentWeek];
  
  let prevVal = state.user.cash;
  Object.keys(state.user.holdings).forEach(t => {
    prevVal += (state.user.holdings[t] || 0) * oldPrices[t];
  });
  
  // Accrue risk free rate (say 0.08% weekly interest on cash)
  state.user.cash *= 1.0008;
  
  let newVal = state.user.cash;
  Object.keys(state.user.holdings).forEach(t => {
    newVal += (state.user.holdings[t] || 0) * newPrices[t];
  });
  
  const weeklyReturn = ((newVal - prevVal) / prevVal) * 100;
  
  logEvent("WEEK_TRANSITION", {
    fromWeek: prevWeek,
    toWeek: state.currentWeek,
    portfolioValueBefore: prevVal.toFixed(2),
    portfolioValueAfter: newVal.toFixed(2),
    realizedReturn: weeklyReturn.toFixed(2) + "%"
  });
  
  // If in transparency arm, we also calculate in-study accuracy log
  if (state.factors.transparency === 'transparency') {
    const stats = getAccuracyStats(state.currentWeek - 1);
    logEvent("ACCURACY_UPDATE", {
      week: prevWeek,
      hitRate: stats.rate,
      indexBenchmarkComparison: `AI portfolio return: ${stats.aiRet} | Nasdaq 100 Index: ${stats.indexRet}`
    });
  }
  
  // Force reset Dwell Gate status for the new report
  state.headerDwellCertified = false;
  state.headerDwellTime = 0;
  
  updateDashboard();
  renderActiveReport();
  updateLeaderboard();
  renderEmailContent();
  drawCharts();
}

function freezeLeaderboardAndShowCertificate() {
  logEvent("STUDY_FREEZE", { message: "8-Week study period complete. Leaderboard frozen." });
  
  // Calculate total active weeks
  const activeWeeksCount = Object.keys(state.activeWeeksTracker).filter(w => state.activeWeeksTracker[w] === true).length;
  const qualified = activeWeeksCount >= 6;
  
  // Generate random Stevens participant code
  document.getElementById('cert-participant-name').textContent = state.user.survey ? "STEVENS LAB ID #" + Math.floor(100000 + Math.random() * 900000) : "STEVENS PARTICIPANT";
  document.getElementById('cert-active-weeks').textContent = `${activeWeeksCount} of 8 Weeks`;
  
  const statusVal = document.querySelector('.cert-status-qualified');
  if (statusVal) {
    if (qualified) {
      statusVal.textContent = "QUALIFIED FOR LOTTERY";
      statusVal.className = "cert-detail-val cert-status-qualified";
      statusVal.style.color = "#059669";
    } else {
      statusVal.textContent = "NOT ELIGIBLE (Active < 6 weeks)";
      statusVal.className = "cert-detail-val cert-status-disqualified";
      statusVal.style.color = "#dc2626";
    }
  }
  
  // Show certificate overlay
  const overlay = document.getElementById('certificate-modal-overlay');
  if (overlay) overlay.classList.add('active');
  
  if (qualified) {
    triggerConfetti();
  }
}

function triggerConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
  
  const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];
  const particles = [];
  
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * canvas.height,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.02,
      tiltAngle: 0
    });
  }
  
  let animationId;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let finished = true;
    particles.forEach(p => {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
      p.x += Math.sin(p.tiltAngle);
      p.tilt = Math.sin(p.tiltAngle - (p.r / 3)) * 15;
      
      if (p.y < canvas.height) finished = false;
      
      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      ctx.stroke();
    });
    
    if (!finished) {
      animationId = requestAnimationFrame(draw);
    }
  }
  
  draw();
  
  // Clean up animation on close
  document.getElementById('btn-cert-close').onclick = () => {
    cancelAnimationFrame(animationId);
    overlay.classList.remove('active');
  };
}

// Reset Platform State
function resetPlatform() {
  state.currentWeek = 1;
  state.selectedStock = 'AAPL';
  state.holdingsSortKey = 'Symbol';
  state.holdingsSortDir = 'asc';
  state.user = {
    cash: 1000000,
    holdings: {},
    transactions: [],
    survey: null,
  };
  state.chatbotCredits = 10.00;
  state.chatbotHistory = {};
  state.activeChatThreadId = {};
  state.pendingOrders = {};
  state.logs = [];
  state.headerDwellCertified = false;
  state.headerDwellTime = 0;
  state.delistedStocks = [];
  state.activeWeeksTracker = { 1: true };
  
  // Close any overlays/banners
  const certOverlay = document.getElementById('certificate-modal-overlay');
  if (certOverlay) certOverlay.classList.remove('active');
  const banner = document.getElementById('corporate-action-banner');
  if (banner) banner.style.display = 'none';
  
  logEvent("SYSTEM_RESET", { message: "Platform state returned to default." });

  initSurveyModal();
}

// Render Current Report
function selectStock(ticker) {
  state.selectedStock = ticker;
  logEvent("STOCK_SELECTED", { ticker, name: STOCKS[ticker].name });
  
  // Reset dwell timers for new stock report
  state.headerDwellCertified = false;
  state.headerDwellTime = 0;
  
  // Highlight active row in stock list
  document.querySelectorAll('.stock-row').forEach(row => {
    row.classList.remove('active');
    if (row.dataset.ticker === ticker) row.classList.add('active');
  });
  
  renderActiveReport();
  updateChatHistory();
}

function getAccuracyStats(week) {
  const stats = {
    1: {
      rate: "No mature calls yet",
      indexRet: "-",
      aiRet: "-",
      prior: { calls: 348, accuracy: "0.54", precision: "0.55" },
      single: { calls: 0, accuracy: "-", precision: "-", indexRet: "-" },
      cumulative: { calls: 0, accuracy: "-", precision: "-", indexRet: "-" }
    },
    2: {
      rate: "100.0% (5/5 Correct)",
      indexRet: "+1.01%",
      aiRet: "+2.30%",
      prior: { calls: 348, accuracy: "0.54", precision: "0.55" },
      single: { calls: 5, accuracy: "1.00", precision: "1.00", indexRet: "+1.01%" },
      cumulative: { calls: 5, accuracy: "1.00", precision: "1.00", indexRet: "+1.01%" }
    },
    3: {
      rate: "88.8% (8/9 cumulative)",
      indexRet: "+1.66%",
      aiRet: "+1.10%",
      prior: { calls: 348, accuracy: "0.54", precision: "0.55" },
      single: { calls: 4, accuracy: "0.75", precision: "0.50", indexRet: "+0.65%" },
      cumulative: { calls: 9, accuracy: "0.89", precision: "0.80", indexRet: "+1.66%" }
    },
    4: {
      rate: "64.3% (9/14 cumulative)",
      indexRet: "+2.16%",
      aiRet: "+0.85%",
      prior: { calls: 348, accuracy: "0.54", precision: "0.55" },
      single: { calls: 5, accuracy: "0.20", precision: "0.25", indexRet: "+0.50%" },
      cumulative: { calls: 14, accuracy: "0.64", precision: "0.56", indexRet: "+2.16%" }
    },
    5: {
      rate: "61.1% (11/18 cumulative)",
      indexRet: "+2.67%",
      aiRet: "+0.25%",
      prior: { calls: 348, accuracy: "0.54", precision: "0.55" },
      single: { calls: 4, accuracy: "0.50", precision: "0.50", indexRet: "+0.51%" },
      cumulative: { calls: 18, accuracy: "0.61", precision: "0.55", indexRet: "+2.67%" }
    },
    6: {
      rate: "63.6% (14/22 cumulative)",
      indexRet: "+3.17%",
      aiRet: "-0.40%",
      prior: { calls: 348, accuracy: "0.54", precision: "0.55" },
      single: { calls: 4, accuracy: "0.75", precision: "0.67", indexRet: "+0.50%" },
      cumulative: { calls: 22, accuracy: "0.64", precision: "0.57", indexRet: "+3.17%" }
    },
    7: {
      rate: "61.5% (16/26 cumulative)",
      indexRet: "+3.68%",
      aiRet: "-0.95%",
      prior: { calls: 348, accuracy: "0.54", precision: "0.55" },
      single: { calls: 4, accuracy: "0.50", precision: "0.50", indexRet: "+0.51%" },
      cumulative: { calls: 26, accuracy: "0.62", precision: "0.56", indexRet: "+3.68%" }
    },
    8: {
      rate: "60.0% (18/30 cumulative)",
      indexRet: "+4.19%",
      aiRet: "-1.20%",
      prior: { calls: 348, accuracy: "0.54", precision: "0.55" },
      single: { calls: 4, accuracy: "0.50", precision: "0.50", indexRet: "+0.51%" },
      cumulative: { calls: 30, accuracy: "0.60", precision: "0.56", indexRet: "+4.19%" }
    }
  };
  return stats[week] || stats[8];
}

function renderActiveReport() {
  const container = document.getElementById('report-container');
  if (!container) return;

  const ticker = state.selectedStock;
  
  if (state.delistedStocks.includes(ticker)) {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center; color: var(--text-muted);">
        <svg style="width:48px;height:48px;color:var(--bearish);margin-bottom:15px;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        <h3>Stock Forecast Suspended</h3>
        <p>NVIDIA Corp. (NVDA) was delisted in Week 4 due to a completed corporate acquisition. Under the study guidelines, all forecasts and trading are permanently suspended for this constituent.</p>
      </div>
    `;
    return;
  }
  
  // Dynamic Report Compiler for Weeks 4–8 to avoid code bloat
  if (state.currentWeek >= 4 && (!REPORTS_DB[state.currentWeek] || !REPORTS_DB[state.currentWeek][ticker])) {
    if (!REPORTS_DB[state.currentWeek]) REPORTS_DB[state.currentWeek] = {};
    
    const forecast = AI_FORECASTS[state.currentWeek][ticker];
    const dates = {
      4: 'October 13 - October 17, 2025',
      5: 'October 20 - October 24, 2025',
      6: 'October 27 - October 31, 2025',
      7: 'November 3 - November 7, 2025',
      8: 'November 10 - November 14, 2025'
    };
    
    REPORTS_DB[state.currentWeek][ticker] = {
      ticker: ticker,
      name: STOCKS[ticker] ? STOCKS[ticker].name : ticker,
      forecast: forecast,
      date: dates[state.currentWeek],
      full: {
        sections: [
          {
            title: "1. Executive Summary & Weekly Forecast",
            paragraphs: [
              `This weekly report evaluates ${STOCKS[ticker].name} (${ticker}) for the forecast period of ${dates[state.currentWeek]}. Our directional model suggests a ${forecast} outlook. This forecast is based on high-resolution text analysis from leading financial analysts and momentum trends in the market. [1]`,
              `While macro factors present notable headwinds, corporate earnings trends indicate resilient pricing power. Options volume indicates elevated interest at key strike prices. [2]`
            ]
          },
          {
            title: "2. Technical Levels & Sourcing",
            paragraphs: [
              `Current technical structures show a consolidating profile for ${ticker}. Relative Strength Index (RSI) is hovering around 55, indicating balanced momentum with no immediate overbought readings. [4]`,
              `Volume analysis indicates steady institutional accumulation over the prior three sessions. Support and resistance levels remain well-defined by prior consolidation zones. [5]`
            ],
            table: [
              { level: "Primary Resistance", price: `$${(STOCK_PRICES[state.currentWeek][ticker] * 1.03).toFixed(2)}`, desc: "Key resistance, top of local channel. [4]" },
              { level: "Primary Support", price: `$${(STOCK_PRICES[state.currentWeek][ticker] * 0.97).toFixed(2)}`, desc: "Local consolidation support zone. [5]" }
            ]
          }
        ],
        references: [
          `Bloomberg Markets - ${ticker} Analyst Review - October 2025`,
          `Securities & Exchange Commission - Form 10-Q Filing - Q3 2025`,
          `Stevens Institute FinTech Research Lab - Predictive Analytics`
        ]
      },
      short: {
        sections: [
          {
            title: "Executive Summary",
            paragraphs: [
              `${ticker} is rated ${forecast} for the week of ${dates[state.currentWeek]}. Supporting cues include positive momentum and institutional accumulation, offset by minor macro headwinds.`
            ]
          },
          {
            title: "Key Levels",
            paragraphs: [
              `Technical support lies at $${(STOCK_PRICES[state.currentWeek][ticker] * 0.97).toFixed(2)} and resistance at $${(STOCK_PRICES[state.currentWeek][ticker] * 1.03).toFixed(2)}.`
            ]
          }
        ]
      }
    };
  }
  
  const report = REPORTS_DB[state.currentWeek][ticker];
  
  if (!report) {
    container.innerHTML = `<div style="padding: 20px; color: var(--text-muted)">Report database not simulated for this ticker under Week ${state.currentWeek}. Choose AAPL, MSFT, or GOOGL.</div>`;
    return;
  }
  
  const format = state.factors.length; // 'full' or 'short'
  const citationsEnabled = state.factors.citations; // true or false
  const transparencyEnabled = state.factors.transparency === 'transparency';
  
  const reportData = report[format];

  let html = '';

  // 0. Forecast Tracker widget (traffic-light history for this ticker)
  html += buildForecastWidgetHTML(ticker, transparencyEnabled);

  // 1. Transparency Skill-Diagnostic Block (Transparency Arm Only)
  if (transparencyEnabled) {
    const stats = getAccuracyStats(state.currentWeek);
    const accuracyTableHTML = `
      <table class="diagnostic-table">
        <thead>
          <tr>
            <th>Horizon</th>
            <th># Bullish/Bearish Calls</th>
            <th>Accuracy</th>
            <th>Precision</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Prior Research Record</td>
            <td>${stats.prior.calls}</td>
            <td>${stats.prior.accuracy}</td>
            <td>${stats.prior.precision}</td>
          </tr>
          <tr>
            <td>Cumulative Live</td>
            <td>${stats.cumulative.calls}</td>
            <td>${stats.cumulative.accuracy}</td>
            <td>${stats.cumulative.precision}</td>
          </tr>
        </tbody>
      </table>
    `;
    
    html += `
      <div class="diagnostic-panel">
        <div class="diagnostic-title">⚠️ SKILL-DIAGNOSTIC DISCLOSURE</div>
        <div class="diagnostic-text">
          In a prior benchmark study, Gemini Deep Research's weekly Bullish/Bearish calls matched each stock's actual price direction only 54% of the time, a level of accuracy that was not statistically distinguishable from a random coin-flip guess.
        </div>
        ${accuracyTableHTML}
      </div>
    `;
  }
  
  // Calculate word count & estimated reading time dynamically
  let wordCount = 0;
  reportData.sections.forEach(sec => {
    wordCount += sec.title.split(/\s+/).filter(Boolean).length;
    sec.paragraphs.forEach(p => {
      wordCount += p.split(/\s+/).filter(Boolean).length;
    });
  });
  const readingTime = Math.ceil(wordCount / 180);

  // 2. Report Header
  html += `
    <div class="report-header">
      <div class="report-ticker-large">${report.ticker}</div>
      <div class="report-subtitle">${report.name} — Weekly Investment Analysis</div>
      <div class="report-meta">
        <span>Forecast Window: ${report.date}</span>
        <span>Model: Deep Research</span>
      </div>
      <div class="report-length-badge-container">
        <span class="report-length-badge">
          <svg style="width:13px;height:13px" viewBox="0 0 24 24"><path fill="currentColor" d="M14,17H7V15H14V17M17,13H7V11H17V13M17,9H7V7H17V9M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z"/></svg>
          ${wordCount} words
        </span>
        <span class="report-length-badge">
          <svg style="width:13px;height:13px" viewBox="0 0 24 24"><path fill="currentColor" d="M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12.5,7H11V13L16.2,16.2L17,14.9L12.5,12.2V7Z"/></svg>
          Est. Reading Time: ${readingTime} min${readingTime > 1 ? 's' : ''}
        </span>
      </div>
    </div>
  `;
  
  // 3. Verdict Banner (Intersection Observer targets the verdict text)
  const isBullish = report.forecast === 'Bullish';
  html += `
    <div class="report-verdict-banner ${report.forecast.toLowerCase()}" id="report-verdict-banner-el">
      <div>
        <div class="verdict-lbl">AI directional recommendation</div>
        <div class="verdict-val ${report.forecast.toLowerCase()}">${report.forecast}</div>
      </div>
      <div class="dwell-gate-status">
        <span class="dwell-dot" id="dwell-dot-indicator"></span>
        <span id="dwell-status-text">Dwell Gate: Unread</span>
      </div>
    </div>
  `;
  
  // 4. Report Body Sections
  html += `<div class="report-body">`;
  reportData.sections.forEach(sec => {
    html += `<h3>${sec.title}</h3>`;
    sec.paragraphs.forEach(p => {
      // Handle citation visibility
      let text = p;
      if (!citationsEnabled) {
        // Strip out brackets like [1] or [12]
        text = p.replace(/\s*\[\d+(,\d+)*\]/g, '');
      } else {
        // Wrap citations with style markers
        text = p.replace(/\[(\d+(,\d+)*)\]/g, '<span class="citation-ref">[$1]</span>');
      }
      html += `<p>${text}</p>`;
    });
    
    if (sec.table) {
      if (Array.isArray(sec.table)) {
        html += `
          <table style="width:100%; border-collapse:collapse; margin: 15px 0; font-size: 0.8rem;">
            <thead>
              <tr style="border-bottom: 2px solid var(--card-border); text-align: left;">
                <th style="padding: 8px;">Technical Level</th>
                <th style="padding: 8px;">Price</th>
                <th style="padding: 8px;">Details</th>
              </tr>
            </thead>
            <tbody>
        `;
        sec.table.forEach(tr => {
          let desc = tr.desc;
          if (!citationsEnabled) {
            desc = tr.desc.replace(/\s*\[\d+(,\d+)*\]/g, '');
          } else {
            desc = tr.desc.replace(/\[(\d+(,\d+)*)\]/g, '<span class="citation-ref">[$1]</span>');
          }
          html += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
              <td style="padding: 8px; font-weight:bold;">${tr.level}</td>
              <td style="padding: 8px; font-family:var(--font-mono); color:var(--primary);">${tr.price}</td>
              <td style="padding: 8px; color:var(--text-muted);">${desc}</td>
            </tr>
          `;
        });
        html += `</tbody></table>`;
      } else if (sec.table.headers && sec.table.rows) {
        html += `
          <table style="width:100%; border-collapse:collapse; margin: 15px 0; font-size: 0.8rem;">
            <thead>
              <tr style="border-bottom: 2px solid var(--card-border); text-align: left;">
                ${sec.table.headers.map(h => `<th style="padding: 8px;">${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
        `;
        sec.table.rows.forEach(row => {
          html += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">`;
          row.forEach((cell, idx) => {
            let text = cell;
            if (!citationsEnabled) {
              text = text.replace(/\s*\[\d+(,\d+)*\]/g, '');
            } else {
              text = text.replace(/\[(\d+(,\d+)*)\]/g, '<span class="citation-ref">[$1]</span>');
            }
            const style = idx === 0 ? 'font-weight:bold; padding: 8px;' : 'padding: 8px; color:var(--text-muted);';
            html += `<td style="${style}">${text}</td>`;
          });
          html += `</tr>`;
        });
        html += `</tbody></table>`;
      }
    }
  });
  html += `</div>`;
  
  // 5. References Block (Citations Factor)
  if (citationsEnabled && reportData.references && reportData.references.length > 0) {
    html += `
      <div class="report-references">
        <h4>Sourcing & Verification Records</h4>
        <ol>
          ${reportData.references.map(ref => `<li>${ref}</li>`).join('')}
        </ol>
      </div>
    `;
  }
  
  // 6. Standard AI Disclaimer (Held Constant, Both Arms)
  html += `
    <div class="report-footer">
      <p class="disclaimer-text">Gemini is AI and can make mistakes.</p>
    </div>
  `;
  
  container.innerHTML = html;
  
  // Setup intersection observer on verdict banner to simulate Dwell Gate logging
  setupDwellGateObserver();
  
  // Render ticker stock price chart
  drawStockPriceChart(ticker);
}

// ---------------------------------------------------------------------------
// Forecast Tracker widget (Platform Design Part III.7 / Proposal §3.3)
// A compact in-report traffic-light strip for the selected ticker:
//   • Forecast row (both arms): one light per week — green=Bullish,
//     yellow=Uncertain, red=Bearish — lit up to the current drop, "off" ahead.
//   • Outcome row (TRANSPARENCY arm only): realized weekly return per week,
//     green for a positive return, red for negative, with the % inside.
// The outcome row is the transparency wedge: it is omitted entirely for the
// control arm, which must self-compute accuracy from the price chart.
// ---------------------------------------------------------------------------
function buildForecastWidgetHTML(ticker, transparencyEnabled) {
  const N = 8;

  // Forecast lights (weeks 1..8; lit only through the current drop)
  const forecastCells = [];
  for (let w = 1; w <= N; w++) {
    const call = AI_FORECASTS[w] ? AI_FORECASTS[w][ticker] : null;
    if (w > state.currentWeek || !call) {
      forecastCells.push(`<span class="ft-cell"><span class="ft-light off" title="Week ${w}: not yet dropped"></span></span>`);
      continue;
    }
    const cls = call === 'Bullish' ? 'bullish' : call === 'Bearish' ? 'bearish' : 'uncertain';
    forecastCells.push(`<span class="ft-cell"><span class="ft-light ${cls}" title="Week ${w}: ${call}"></span></span>`);
  }

  // Outcome chips (transparency arm only): realized return w -> w+1
  let outcomeRow = '';
  if (transparencyEnabled) {
    const outcomeCells = [];
    for (let w = 1; w <= N; w++) {
      const pThis = STOCK_PRICES[w] ? STOCK_PRICES[w][ticker] : null;
      const pNext = STOCK_PRICES[w + 1] ? STOCK_PRICES[w + 1][ticker] : null;
      const matured = w < state.currentWeek && pThis != null && pNext != null;
      if (!matured) {
        outcomeCells.push(`<span class="ft-cell"><span class="ft-out pending" title="Week ${w}: awaiting close">–</span></span>`);
        continue;
      }
      const pct = ((pNext - pThis) / pThis) * 100;
      const cls = pct >= 0 ? 'pos' : 'neg';
      const label = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
      outcomeCells.push(`<span class="ft-cell"><span class="ft-out ${cls}" title="Week ${w}: ${label}">${label}</span></span>`);
    }
    outcomeRow = `
      <span class="ft-rowlabel">Outcome</span>
      ${outcomeCells.join('')}`;
  }

  const weekCells = Array.from({ length: N }, (_, i) =>
    `<span class="ft-cell ft-week ${i + 1 === state.currentWeek ? 'now' : ''}">${i + 1}</span>`).join('');

  return `
    <div class="ft-widget ${transparencyEnabled ? '' : 'control'}">
      <div class="ft-widget-head">
        <span class="ft-widget-title">Forecast Tracker · ${ticker}</span>
        <span class="ft-legend">
          <span class="ft-legend-item"><span class="ft-light bullish sm"></span>Bullish</span>
          <span class="ft-legend-item"><span class="ft-light uncertain sm"></span>Uncertain</span>
          <span class="ft-legend-item"><span class="ft-light bearish sm"></span>Bearish</span>
        </span>
      </div>
      <div class="ft-grid ${transparencyEnabled ? 'with-outcome' : ''}">
        <span class="ft-rowlabel ft-weeklabel">Week</span>
        ${weekCells}
        <span class="ft-rowlabel">Forecast</span>
        ${forecastCells.join('')}
        ${outcomeRow}
      </div>
    </div>
  `;
}

// Dwell Gate Simulator using IntersectionObserver
function setupDwellGateObserver() {
  const target = document.getElementById('report-verdict-banner-el');
  const dot = document.getElementById('dwell-dot-indicator');
  const txt = document.getElementById('dwell-status-text');
  
  if (!target || !dot || !txt) return;
  
  // Clear any existing intervals
  if (state.dwellTimerId) clearInterval(state.dwellTimerId);
  
  // Reset visual state
  if (state.headerDwellCertified) {
    dot.className = 'dwell-dot certified';
    txt.textContent = 'Dwell Gate: Verified';
  } else {
    dot.className = 'dwell-dot';
    txt.textContent = 'Dwell Gate: Reading...';
  }
  
  let secondsInView = 0;
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !state.headerDwellCertified) {
        dot.className = 'dwell-dot active';
        state.dwellTimerId = setInterval(() => {
          secondsInView += 0.5;
          if (secondsInView >= 3.0) {
            state.headerDwellCertified = true;
            dot.className = 'dwell-dot certified';
            txt.textContent = 'Dwell Gate: Verified';
            clearInterval(state.dwellTimerId);
            
            // Log Dwell Certified Event
            logEvent("DWELL_GATE_CERTIFIED", {
              ticker: state.selectedStock,
              requiredSeconds: 3.0,
              reportLengthMode: state.factors.length
            });
            
            // Track active week participation
            state.activeWeeksTracker[state.currentWeek] = true;
          }
        }, 500);
      } else {
        if (state.dwellTimerId) {
          clearInterval(state.dwellTimerId);
          if (!state.headerDwellCertified) {
            dot.className = 'dwell-dot';
            txt.textContent = 'Dwell Gate: Paused';
          }
        }
      }
    });
  }, { threshold: 0.8 });
  
  observer.observe(target);
}

// Chatbot Context-Limited Query
function createNewChatThread(ticker) {
  if (!state.chatbotHistory[ticker]) {
    state.chatbotHistory[ticker] = [];
  }
  const week = state.currentWeek;
  const threadCount = state.chatbotHistory[ticker].length + 1;
  const newThread = {
    id: 'thread_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    label: `Week ${week} - Thread #${threadCount}`,
    week: week,
    messages: []
  };
  state.chatbotHistory[ticker].push(newThread);
  state.activeChatThreadId[ticker] = newThread.id;
  
  logEvent("CHATBOT_THREAD_CREATED", {
    ticker,
    threadId: newThread.id,
    label: newThread.label,
    week: newThread.week
  });
  
  return newThread;
}

function renderChatThreadSelector() {
  const selectEl = document.getElementById('chat-thread-select');
  if (!selectEl) return;
  
  const ticker = state.selectedStock;
  if (!state.chatbotHistory[ticker]) {
    state.chatbotHistory[ticker] = [];
  }
  
  // If there are no threads under this ticker, create the first one automatically
  if (state.chatbotHistory[ticker].length === 0) {
    createNewChatThread(ticker);
  }
  
  // Ensure activeChatThreadId[ticker] is set to a valid thread
  let activeThreadId = state.activeChatThreadId[ticker];
  if (!activeThreadId || !state.chatbotHistory[ticker].some(t => t.id === activeThreadId)) {
    // Select the last thread
    const lastThread = state.chatbotHistory[ticker][state.chatbotHistory[ticker].length - 1];
    state.activeChatThreadId[ticker] = lastThread.id;
    activeThreadId = lastThread.id;
  }
  
  selectEl.innerHTML = state.chatbotHistory[ticker].map(t => `
    <option value="${t.id}" ${t.id === activeThreadId ? 'selected' : ''}>
      ${t.label}
    </option>
  `).join('');
}

function sendChatMessage() {
  const inputEl = document.getElementById('chat-input-text');
  if (!inputEl) return;
  const text = inputEl.value.trim();
  if (!text) return;
  
  // Deduct chat credit
  if (state.chatbotCredits < 0.15) {
    alert("Insufficient chatbot credits. Weekly API cost limit reached.");
    return;
  }
  state.chatbotCredits -= 0.15;
  document.getElementById('credit-value').textContent = '$' + state.chatbotCredits.toFixed(2);
  
  // Track active week participation
  state.activeWeeksTracker[state.currentWeek] = true;
  
  const ticker = state.selectedStock;
  if (!state.chatbotHistory[ticker]) state.chatbotHistory[ticker] = [];
  
  let activeThreadId = state.activeChatThreadId[ticker];
  let activeThread = state.chatbotHistory[ticker].find(t => t.id === activeThreadId);
  if (!activeThread) {
    activeThread = createNewChatThread(ticker);
    activeThreadId = activeThread.id;
  }
  
  const isNewChat = activeThread.messages.length === 0;
  const threadContinuity = isNewChat ? "new-chat" : "continue-prior";
  
  let timeInterval = 0;
  if (!isNewChat) {
    const lastMsg = activeThread.messages[activeThread.messages.length - 1];
    timeInterval = lastMsg ? Math.round((Date.now() - lastMsg.timestamp) / 1000) : 0;
  }
  
  // Push user message
  const userMsg = { sender: 'user', text, week: state.currentWeek, timestamp: Date.now() };
  activeThread.messages.push(userMsg);
  inputEl.value = '';
  renderChatMessages();
  
  // Generate Response
  setTimeout(() => {
    const response = getChatbotResponse(ticker, text);
    const botMsg = { sender: 'bot', text: response, week: state.currentWeek, timestamp: Date.now() };
    activeThread.messages.push(botMsg);
    renderChatMessages();
    
    // Log Chat with full required fields
    logEvent("CHATBOT_QUERY", {
      ticker,
      query: text,
      response: response,
      timestamp: new Date().toISOString(),
      threadId: activeThreadId,
      reportWeekLabel: `Week ${activeThread.week}`,
      threadContinuity,
      timeInterval,
      costDeducted: "$0.15",
      remainingCredit: "$" + state.chatbotCredits.toFixed(2)
    });
  }, 700);
}

function renderChatMessages() {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;
  
  const ticker = state.selectedStock;
  const activeThreadId = state.activeChatThreadId[ticker];
  const activeThread = state.chatbotHistory[ticker] ? state.chatbotHistory[ticker].find(t => t.id === activeThreadId) : null;
  const history = activeThread ? activeThread.messages : [];
  
  if (history.length === 0) {
    container.innerHTML = `
      <div class="chat-bubble bot">
        Hello! I'm your AI financial assistant, with this week's ${ticker} report in context. I can walk through the report's findings (Technical, Valuation, Narrative, or Macro), and I'm also happy to help with broader investing questions — allocation, saving, or how a concept applies to your situation.
      </div>
    `;
    return;
  }
  
  container.innerHTML = history.map(msg => `
    <div class="chat-bubble ${msg.sender}">
      ${msg.text}
    </div>
  `).join('');
  container.scrollTop = container.scrollHeight;
}

function updateChatHistory() {
  renderChatThreadSelector();
  renderChatMessages();
}

function getChatbotResponse(ticker, query) {
  const q = query.toLowerCase();
  
  // If report length is short, bot's answers are also restricted/shortened
  const isShort = state.factors.length === 'short';
  const shortSuffix = isShort ? " (Note: Detailed paragraph analysis is withheld in short-length format.)" : "";
  
  // Dynamic weeks 4-8 chatbot compiler
  if (state.currentWeek >= 4) {
    const forecast = AI_FORECASTS[state.currentWeek][ticker];
    if (q.includes('why') || q.includes('outlook') || q.includes('forecast') || q.includes('bearish') || q.includes('bullish')) {
      return `According to the report, the outlook for ${ticker} in Week ${state.currentWeek} is ${forecast}. This is driven by institutional support and momentum cues.`;
    }
    if (q.includes('technical') || q.includes('level') || q.includes('support') || q.includes('resistance')) {
      return `For Week ${state.currentWeek}, ${ticker} has primary support at $${(STOCK_PRICES[state.currentWeek][ticker] * 0.97).toFixed(2)} and resistance at $${(STOCK_PRICES[state.currentWeek][ticker] * 1.03).toFixed(2)}.`;
    }
    if (q.includes('valuation') || q.includes('pe') || q.includes('expensive')) {
      return `The report highlights that ${ticker}'s valuation is fairly valued relative to sector averages, though high growth expectations are built into current price levels.`;
    }
    return `I can walk through the current report for ${ticker} in Week ${state.currentWeek} — Technical Levels, Valuation, or the weekly forecast — or help with a broader investing question if you have one.`;
  }
  
  if (ticker === 'AAPL') {
    if (q.includes('iphone') || q.includes('demand') || q.includes('17')) {
      return `Section 5 (Narrative Catalysts) details the iPhone 17 cycle. Early supply checks indicate surging interest in the high-margin Pro models. This is a primary bullish driver for margins.${shortSuffix}`;
    }
    if (q.includes('ai') || q.includes('gemini') || q.includes('intelligence')) {
      return `The report (Section 5) highlights Apple's negotiations with Google to license the Gemini engine as a major pivot. This positions Apple as a mass AI distributor to its 1.5B users, bypassing cloud CapEx risk.${shortSuffix}`;
    }
    if (q.includes('valuation') || q.includes('pe') || q.includes('expensive')) {
      return `According to Section 4, AAPL's trailing P/E is 39.22x and forward P/E is 32.1x, which represents a historical premium. This valuation expects significant growth acceleration and offers little margin of safety compared to peers like Alphabet (24.4x forward P/E).`;
    }
    if (q.includes('technical') || q.includes('resistance') || q.includes('support') || q.includes('level')) {
      return `Section 3 shows key levels: Resistance is at $257 (bull flag boundary) and $260 (all-time high). Primary Support is at $253-$253.50, and Major Support is at $250. An overbought RSI indicates caution.`;
    }
    if (q.includes('fomc') || q.includes('minutes') || q.includes('macro') || q.includes('wednesday')) {
      return `Section 6 outlines that the FOMC Meeting Minutes release on Wednesday, October 8, represents the core macroeconomic event risk. A dovish tone maintains market liquidity, while hawkish metrics could pressure tech names.`;
    }
  } else if (ticker === 'MSFT') {
    if (q.includes('capex') || q.includes('spend') || q.includes('margin') || q.includes('cost')) {
      return `Under the MSFT analysis, massive Azure AI capacity additions have driven Capital Expenditures up 28% YoY. Operating margins are expected to face a 150-200 bps headwind from depreciation in upcoming quarters.`;
    }
    if (q.includes('bearish') || q.includes('why')) {
      return `The bearish forecast is driven by valuation premiums (33.4x forward P/E) coupled with immediate margin threats from high CapEx depreciation, and technical resistance lines.`;
    }
  } else if (ticker === 'GOOGL') {
    if (q.includes('valuation') || q.includes('pe') || q.includes('cheap')) {
      return `Alphabet trades at 24.4x forward earnings, which is structurally cheap relative to Microsoft (33.4x) and Apple (32.1x), forming a core part of the bullish outlook.`;
    }
  }
  
  return `I can walk through the current report for ${ticker} — Technical Levels, Valuation/CapEx, Narrative Catalysts, or the Wednesday FOMC Minutes — or help with a broader investing question if you have one.`;
}

// Leaderboard calculation
function updateLeaderboard() {
  const container = document.getElementById('leaderboard-container');
  if (!container) return;
  
  const showIndex = state.factors.transparency === 'transparency';
  
  // Calculate User performance
  const prices = STOCK_PRICES[state.currentWeek];
  let userTotal = state.user.cash;
  Object.keys(state.user.holdings).forEach(t => {
    userTotal += state.user.holdings[t] * prices[t];
  });
  const userReturn = ((userTotal - 1000000) / 1000000) * 100;
  
  // User Sharpe (simulated based on returns and asset volatility)
  let userSharpe = 0.85;
  if (userReturn > 0) userSharpe = 0.85 + (userReturn * 0.12);
  if (userReturn < 0) userSharpe = 0.85 + (userReturn * 0.15);
  
  // Determine User Tier
  let userTier = "Bronze";
  if (userReturn >= 8.0) userTier = "Platinum";
  else if (userReturn >= 4.0) userTier = "Gold";
  else if (userReturn >= 0.0) userTier = "Silver";
  
  // Update Header UI for user tier
  const tierBadge = document.getElementById('header-user-tier');
  if (tierBadge) {
    tierBadge.className = `user-tier-badge tier-${userTier.toLowerCase()}`;
    tierBadge.textContent = userTier;
  }
  
  // Construct leaderboard list
  const list = [
    ...LEADERBOARD_BASE
  ];
  list.push({ name: "YOU (Pseudonymous)", tier: userTier, return: userReturn, sharpe: userSharpe, isUser: true });
  
  // Add Nasdaq 100 Index and Gemini Deep Research AI Portfolio as benchmark rows (if transparency active)
  if (showIndex) {
    const indexReturnsMap = [0, 0.0, 1.01, 1.66, 2.17, 2.58, 2.95, 3.22, 3.48, 3.68];
    const indexRet = indexReturnsMap[state.currentWeek];
    list.push({ name: "NASDAQ 100 INDEX (Benchmark)", tier: "N/A", return: indexRet, sharpe: 1.25, isBenchmark: true });
    
    const aiReturnsMap = [0, 0.0, 2.30, 1.10, 1.88, 1.40, 1.15, 0.65, 0.10, -1.20];
    const aiRet = aiReturnsMap[state.currentWeek];
    const aiSharpeMap = [0, 0.0, 1.12, 0.58, 0.92, 0.68, 0.56, 0.32, 0.05, -0.45];
    const aiSharpe = aiSharpeMap[state.currentWeek];
    list.push({ name: "GEMINI DEEP RESEARCH (AI Portfolio)", tier: "N/A", return: aiRet, sharpe: aiSharpe, isBenchmark: true });
  }
  
  // Sort by return
  list.sort((a, b) => b.return - a.return);
  
  let html = `
    <table class="leaderboard-table">
      <thead>
        <tr>
          <th class="rank-col">Rank</th>
          <th>Participant</th>
          <th>Tier</th>
          <th>Sharpe Ratio</th>
          <th style="text-align: right;">Cumulative Return</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  list.forEach((item, idx) => {
    let rowClass = '';
    if (item.isUser) rowClass = 'user-row';
    else if (item.isBenchmark) rowClass = 'benchmark-row';
    
    const displayRank = item.isBenchmark ? '-' : (idx + 1);
    
    html += `
      <tr class="${rowClass}">
        <td class="rank-col">${displayRank}</td>
        <td style="font-weight: ${item.isUser ? 'bold' : 'normal'}">${item.name}</td>
        <td>
          ${item.isBenchmark ? '<span style="color:var(--text-dim)">-</span>' : `
            <span class="user-tier-badge tier-${item.tier.toLowerCase()}">${item.tier}</span>
          `}
        </td>
        <td style="font-family: var(--font-mono)">${item.sharpe.toFixed(2)}</td>
        <td style="text-align: right; font-family: var(--font-mono); font-weight: bold; color: ${item.return >= 0 ? 'var(--bullish)' : 'var(--bearish)'}">
          ${item.return >= 0 ? '+' : ''}${item.return.toFixed(2)}%
        </td>
      </tr>
    `;
  });
  
  html += `</tbody></table>`;

  container.innerHTML = html;
}

// Email Simulator Content
function renderEmailContent() {
  const container = document.getElementById('email-simulator-content');
  if (!container) return;

  const showIndex = state.factors.transparency === 'transparency';
  const dates = {
    1: "Sunday, Oct 5, 2025",
    2: "Sunday, Oct 12, 2025",
    3: "Sunday, Oct 19, 2025",
    4: "Sunday, Oct 26, 2025",
    5: "Sunday, Nov 2, 2025",
    6: "Sunday, Nov 9, 2025",
    7: "Sunday, Nov 16, 2025",
    8: "Sunday, Nov 23, 2025"
  };
  const date = dates[state.currentWeek] || dates[8];
  
  // User metrics
  const prices = STOCK_PRICES[state.currentWeek];
  let userTotal = state.user.cash;
  Object.keys(state.user.holdings).forEach(t => {
    userTotal += state.user.holdings[t] * prices[t];
  });
  const userReturn = ((userTotal - 1000000) / 1000000) * 100;
  
  let userTier = "Bronze";
  if (userReturn >= 8.0) userTier = "Platinum";
  else if (userReturn >= 4.0) userTier = "Gold";
  else if (userReturn >= 0.0) userTier = "Silver";
  
  let html = `
    <div class="email-card">
      <div class="email-meta-line">
        <strong>From:</strong> study-coordinator@stevens.edu<br>
        <strong>Date:</strong> ${date}<br>
        <strong>Subject:</strong> [Nasdaq 100 Challenge] Week ${state.currentWeek} Reports Dropped!
      </div>
      <div class="email-body-content">
        <div class="email-header-logo">THE NASDAQ 100 CHALLENGE</div>
        <p>Dear Participant,</p>
        <p>The weekly research reports from the Gemini Deep Research pipeline for the Nasdaq 100 constituent tickers have been updated and are now available on the platform dashboard.</p>
        
        <div class="email-accent-box">
          <div class="email-accent-title">Your Current Status</div>
          <p>• Portfolio Total Value: <strong>$${userTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</strong></p>
          <p>• Cumulative Return: <strong style="color: ${userReturn >= 0 ? '#16a34a' : '#dc2626'}">${userReturn >= 0 ? '+' : ''}${userReturn.toFixed(2)}%</strong></p>
          <p>• Leaderboard Rank Tier: <strong style="text-transform:uppercase;">${userTier}</strong></p>
        </div>
  `;
  
  // Transparency Section in email
  if (showIndex) {
    let accuracyStr = "N/A (First drop)";
    let benchmarkComparison = "";
    
    if (state.currentWeek >= 2) {
      const stats = getAccuracyStats(state.currentWeek);
      accuracyStr = stats.rate;
      benchmarkComparison = `<p>• Nasdaq 100 Index return since launch: <strong>${stats.indexRet}</strong> (AI Portfolio cumulative return: <strong>${stats.aiRet}</strong>)</p>`;
    }
    
    html += `
        <div class="email-accent-box" style="background-color: #faf5ff; border-color: #e9d5ff;">
          <div class="email-accent-title" style="color: #7e22ce;">⚠️ ACCURACY & BENCHMARK DISCLOSURE</div>
          <p>• AI Forecast Accuracy (mature calls): <strong>${accuracyStr}</strong></p>
          ${benchmarkComparison}
          <p style="font-size:0.8rem; color:#6b21a8; margin-top:8px;"><em>In a prior benchmark study, Gemini Deep Research's weekly Bullish/Bearish calls matched each stock's actual price direction only 54% of the time, a level of accuracy that was not statistically distinguishable from a random coin-flip guess.</em></p>
        </div>
    `;
  }
  
  html += `
        <p>Log in to your dashboard to review the new reports, chat with the AI research assistant, and adjust your portfolio before market execution. Remember, completing the activity across 6 of the 8 weeks guarantees your Stevens Certificate of Participation and eligibility for the completion cash pool.</p>
        <p>Best regards,<br>Stevens Experiment Coordinator</p>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

// Chart.js implementation
let chartInstance = null;
function drawCharts() {
  const ctx = document.getElementById('portfolio-chart');
  if (!ctx) return;
  
  const showIndex = state.factors.transparency === 'transparency';
  const isDark = state.theme === 'dark';
  
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0';
  const labelColor = isDark ? '#94a3b8' : '#475569';
  const userLineColor = isDark ? '#818cf8' : '#4f46e5';
  const userFillColor = isDark ? 'rgba(0, 229, 255, 0.05)' : 'rgba(37, 99, 235, 0.05)';
  const aiLineColor = isDark ? '#10b981' : '#16a34a';
  const indexLineColor = isDark ? '#c4b5fd' : '#9333ea';
  
  // Simulated chart labels for 8 Weeks
  const labels = ['Launch (t0)', 'Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'];
  
  // Calculate user return path
  const prices = STOCK_PRICES[state.currentWeek];
  let userTotal = state.user.cash;
  Object.keys(state.user.holdings).forEach(t => {
    userTotal += state.user.holdings[t] * prices[t];
  });
  const finalUserVal = userTotal;
  
  const userBaseValues = [1000000, 1021000, 1011500, 1019000, 1026000, 1021000, 1029000, 1034000];
  const userValues = [];
  for (let w = 0; w < state.currentWeek; w++) {
    userValues.push(userBaseValues[w]);
  }
  userValues.push(finalUserVal);

  // GenAI portfolio performance cumulative path
  const aiValues = [1000000, 1023000, 1011000, 1018800, 1014000, 1011500, 1006500, 1001000, 988000];

  // Nasdaq 100 Index performance benchmark cumulative path
  const indexValues = [1000000, 1010100, 1016600, 1021700, 1025800, 1029500, 1032200, 1034800, 1036800];
  
  const datasets = [
    {
      label: 'Your Portfolio',
      data: userValues.slice(0, state.currentWeek + 1),
      borderColor: userLineColor,
      backgroundColor: userFillColor,
      fill: true,
      tension: 0.1,
      borderWidth: 2
    },
    {
      label: 'GenAI Portfolio (Value-Weighted)',
      data: aiValues.slice(0, state.currentWeek + 1),
      borderColor: aiLineColor,
      backgroundColor: 'transparent',
      fill: false,
      tension: 0.1,
      borderDash: [5, 5],
      borderWidth: 2
    }
  ];
  
  if (showIndex) {
    datasets.push({
      label: 'NASDAQ 100 Index (Passive)',
      data: indexValues.slice(0, state.currentWeek + 1),
      borderColor: indexLineColor,
      backgroundColor: 'transparent',
      fill: false,
      tension: 0.1,
      borderWidth: 1.5
    });
  }
  
  if (chartInstance) chartInstance.destroy();
  
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.slice(0, state.currentWeek + 1),
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: labelColor,
            font: { family: 'Inter', size: 10 }
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: labelColor, font: { family: 'Inter', size: 9 } }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: labelColor, font: { family: 'Inter', size: 9 } }
        }
      }
    }
  });
}

const WEEK_END_DATES = {
  1: '2025-10-03',
  2: '2025-10-10',
  3: '2025-10-17',
  4: '2025-10-24',
  5: '2025-10-31',
  6: '2025-11-07',
  7: '2025-11-14',
  8: '2025-11-21'
};

let stockChartInstance = null;

function drawStockPriceChart(ticker) {
  const ctx = document.getElementById('stock-price-chart');
  if (!ctx) return;
  
  if (stockChartInstance) {
    stockChartInstance.destroy();
    stockChartInstance = null;
  }
  
  // Handle delisted stocks
  if (state.delistedStocks.includes(ticker)) {
    const canvasCtx = ctx.getContext('2d');
    canvasCtx.clearRect(0, 0, ctx.width || 500, ctx.height || 260);
    canvasCtx.fillStyle = '#ef4444';
    canvasCtx.font = '14px sans-serif';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText(`${ticker} is delisted. Forecasts suspended.`, (ctx.width || 500) / 2, (ctx.height || 260) / 2);
    
    const headerTitle = document.getElementById('ticker-chart-header-title');
    if (headerTitle) headerTitle.textContent = `${ticker} - Forecast Halted`;
    const badge = document.getElementById('ticker-chart-badge');
    if (badge) {
      badge.textContent = "Halted";
      badge.className = "stock-call-badge neutral";
    }
    return;
  }
  
  if (!externalStockPrices || !externalStockPrices[ticker]) {
    // Show a loading text on canvas if data not loaded yet
    const canvasCtx = ctx.getContext('2d');
    canvasCtx.clearRect(0, 0, ctx.width || 500, ctx.height || 260);
    canvasCtx.fillStyle = state.theme === 'dark' ? '#94a3b8' : '#475569';
    canvasCtx.font = '14px sans-serif';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText('Loading stock price data...', (ctx.width || 500) / 2, (ctx.height || 260) / 2);
    return;
  }
  
  const history = externalStockPrices[ticker];
  const cutoffDate = WEEK_END_DATES[state.currentWeek] || '2025-11-21';
  
  // Filter history starting from 2025-06-01 to cutoffDate
  const filteredData = history.filter(d => d.date >= '2025-06-01' && d.date <= cutoffDate);
  
  if (filteredData.length === 0) return;
  
  const labels = filteredData.map(d => {
    const p = d.date.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mIdx = parseInt(p[1], 10) - 1;
    return `${months[mIdx]} ${p[2]}`;
  });
  
  const prices = filteredData.map(d => d.close);
  
  // Theme styling
  const isDark = state.theme === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0';
  const labelColor = isDark ? '#94a3b8' : '#475569';
  
  // Line Color based on Recommendation
  const forecast = AI_FORECASTS[state.currentWeek][ticker] || 'Neutral';
  let lineColor = '#94a3b8'; // Neutral
  let fillColor = 'rgba(148, 163, 184, 0.04)';
  
  if (forecast === 'Bullish') {
    lineColor = isDark ? '#10b981' : '#16a34a'; // Green
    fillColor = isDark ? 'rgba(16, 185, 129, 0.04)' : 'rgba(22, 163, 74, 0.04)';
  } else if (forecast === 'Bearish') {
    lineColor = isDark ? '#ef4444' : '#dc2626'; // Red
    fillColor = isDark ? 'rgba(239, 68, 68, 0.04)' : 'rgba(220, 38, 38, 0.04)';
  }
  
  // Update static header and badge on the Price Chart tab
  const headerTitle = document.getElementById('ticker-chart-header-title');
  if (headerTitle) {
    headerTitle.textContent = `${ticker} Price Trend & Forecast Window`;
  }
  
  const badge = document.getElementById('ticker-chart-badge');
  if (badge) {
    badge.textContent = `AI: ${forecast}`;
    badge.className = `stock-call-badge ${forecast.toLowerCase()}`;
  }
  
  // Highlight legend colors
  const legendLine = document.getElementById('stock-legend-line-color');
  if (legendLine) legendLine.style.backgroundColor = lineColor;
  
  const legendDot = document.getElementById('stock-legend-dot-color');
  const dotColor = isDark ? '#818cf8' : '#4f46e5'; // Portfolio accent
  if (legendDot) legendDot.style.backgroundColor = dotColor;
  
  // Chart.js Line Chart
  stockChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: `${ticker} Price`,
          data: prices,
          borderColor: lineColor,
          backgroundColor: fillColor,
          fill: true,
          tension: 0.15,
          borderWidth: 2,
          pointRadius: (ctx) => {
            const index = ctx.dataIndex;
            return index === prices.length - 1 ? 6 : 0;
          },
          pointBackgroundColor: (ctx) => {
            const index = ctx.dataIndex;
            return index === prices.length - 1 ? dotColor : lineColor;
          },
          pointBorderColor: (ctx) => {
            const index = ctx.dataIndex;
            return index === prices.length - 1 ? '#ffffff' : lineColor;
          },
          pointBorderWidth: (ctx) => {
            const index = ctx.dataIndex;
            return index === prices.length - 1 ? 2 : 1;
          },
          pointHoverRadius: 6,
          pointHoverBackgroundColor: dotColor
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          titleColor: isDark ? '#f8fafc' : '#0f172a',
          bodyColor: isDark ? '#cbd5e1' : '#334155',
          borderColor: gridColor,
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              return `Price: $${context.raw.toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: labelColor,
            font: { family: 'Inter', size: 9 },
            maxTicksLimit: 8
          }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: labelColor, font: { family: 'Inter', size: 9 },
            callback: function(value) {
              return '$' + value;
            }
          }
        }
      }
    }
  });
}

function getHoldingCostBasis(ticker) {
  let totalShares = 0;
  let totalCost = 0;
  let averageCostBasis = 0;
  
  state.user.transactions.forEach(tx => {
    if (tx.ticker !== ticker) return;
    if (tx.type === 'BUY') {
      totalShares += tx.shares;
      totalCost += tx.amount;
      averageCostBasis = totalShares > 0 ? totalCost / totalShares : 0;
    } else if (tx.type === 'SELL' || tx.type === 'LIQUIDATE_FORCED') {
      const sellShares = tx.shares;
      totalShares = Math.max(0, totalShares - sellShares);
      if (totalShares === 0) {
        totalCost = 0;
        averageCostBasis = 0;
      } else {
        totalCost = totalShares * averageCostBasis;
      }
    }
  });
  
  return {
    average: averageCostBasis,
    total: totalCost
  };
}

window.sortHoldingsTable = function(columnName) {
  if (state.holdingsSortKey === columnName) {
    state.holdingsSortDir = state.holdingsSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    state.holdingsSortKey = columnName;
    state.holdingsSortDir = 'asc';
  }
  logEvent("HOLDINGS_SORTED", { columnName, direction: state.holdingsSortDir });
  updateDashboard();
};

function getStockRange52Week(ticker) {
  const ranges = {
    AAPL: { min: 170.00, max: 275.00 },
    MSFT: { min: 340.00, max: 450.00 },
    GOOGL: { min: 130.00, max: 190.00 },
    NVDA: { min: 75.00, max: 150.00 },
    AMZN: { min: 140.00, max: 210.00 }
  };
  return ranges[ticker] || { min: 0, max: 200 };
}

// Refresh Dashboard metrics and panels
function updateDashboard() {
  // Update metrics in header
  const cashValEl = document.getElementById('header-cash');
  const portfolioValEl = document.getElementById('header-portfolio-val');
  const returnEl = document.getElementById('header-return');
  const weekBadge = document.getElementById('header-week');
  
  if (!cashValEl) return;
  
  const prices = STOCK_PRICES[state.currentWeek];
  let holdingsValue = 0;
  Object.keys(state.user.holdings).forEach(ticker => {
    holdingsValue += state.user.holdings[ticker] * prices[ticker];
  });
  const totalVal = state.user.cash + holdingsValue;
  
  // Render Left panel holdings list (Fidelity Style Table)
  const holdingsContainer = document.getElementById('portfolio-holdings-list');
  if (holdingsContainer) {
    let rowsHtml = '';
    
    // 1. Account Section Header removed

    // 2. Cash Row
    const cashPercent = totalVal > 0 ? (state.user.cash / totalVal) * 100 : 0;
    rowsHtml += `
      <tr>
        <td style="text-align: left;">
          <span style="font-weight: bold; color: var(--text-main); font-size: 0.8rem;">Cash</span>
          <span class="fidelity-symbol-desc">HELD IN MONEY MARKET</span>
        </td>
        <td>--</td>
        <td>--</td>
        <td>--</td>
        <td>--</td>
        <td>--</td>
        <td>--</td>
        <td style="font-family: var(--font-mono); font-weight: 500; color: var(--text-main);">$${state.user.cash.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
        <td style="font-family: var(--font-mono); color: var(--text-main);">${cashPercent.toFixed(2)}%</td>
        <td>--</td>
        <td>--</td>
        <td>--</td>
        <td style="text-align: center; vertical-align: middle;">--</td>
      </tr>
    `;

    // 3. Stock Holdings Rows
    let totalUnrealizedGainLoss = 0;
    let totalStockCostBasis = 0;
    let totalTodaysGainLoss = 0;

    // Map holdings to calculated items
    const holdingsList = Object.keys(state.user.holdings).map(ticker => {
      const qty = state.user.holdings[ticker];
      const currentPrice = prices[ticker];
      const val = qty * currentPrice;
      
      const cb = getHoldingCostBasis(ticker);
      const unrealizedGL = val - cb.total;
      const totalGLPercent = cb.total > 0 ? (unrealizedGL / cb.total) * 100 : 0;
      
      const prevWeekIndex = state.currentWeek > 1 ? state.currentWeek - 1 : 1;
      const prevPrice = STOCK_PRICES[prevWeekIndex][ticker];
      const priceChange = currentPrice - prevPrice;
      const priceChangePercent = prevPrice > 0 ? (priceChange / prevPrice) * 100 : 0;
      
      const todaysGL = qty * priceChange;
      const percentOfAccount = totalVal > 0 ? (val / totalVal) * 100 : 0;

      // Accumulate totals
      totalStockCostBasis += cb.total;
      totalUnrealizedGainLoss += unrealizedGL;
      totalTodaysGainLoss += todaysGL;

      const range = getStockRange52Week(ticker);
      const rangePercent = Math.max(0, Math.min(100, ((currentPrice - range.min) / (range.max - range.min)) * 100));

      return {
        ticker,
        qty,
        currentPrice,
        val,
        costBasisAverage: cb.average,
        costBasisTotal: cb.total,
        unrealizedGL,
        totalGLPercent,
        priceChange,
        priceChangePercent,
        todaysGL,
        percentOfAccount,
        range,
        rangePercent
      };
    });

    // Sort holdingsList based on active sort settings
    const sortKey = state.holdingsSortKey || 'Symbol';
    const sortDir = state.holdingsSortDir || 'asc';

    holdingsList.sort((a, b) => {
      let valA, valB;
      if (sortKey === 'Symbol') {
        valA = a.ticker;
        valB = b.ticker;
      } else if (sortKey === 'LastPrice') {
        valA = a.currentPrice;
        valB = b.currentPrice;
      } else if (sortKey === 'PriceChange') {
        valA = a.priceChange;
        valB = b.priceChange;
      } else if (sortKey === 'TodaysGL') {
        valA = a.todaysGL;
        valB = b.todaysGL;
      } else if (sortKey === 'TodaysGLPct') {
        valA = a.priceChangePercent;
        valB = b.priceChangePercent;
      } else if (sortKey === 'TotalGL') {
        valA = a.unrealizedGL;
        valB = b.unrealizedGL;
      } else if (sortKey === 'TotalGLPct') {
        valA = a.totalGLPercent;
        valB = b.totalGLPercent;
      } else if (sortKey === 'CurrentVal') {
        valA = a.val;
        valB = b.val;
      } else if (sortKey === 'PercentAccount') {
        valA = a.percentOfAccount;
        valB = b.percentOfAccount;
      } else if (sortKey === 'Qty') {
        valA = a.qty;
        valB = b.qty;
      } else if (sortKey === 'AvgCost') {
        valA = a.costBasisAverage;
        valB = b.costBasisAverage;
      } else if (sortKey === 'TotalCost') {
        valA = a.costBasisTotal;
        valB = b.costBasisTotal;
      } else if (sortKey === 'Range52Week') {
        valA = a.rangePercent;
        valB = b.rangePercent;
      } else {
        valA = a.ticker;
        valB = b.ticker;
      }

      if (valA === valB) return 0;
      if (typeof valA === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
    });

    // Render sorted list to HTML
    holdingsList.forEach(item => {
      const { ticker, qty, currentPrice, val, costBasisAverage, costBasisTotal, unrealizedGL, totalGLPercent, priceChange, priceChangePercent, todaysGL, percentOfAccount, range, rangePercent } = item;

      const formatChange = (val, isPercent = false, decimals = 2) => {
        if (val === 0) return `<span style="color:var(--text-main);">$0.00</span>`;
        const sign = val > 0 ? '+' : '';
        const symbol = isPercent ? '%' : '';
        const prefix = isPercent ? '' : (val > 0 ? '+$' : '-$');
        const absVal = Math.abs(val);
        return `<span class="${val >= 0 ? 'fidelity-positive' : 'fidelity-negative'}">${prefix}${absVal.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}${symbol}</span>`;
      };

      const formatChangePct = (val) => {
        if (val === 0) return `<span style="color:var(--text-main);">0.00%</span>`;
        const sign = val > 0 ? '+' : '';
        return `<span class="${val >= 0 ? 'fidelity-positive' : 'fidelity-negative'}">${sign}${val.toFixed(2)}%</span>`;
      };

      const rangeBarHtml = `
        <div class="fidelity-range-container">
          <span>$${range.min.toFixed(2)}</span>
          <div class="fidelity-range-track">
            <div class="fidelity-range-marker" style="left: ${rangePercent}%;"></div>
          </div>
          <span>$${range.max.toFixed(2)}</span>
        </div>
      `;

      const nameUpper = (STOCKS[ticker]?.name || '').toUpperCase();

      rowsHtml += `
        <tr>
          <td style="text-align: left;">
            <span style="font-weight: bold; color: var(--text-main); font-size: 0.8rem;">${ticker}</span>
            <span class="fidelity-symbol-desc">${nameUpper}</span>
          </td>
          <td style="font-family: var(--font-mono); font-weight: 500; color: var(--text-main);">$${currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 3})}</td>
          <td style="font-family: var(--font-mono);">${formatChange(priceChange, false, 2)}</td>
          <td style="font-family: var(--font-mono);">${formatChange(todaysGL, false, 2)}</td>
          <td style="font-family: var(--font-mono);">${formatChangePct(priceChangePercent)}</td>
          <td style="font-family: var(--font-mono);">${formatChange(unrealizedGL, false, 2)}</td>
          <td style="font-family: var(--font-mono);">${formatChangePct(totalGLPercent)}</td>
          <td style="font-family: var(--font-mono); font-weight: 500; color: var(--text-main);">$${val.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          <td style="font-family: var(--font-mono); color: var(--text-main);">${percentOfAccount.toFixed(2)}%</td>
          <td style="font-family: var(--font-mono); color: var(--text-main);">${qty.toFixed(3)}</td>
          <td style="font-family: var(--font-mono); color: var(--text-main);">$${costBasisAverage.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          <td style="font-family: var(--font-mono); color: var(--text-main);">$${costBasisTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          <td style="text-align: center; vertical-align: middle;">${rangeBarHtml}</td>
        </tr>
      `;
    });

    // 4. Account Total Row
    const prevPortfolioVal = totalVal - totalTodaysGainLoss;
    const totalTodaysGLPercent = prevPortfolioVal > 0 ? (totalTodaysGainLoss / prevPortfolioVal) * 100 : 0;
    const totalGLPercent = totalStockCostBasis > 0 ? (totalUnrealizedGainLoss / totalStockCostBasis) * 100 : 0;

    const formatTotalChange = (val, isPercent = false, underline = false) => {
      if (val === 0) return `<span style="color:var(--text-main);">$0.00</span>`;
      const sign = val > 0 ? '+' : '';
      const symbol = isPercent ? '%' : '';
      const prefix = isPercent ? '' : (val > 0 ? '+$' : '-$');
      const absVal = Math.abs(val);
      const underlineClass = underline ? 'fidelity-dotted-underline' : '';
      return `<span class="${val >= 0 ? 'fidelity-positive' : 'fidelity-negative'} ${underlineClass}">${prefix}${absVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}${symbol}</span>`;
    };

    const formatTotalChangePct = (val) => {
      if (val === 0) return `<span style="color:var(--text-main);">0.00%</span>`;
      const sign = val > 0 ? '+' : '';
      return `<span class="${val >= 0 ? 'fidelity-positive' : 'fidelity-negative'}">${sign}${val.toFixed(2)}%</span>`;
    };

    rowsHtml += `
      <tr class="fidelity-total-row">
        <td style="text-align: left;">Account total</td>
        <td></td>
        <td></td>
        <td style="font-family: var(--font-mono);">${formatTotalChange(totalTodaysGainLoss, false, true)}</td>
        <td style="font-family: var(--font-mono);">${formatTotalChangePct(totalTodaysGLPercent)}</td>
        <td style="font-family: var(--font-mono);">${formatTotalChange(totalUnrealizedGainLoss, false, false)}</td>
        <td style="font-family: var(--font-mono);">${formatTotalChangePct(totalGLPercent)}</td>
        <td style="font-family: var(--font-mono); font-weight: bold; color: var(--text-main);">$${totalVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    `;

    function getSortIcon(columnKey) {
      if (state.holdingsSortKey !== columnKey) return '⇅';
      return state.holdingsSortDir === 'asc' ? '▲' : '▼';
    }

    const holdingsHtml = `
      <div class="fidelity-table-container">
        <table class="fidelity-table">
          <thead>
            <tr>
              <th style="border-bottom: 2px solid var(--bullish); cursor: pointer; user-select: none;" onclick="sortHoldingsTable('Symbol')">Symbol ${getSortIcon('Symbol')}</th>
              <th style="cursor: pointer; user-select: none;" onclick="sortHoldingsTable('LastPrice')">Last price ${getSortIcon('LastPrice')}</th>
              <th style="cursor: pointer; user-select: none;" onclick="sortHoldingsTable('PriceChange')">Last price change ${getSortIcon('PriceChange')}</th>
              <th style="cursor: pointer; user-select: none;" onclick="sortHoldingsTable('TodaysGL')">Today's gain/loss $ ${getSortIcon('TodaysGL')}</th>
              <th style="cursor: pointer; user-select: none;" onclick="sortHoldingsTable('TodaysGLPct')">Today's gain/loss % ${getSortIcon('TodaysGLPct')}</th>
              <th style="cursor: pointer; user-select: none;" onclick="sortHoldingsTable('TotalGL')">Total gain/loss $ ${getSortIcon('TotalGL')}</th>
              <th style="cursor: pointer; user-select: none;" onclick="sortHoldingsTable('TotalGLPct')">Total gain/loss % ${getSortIcon('TotalGLPct')}</th>
              <th style="cursor: pointer; user-select: none;" onclick="sortHoldingsTable('CurrentVal')">Current value ${getSortIcon('CurrentVal')}</th>
              <th style="cursor: pointer; user-select: none;" onclick="sortHoldingsTable('PercentAccount')">% of account ${getSortIcon('PercentAccount')}</th>
              <th style="cursor: pointer; user-select: none;" onclick="sortHoldingsTable('Qty')">Quantity ${getSortIcon('Qty')}</th>
              <th style="cursor: pointer; user-select: none;" onclick="sortHoldingsTable('AvgCost')">Average cost basis ${getSortIcon('AvgCost')}</th>
              <th style="cursor: pointer; user-select: none;" onclick="sortHoldingsTable('TotalCost')">Cost basis total ${getSortIcon('TotalCost')}</th>
              <th style="cursor: pointer; user-select: none;" onclick="sortHoldingsTable('Range52Week')">52-week range ${getSortIcon('Range52Week')}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
    holdingsContainer.innerHTML = holdingsHtml;
  }
  
  const totalReturn = ((totalVal - 1000000) / 1000000) * 100;
  
  cashValEl.textContent = '$' + state.user.cash.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
  portfolioValEl.textContent = '$' + totalVal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
  
  returnEl.className = `metric-value ${totalReturn >= 0 ? 'bullish' : 'bearish'}`;
  returnEl.innerHTML = `${totalReturn >= 0 ? '▲' : '▼'} ${totalReturn.toFixed(2)}%`;
  
  weekBadge.textContent = state.currentWeek;
  
  // Render Ticker list with current calls
  const tickerContainer = document.getElementById('ticker-list-container');
  if (tickerContainer) {
    const listHtml = Object.keys(STOCKS).filter(t => !state.delistedStocks.includes(t)).map(ticker => {
      const call = AI_FORECASTS[state.currentWeek][ticker];
      const price = prices[ticker];
      const activeClass = state.selectedStock === ticker ? 'active' : '';
      return `
        <div class="stock-row ${activeClass}" data-ticker="${ticker}" onclick="selectStock('${ticker}')">
          <div class="stock-info">
            <span class="stock-ticker">${ticker}</span>
            <span class="stock-name">${STOCKS[ticker].name}</span>
          </div>
          <div style="display:flex; align-items:center; gap: 10px;">
            <span style="font-family: var(--font-mono); font-size: 0.8rem;">$${price.toFixed(2)}</span>
            <span class="stock-call-badge ${call.toLowerCase()}">${call}</span>
          </div>
        </div>
      `;
    }).join('');
    tickerContainer.innerHTML = listHtml;
  }

  renderPendingOrders();
}

// Controller Factor Event Handlers
function toggleFactor(factor, value) {
  if (factor === 'theme') {
    state.theme = value;
    logEvent("THEME_CHANGED", { theme: value });
    if (value === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  } else {
    state.factors[factor] = value;
    logEvent("FACTOR_TOGGLED", { factor, newValue: value });
  }
  
  // Style active button in side-panel
  const group = document.getElementById(`btn-group-${factor}`);
  if (group) {
    group.querySelectorAll('.btn-pill').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.val === String(value)) btn.classList.add('active');
    });
  }
  
  // Re-render UI segments that depend on factors
  renderActiveReport();
  updateLeaderboard();
  renderEmailContent();
  drawCharts();
}

function switchTab(tabId) {
  state.activeTab = tabId;
  
  // Toggle buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.tab === tabId) btn.classList.add('active');
  });
  
  // Toggle content divs
  document.querySelectorAll('.tab-content').forEach(div => {
    div.classList.remove('active');
    if (div.id === `tab-${tabId}`) div.classList.add('active');
  });
  
  logEvent("TAB_SWITCHED", { tabId });
  
  if (tabId === 'leaderboard') updateLeaderboard();
  if (tabId === 'ticker-chart') drawStockPriceChart(state.selectedStock);
  if (tabId === 'portfolio') { updateDashboard(); drawCharts(); }
  if (tabId === 'orders') renderOrdersTab();
}

// Collapsible-panel toggle: flips a `collapsed` class and the button glyph.
function bindPanelToggle(btnId, panelSelector, label) {
  const btn = document.getElementById(btnId);
  const panel = document.querySelector(panelSelector);
  if (!btn || !panel) return;
  btn.onclick = () => {
    const collapsed = panel.classList.toggle('collapsed');
    btn.textContent = collapsed ? '+' : '−';
    btn.title = collapsed ? `Expand ${label.toLowerCase()}` : `Minimize ${label.toLowerCase()}`;
    logEvent("PANEL_TOGGLED", { panel: label, state: collapsed ? "minimized" : "expanded" });
  };
}

// Initialize on Load
window.onload = () => {
  // Bind UI inputs
  document.getElementById('btn-survey-next').onclick = handleSurveyNext;
  document.getElementById('btn-survey-prev').onclick = handleSurveyPrev;
  const skipBtn = document.getElementById('btn-survey-skip');
  if (skipBtn) skipBtn.onclick = skipSurvey;
  
  // Bind buy/sell buttons — submit a deferred order (executes at market close)
  document.querySelector('.btn-buy').onclick = () => submitOrder('BUY');
  document.querySelector('.btn-sell').onclick = () => submitOrder('SELL');
  const marketCloseBtn = document.getElementById('btn-market-close-el');
  if (marketCloseBtn) marketCloseBtn.onclick = runMarketClose;
  
  // Bind Chatbot send and thread selectors
  document.getElementById('btn-chat-send-el').onclick = sendChatMessage;
  document.getElementById('chat-input-text').onkeydown = (e) => {
    if (e.key === 'Enter') sendChatMessage();
  };
  
  const threadSelect = document.getElementById('chat-thread-select');
  if (threadSelect) {
    threadSelect.onchange = (e) => {
      const ticker = state.selectedStock;
      state.activeChatThreadId[ticker] = e.target.value;
      renderChatMessages();
      logEvent("CHATBOT_THREAD_SWITCHED", { ticker, threadId: e.target.value });
    };
  }
  
  const newThreadBtn = document.getElementById('btn-new-thread');
  if (newThreadBtn) {
    newThreadBtn.onclick = () => {
      const ticker = state.selectedStock;
      createNewChatThread(ticker);
      updateChatHistory();
    };
  }
  
  // Bind rebalance button
  document.getElementById('btn-rebalance-el').onclick = executeRebalance;
  
  // Bind advance week and reset
  document.getElementById('btn-advance-week-el').onclick = advanceWeek;
  document.getElementById('btn-reset-el').onclick = resetPlatform;

  // Bind collapsible panels (chatbot + behavioral logs)
  bindPanelToggle('btn-toggle-chatbot', '.chatbot-panel', 'Chatbot');
  bindPanelToggle('btn-toggle-logger', '.logger-panel', 'Behavioral logs');

  // Bind demo-controller collapse / restore
  const appContainer = document.querySelector('.app-container');
  const collapseBtn = document.getElementById('btn-collapse-sidebar');
  const showBtn = document.getElementById('btn-show-sidebar');
  if (collapseBtn && appContainer) collapseBtn.onclick = () => appContainer.classList.add('sidebar-collapsed');
  if (showBtn && appContainer) showBtn.onclick = () => appContainer.classList.remove('sidebar-collapsed');
  
  // Bind corporate action banner close button
  const closeBannerBtn = document.getElementById('btn-close-corporate-banner');
  if (closeBannerBtn) {
    closeBannerBtn.onclick = () => {
      const banner = document.getElementById('corporate-action-banner');
      if (banner) banner.style.display = 'none';
    };
  }
  
  // Bind certificate share button
  const shareCertBtn = document.getElementById('btn-cert-share');
  if (shareCertBtn) {
    shareCertBtn.onclick = () => {
      alert("Stevens Lab Link Copied! Sharing simulated pseudonymous research metrics.");
      logEvent("CERTIFICATE_SHARED", { activeWeeks: Object.keys(state.activeWeeksTracker).filter(w => state.activeWeeksTracker[w]).length });
    };
  }
  
  // Bind factor switches (scientific A/B factors + demo controller toggles)
  document.querySelectorAll('.btn-pill-group').forEach(group => {
    const factor = group.id.replace('btn-group-', '');
    group.querySelectorAll('.btn-pill').forEach(btn => {
      btn.onclick = () => {
        let val = btn.dataset.val;
        if (val === 'true') val = true;
        if (val === 'false') val = false;
        toggleFactor(factor, val);
      };
    });
  });
  
  // Bind Tab switching
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.onclick = () => switchTab(btn.dataset.tab);
  });
  
  logEvent("SYSTEM_INITIALIZED", { version: "2.0-demo", universe: "Nasdaq-100 Curated" });

  // Trigger onboarding survey at startup
  initSurveyModal();
};
