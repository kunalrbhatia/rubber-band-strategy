# RSI Algo — Blueprint

## Strategy Overview

**RSI Mean Reversion — Options Premium Selling** — A daily intraday options selling strategy on Nifty 50 index.
Every 5 minutes during market hours, compute the 14-period RSI on the Nifty 50 spot using 5-minute candles.

- When RSI **≤ 20** (oversold): **Sell ATM Put** — market is oversold, expect mean reversion upward, put premiums elevated.
- When RSI **≥ 80** (overbought): **Sell ATM Call** — market is overbought, expect mean reversion downward, call premiums elevated.

Target the **current week's nearest expiry**. Each trade is a **credit spread** (not a naked sell):

- **Leg 1 — Sell ATM option** (PE for oversold, CE for overbought) — collects premium, uses margin.
- **Leg 2 — Buy far OTM option** (same type, same expiry, 300–500 points away from ATM) — reduces
  margin requirement significantly and caps maximum loss. Both legs placed simultaneously as a spread.

Hold the position until one of these exits fires:

| Exit Condition | Trigger | Action |
|---|---|---|
| **Target hit** | MTM profit ≥ 1.5% of used margin | Exit both legs at market |
| **SL hit** | MTM loss ≥ 1.5% of used margin | Exit both legs at market |
| **EOD** | 3:25 PM IST | Exit both legs at market regardless of P&L |

Only one spread trade is live at a time. No re-entry after SL hit on the same day.
Paper trading mode stores all trades and P&L in a local JSON file.

---

## Project Stack

| Concern | Choice |
|---|---|
| Runtime | Node.js >= 20 LTS |
| Language | TypeScript (strict), ES modules (`import`/`export`) |
| Package manager | pnpm |
| Framework | Express (HTTP server + health check endpoint only) |
| Broker | Angel One SmartAPI |
| TOTP | `otplib@^13.x` — TypeScript-first, async-native |
| Scheduling | `node-cron` |
| WebSocket | `ws@^8.x` — Angel One SmartAPI WebSocket for real-time LTP ticks |
| Logging | Winston (daily files, IST timestamps, `Asia/Kolkata`) |
| Notifications | Telegram (send only) |
| Paper Trading | Local JSON file (`data/paper-trades.json`) |
| Testing | Jest + ts-jest, 100% coverage enforced |
| Linting | ESLint + Prettier |
| Pre-commit | Husky + lint-staged |
| Process manager | PM2 (Oracle Cloud Free Tier) |
| Env | `.env` via `dotenv` |

---

## Project Structure

```
rsi-algo/
├── .github/
│   └── workflows/
│       ├── ci.yml                      # Typecheck → lint → prettier → test → build
│       └── deploy.yml                  # SSH deploy to Oracle Cloud on CI pass
├── src/
│   ├── server.ts                       # Express app + health route + graceful shutdown
│   ├── config/
│   │   └── env.ts                      # dotenv validation + typed config export
│   ├── store/
│   │   ├── sessionStore.ts             # Singleton: jwtToken, feedToken, refreshToken
│   │   ├── scripMasterStore.ts         # Singleton: in-memory NFO scrip master array
│   │   └── tradeStore.ts               # Singleton: active trade state + SL tracking
│   ├── helpers/
│   │   ├── constants.ts                # Angel One API URLs, Nifty token, timing constants
│   │   ├── api.ts                      # Generic axios GET/POST wrappers with auth headers
│   │   ├── login.ts                    # TOTP generation + SmartAPI session login
│   │   ├── holidayCheck.ts             # NSE holiday API check + weekend check
│   │   ├── scripMaster.ts              # Download + parse Angel One scrip master JSON
│   │   ├── scripMasterCache.ts         # Disk cache for scrip master (data/scrip-master-cache.json, TTL 1 day)
│   │   ├── marketData.ts               # getCandles (5-min OHLC), getLtp, getNiftySpot
│   │   ├── rsi.ts                      # RSI-14 calculation (Wilder's smoothing — mirrors Pine Script)
│   │   ├── optionChain.ts              # getAtmStrike, getNearestExpiry, findOptionToken, getFarOtmStrike
│   │   ├── marginCalc.ts               # getUsedMargin via Angel One API, compute target/SL in rupees
│   │   ├── orders.ts                   # placeSpread, exitSpread (paper + live modes)
│   │   ├── slMonitor.ts                # WebSocket LTP monitor — tracks spread MTM, fires target/SL exit
│   │   └── logger.ts                   # Winston: console + daily file (logs/rsi-YYYY-MM-DD.log)
│   ├── jobs/
│   │   ├── rsiScanner.ts               # Every 5-min job: fetch candles → compute RSI → check signal
│   │   └── eodSquareOff.ts             # 3:25 PM job: exit any open position at market
│   ├── paper/
│   │   ├── paperTrader.ts              # Paper order executor — writes to JSON file, no API calls
│   │   └── paperStore.ts               # Read/write data/paper-trades.json (atomic JSON updates)
│   ├── notifier.ts                     # Telegram sendMessage wrapper
│   └── main.ts                         # Entry point: holiday check → login → scrip master → start jobs
├── __tests__/
│   ├── helpers/
│   │   ├── login.test.ts
│   │   ├── holidayCheck.test.ts
│   │   ├── marketData.test.ts
│   │   ├── rsi.test.ts
│   │   ├── optionChain.test.ts
│   │   ├── marginCalc.test.ts
│   │   ├── scripMasterCache.test.ts
│   │   ├── orders.test.ts
│   │   └── slMonitor.test.ts
│   ├── jobs/
│   │   ├── rsiScanner.test.ts
│   │   └── eodSquareOff.test.ts
│   ├── paper/
│   │   ├── paperTrader.test.ts
│   │   └── paperStore.test.ts
│   └── store/
│       ├── sessionStore.test.ts
│       ├── scripMasterStore.test.ts
│       └── tradeStore.test.ts
├── __mocks__/
│   └── axios.ts                        # Auto-mock for axios
├── data/
│   ├── paper-trades.json               # Paper trade ledger (gitignored, auto-created on first run)
│   └── scrip-master-cache.json         # Scrip master disk cache (gitignored, TTL 1 calendar day)
├── logs/                               # Winston daily log files (gitignored)
├── dist/                               # Compiled JS output (gitignored)
├── .env                                # Local env (gitignored)
├── .env.example                        # Template committed to repo
├── .eslintrc.json
├── .prettierrc
├── .prettierignore
├── .gitignore
├── tsconfig.json
├── tsconfig.build.json                 # Excludes __tests__ for production build
├── jest.config.ts
├── ecosystem.config.js                 # PM2 config
├── CLAUDE.md                           # AI assistant instructions
├── package.json
└── README.md
```

---

## Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# SmartAPI credentials
API_KEY=
CLIENT_CODE=
CLIENT_PIN=
CLIENT_TOTP_PIN=        # 16-character TOTP secret from Angel One app setup

# Strategy mode
PAPER_TRADING=true      # Set to false to go live

# Telegram notifications
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

---

## Module Specifications

### `src/main.ts`

Startup sequence (runs once at boot, then cron takes over):

```
1. Load + validate env (config/env.ts)
2. Check if today is NSE trading day (holidayCheck.ts)
   → If holiday/weekend: log + notify Telegram "Today is NSE holiday, RSI algo not running" → process.exit(0)
3. Login to SmartAPI (login.ts) → store session in sessionStore
4. Load scrip master via cache (scripMasterCache.ts):
   → If data/scrip-master-cache.json exists AND cachedDate === today (IST): load from disk → scripMasterStore
   → Else: download fresh from Angel One → write to disk cache → scripMasterStore
5. Connect Angel One WebSocket (slMonitor.ts) — stays alive for real-time spread MTM tracking
6. Register cron jobs:
   - rsiScanner:     every 5 mins from 09:20 AM to 03:20 PM IST (Mon–Fri)
   - eodSquareOff:   '25 15 * * 1-5'  (3:25 PM IST, Mon–Fri)
7. Start Express server: GET /health
```

---

### `src/config/env.ts`

Validates all required env vars at startup. Throws `Error` if any are missing. Exports a typed
`config` object — no `process.env` access anywhere else in the codebase.

```typescript
export interface Config {
  port: number;
  nodeEnv: string;
  apiKey: string;
  clientCode: string;
  clientPin: string;
  clientTotpPin: string;
  paperTrading: boolean;
  telegramBotToken: string;
  telegramChatId: string;
}
```

---

### `src/helpers/rsi.ts`

Mirrors the Pine Script RSI calculation exactly — Wilder's Smoothing (RMA), 14-period, source = close.

```typescript
export interface Candle {
  timestamp: string;   // ISO string, IST
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Compute RSI using Wilder's smoothing (RMA) — identical to Pine Script ta.rma()
// Requires minimum (rsiLength * 2) candles for reliable seeding
// Returns: number (RSI value, 0–100) or null if insufficient data
export function calculateRsi(candles: Candle[], length = 14): number | null

// Internal: compute RMA (Wilder's Moving Average) of a series
// RMA(t) = ((length - 1) * RMA(t-1) + value(t)) / length
function rma(values: number[], length: number): number[]
```

**RSI Formula (step by step):**
```
delta(t)   = close(t) - close(t-1)
gain(t)    = delta > 0 ? delta : 0
loss(t)    = delta < 0 ? abs(delta) : 0
avgGain    = rma(gains, 14)
avgLoss    = rma(losses, 14)
RS         = avgLoss === 0 ? 100 : avgGain / avgLoss
RSI        = 100 - (100 / (1 + RS))
```

Signal thresholds:
- RSI ≤ 20 → `OVERSOLD` → Sell ATM Put
- RSI ≥ 80 → `OVERBOUGHT` → Sell ATM Call
- 20 < RSI < 80 → `NEUTRAL` → No action

---

### `src/helpers/scripMaster.ts`

Downloads and parses the Angel One scrip master JSON. Called only by `scripMasterCache.ts` — never
called directly from `main.ts`.

```typescript
// Download from:
// https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json
// Filter to NFO exchange only (reduces array from ~80k to ~15k records)
// Returns: ScripRecord[]
```

---

### `src/helpers/scripMasterCache.ts`

Disk cache layer for the scrip master. Prevents redundant downloads on process restarts within
the same trading day.

```typescript
export interface ScripMasterCacheFile {
  cachedDate: string;      // 'YYYY-MM-DD' in IST — date the cache was written
  records: ScripRecord[];  // Filtered NFO records
}

// loadScripMaster(): Promise<ScripRecord[]>
//   1. Check if data/scrip-master-cache.json exists
//   2. If exists: parse file → check cachedDate === today (IST, 'YYYY-MM-DD')
//      → CACHE HIT:  log "Scrip master loaded from cache ({{count}} records)" → return records
//      → CACHE MISS: cachedDate is stale (yesterday or older) → fall through to download
//   3. If missing OR stale:
//      → call scripMaster.ts to download fresh data
//      → write { cachedDate: todayIST, records } to data/scrip-master-cache.json (atomic write)
//      → log "Scrip master downloaded + cached ({{count}} records)"
//      → return records
//   4. Store records in scripMasterStore singleton

// isCacheValid(cacheFile: ScripMasterCacheFile): boolean
//   Returns true if cacheFile.cachedDate === today in Asia/Kolkata timezone
//   Uses date-fns-tz or Intl.DateTimeFormat — never raw Date comparison
```

**Cache file location:** `data/scrip-master-cache.json` (gitignored, auto-created)

**TTL logic:** The cache is valid for the entire calendar day (IST). Any restart between
09:00 AM and 11:59 PM on the same day reuses the cached file without an HTTP request.
At midnight (or on first run of a new trading day), the stale cache is overwritten.

**Why not in-memory only?** In-memory cache is lost on process crash or PM2 restart.
Disk cache survives restarts, which is the entire point — scrip master is ~5MB and takes
2–4 seconds to download. On volatile mornings, a crash-restart must not introduce that delay.

---

**`getNiftySpot()`** — fetch live Nifty 50 index spot price:
```typescript
// Angel One token for Nifty 50 index: 99926000 (NSE exchange)
// POST market/v1/quote/ with mode='LTP', exchangeTokens: { NSE: ['99926000'] }
// Returns: number (Nifty spot LTP)
```

**`getCandles(token, exchange, interval, fromDate, toDate)`** — fetch OHLC candles:
```typescript
// POST https://apiconnect.angelone.in/rest/secure/angelbroking/historical/v1/getCandleData
// interval: 'FIVE_MINUTE'
// fromDate: today 09:00 AM IST (ISO format)
// toDate:   now (ISO format)
// Returns: Candle[]  (sorted oldest → newest)
// Nifty 50 token for candles: '99926000', exchange: 'NSE'
```

**`getLtp(symbolToken, exchange)`** — single LTP for any instrument:
```typescript
// POST market/v1/quote/ with mode='LTP'
// Returns: number
```

---

### `src/helpers/optionChain.ts`

**`getNearestExpiry()`** — resolve current week's Thursday expiry:
```typescript
// Nifty weekly options expire every Thursday
// If today is Thursday after 3:30 PM, roll to next Thursday
// Returns: string in 'DDMMMYYYY' format e.g. '22MAY2025'
// Note: Angel One scrip master uses this exact format in the symbol name
```

**`getAtmStrike(spot)`** — round Nifty spot to nearest 50:
```typescript
// Nifty strikes are in multiples of 50
// ATM = Math.round(spot / 50) * 50
// Returns: number e.g. spot=24367 → ATM=24350
```

**`getFarOtmStrike(atmStrike, optionType)`** — compute the far OTM hedge leg strike:
```typescript
// optionType: 'CE' | 'PE'
// For PE spread: hedge strike = atmStrike - 400  (400 points below ATM)
// For CE spread: hedge strike = atmStrike + 400  (400 points above ATM)
// 400 points = 8 strikes away at ×50 intervals — deep OTM, cheap premium, meaningful margin relief
// Returns: number  e.g. ATM=24350 PE → hedgeStrike=23950
// Note: offset (400) should be a named constant in constants.ts: HEDGE_OFFSET = 400
```

**`findOptionToken(strike, expiry, optionType)`** — look up symbol token from scrip master:
```typescript
// optionType: 'CE' | 'PE'
// Search scripMasterStore for NFO instrument where:
//   symbol matches pattern: 'NIFTY{expiry}{strike}{optionType}'
//   e.g. 'NIFTY22MAY202524350PE'
// Returns: { symbolToken: string; tradingSymbol: string; lotSize: number }
// Throws if not found (expiry/strike not available yet)
```

---

### `src/store/tradeStore.ts`

Singleton that holds the state of the current live (or paper) spread trade.

```typescript
export interface SpreadLeg {
  tradingSymbol: string;      // e.g. 'NIFTY22MAY202524350PE'
  symbolToken: string;
  action: 'SELL' | 'BUY';    // Leg 1 = SELL ATM, Leg 2 = BUY far OTM
  strike: number;
  entryPremium: number;       // LTP at time of entry
  currentPremium: number;     // Updated in real-time via WebSocket
}

export interface ActiveTrade {
  id: string;                   // UUID generated at entry
  entryTime: string;            // ISO string, IST
  underlying: 'NIFTY';
  optionType: 'CE' | 'PE';      // CE for overbought, PE for oversold
  expiry: string;               // 'DDMMMYYYY'
  lotSize: number;
  quantity: number;             // 1 lot always (lotSize × 1)

  // Spread legs
  sellLeg: SpreadLeg;           // ATM sell (Leg 1)
  buyLeg: SpreadLeg;            // Far OTM buy / hedge (Leg 2)

  // Net credit = sellLeg.entryPremium - buyLeg.entryPremium
  netCreditAtEntry: number;

  // Margin
  usedMargin: number;           // Fetched from Angel One after spread is placed (getUsedMargin)
  targetPnl: number;            // +1.5% of usedMargin  (profit exit threshold)
  slPnl: number;                // -1.5% of usedMargin  (loss exit threshold, stored as negative)

  rsiAtEntry: number;           // RSI value that triggered the trade
  mode: 'PAPER' | 'LIVE';
}

export interface TradeStore {
  activeTrade: ActiveTrade | null;
  setActiveTrade(trade: ActiveTrade): void;
  clearActiveTrade(): void;
  hasActiveTrade(): boolean;
}
```

---

### `src/helpers/marginCalc.ts`

Fetches the actual margin blocked by the broker after spread entry and computes rupee thresholds.

```typescript
// getUsedMargin(): Promise<number>
//   POST https://apiconnect.angelone.in/rest/secure/angelbroking/user/v1/getRMS
//   Parse response: utilisedAmount (total margin currently blocked across all positions)
//   Returns: number (rupees)
//   Called ONCE immediately after spread entry — margin is now locked for this position

// computeThresholds(usedMargin: number): { targetPnl: number; slPnl: number }
//   targetPnl = +(usedMargin × 0.015)   e.g. ₹50,000 margin → target = +₹750
//   slPnl     = -(usedMargin × 0.015)   e.g. ₹50,000 margin → SL     = -₹750
//   Returns both as rupee values (targetPnl positive, slPnl negative)
```

**Why fetch margin after entry (not before)?**
Angel One's margin API returns utilisedAmount which reflects the actual blocked margin
for a spread position — this is lower than a naked sell due to the hedge leg offsetting
exposure. The exact value is only known post-execution, so we fetch it after both legs fill.

---

### `src/helpers/slMonitor.ts`

Uses Angel One WebSocket to stream real-time LTP ticks for **both spread legs**.
Fires an immediate exit when target or SL threshold is breached.

```typescript
// Angel One SmartAPI WebSocket v2:
// wss://smartapisocket.angelone.in/smart-stream
//
// subscribe(sellToken, buyToken): void
//   Subscribe to both leg tokens simultaneously (mode 1 = LTP only)
//   Heartbeat ping every 30 seconds to keep connection alive
//
// On each tick (for either leg):
//   Update the matching leg's currentPremium in tradeStore.activeTrade
//
//   Compute spread MTM on every tick:
//   currentNetCredit = sellLeg.currentPremium - buyLeg.currentPremium
//   spreadMtm        = (netCreditAtEntry - currentNetCredit) × lotSize
//   → Positive spreadMtm = profit (spread narrowed, we keep more credit)
//   → Negative spreadMtm = loss   (spread widened, costs more to close)
//
//   TARGET check: if spreadMtm >= activeTrade.targetPnl → triggerTargetExit()
//   SL check:     if spreadMtm <= activeTrade.slPnl     → triggerSlExit()
//
// triggerTargetExit():
//   1. Unsubscribe both tokens
//   2. Call orders.exitSpread(trade, 'TARGET')
//   3. Log + notify Telegram: "TARGET HIT — {spread} — Profit: ₹{spreadMtm}"
//   4. tradeStore.clearActiveTrade()
//   (Re-entry IS allowed after target hit — only SL hit blocks re-entry)
//
// triggerSlExit():
//   1. Unsubscribe both tokens
//   2. Call orders.exitSpread(trade, 'SL_HIT')
//   3. Log + notify Telegram: "SL HIT — {spread} — Loss: ₹{spreadMtm}"
//   4. tradeStore.clearActiveTrade()
//   5. Set dailySLHit = true (block re-entry for the day)
//
// unsubscribe(): void  — called by eodSquareOff before market exit
// On disconnect: attempt reconnect with exponential backoff (max 5 retries)
```

---

### `src/jobs/rsiScanner.ts`

Core strategy loop — runs every 5 minutes from 09:20 AM to 03:20 PM IST.

```
1. Check tradeStore.hasActiveTrade() → if true, skip (slMonitor handles the open spread)
2. Check dailySLHit flag → if true, skip (no re-entry after SL on same day)
3. Fetch 5-min candles for Nifty 50 from 09:15 AM today to now (marketData.getCandles)
4. Validate: need at least 28 candles (14 × 2 for Wilder's seeding)
   → If insufficient: log "Not enough candles yet" and return
5. Calculate RSI-14 (rsi.calculateRsi)
6. Log current RSI value
7. Evaluate signal:
   ─ RSI ≤ 20 (OVERSOLD):
       a. Get Nifty spot (getNiftySpot)
       b. Get ATM strike (getAtmStrike) → e.g. 24200 PE
       c. Get far OTM strike (getFarOtmStrike, 'PE') → e.g. 23800 PE (ATM - 400)
       d. Get nearest Thursday expiry (getNearestExpiry)
       e. Find sell leg token (findOptionToken atmStrike, expiry, 'PE')
       f. Find buy leg token  (findOptionToken hedgeStrike, expiry, 'PE')
       g. Get LTPs for both legs (getLtp × 2)
       h. Compute netCreditAtEntry = sellLTP - buyLTP
       i. Execute spread (orders.placeSpread — paper or live):
            Leg 1: SELL ATM PE @ market
            Leg 2: BUY  OTM PE @ market
       j. Fetch used margin post-fill (marginCalc.getUsedMargin)
       k. Compute targetPnl = +1.5% of usedMargin, slPnl = -1.5% of usedMargin
       l. Build ActiveTrade, set in tradeStore
       m. Subscribe WebSocket for both legs (slMonitor.subscribe)
       n. Notify Telegram entry message

   ─ RSI ≥ 80 (OVERBOUGHT):
       a–n same as above but:
         Sell ATM CE, Buy OTM CE (ATM + 400)

   ─ 20 < RSI < 80: log RSI value, no action
```

---

### `src/jobs/eodSquareOff.ts`

Runs once at 3:25 PM IST. Exits both spread legs for any open position regardless of P&L.

```
1. Check tradeStore.hasActiveTrade() → if no trade, log "No open position at EOD" and return
2. Unsubscribe WebSocket SL monitor (slMonitor.unsubscribe)
3. Get current LTPs of both legs (getLtp × 2)
4. Execute spread exit (orders.exitSpread, reason: 'EOD'):
     Leg 1: BUY  back ATM PE/CE @ market  (close the sell leg)
     Leg 2: SELL back OTM PE/CE @ market  (close the buy/hedge leg)
5. Calculate final P&L:
   exitNetCredit = sellLeg.exitPremium - buyLeg.exitPremium
   pnl = (netCreditAtEntry - exitNetCredit) × lotSize
   → Positive = profit (spread narrowed), Negative = loss (spread widened)
6. Write to paper store (if PAPER mode)
7. tradeStore.clearActiveTrade()
8. Notify Telegram EOD message with P&L
```

---

### `src/paper/paperTrader.ts`

Simulates spread order execution without hitting the broker API. Used when `PAPER_TRADING=true`.

```typescript
// paperPlaceSpread(trade: ActiveTrade): Promise<void>
//   - Fetch real LTPs for both legs via getLtp (uses live market data for realism)
//   - Set sellLeg.entryPremium and buyLeg.entryPremium from real LTPs
//   - Compute netCreditAtEntry = sellLTP - buyLTP
//   - Simulate usedMargin: use a fixed estimate (e.g. ₹45,000 per lot for a 400-pt spread)
//     Note: real margin API requires a live order — paper mode uses a constant defined in constants.ts
//   - Compute targetPnl = +usedMargin × 0.015, slPnl = -usedMargin × 0.015
//   - Write new trade record to paperStore with status = 'OPEN'
//   - Log: "[PAPER] SPREAD SELL {sellSymbol} / BUY {buySymbol} | Net credit: ₹{netCredit}/unit"

// paperExitSpread(trade: ActiveTrade, reason: 'TARGET' | 'SL_HIT' | 'EOD'): Promise<PaperTradeResult>
//   - Fetch real LTPs for both legs at exit time (live market data)
//   - exitNetCredit = sellLeg.exitPremium - buyLeg.exitPremium
//   - pnl = (netCreditAtEntry - exitNetCredit) × lotSize
//   - Update trade record in paperStore: status = 'CLOSED', exitTime, pnl, reason
//   - Log: "[PAPER] EXIT spread | P&L: ₹{pnl} | Reason: {reason}"
//   - Returns: PaperTradeResult
```

---

### `src/paper/paperStore.ts`

Reads and writes `data/paper-trades.json`. All writes are atomic (write to temp file, then rename).

```typescript
export interface PaperTrade {
  id: string;
  date: string;                 // 'YYYY-MM-DD' IST
  entryTime: string;            // ISO string IST
  exitTime: string | null;
  underlying: 'NIFTY';
  optionType: 'CE' | 'PE';
  expiry: string;
  lotSize: number;
  quantity: number;

  // Spread legs
  sellSymbol: string;           // ATM sell leg trading symbol
  sellStrike: number;
  sellEntryPremium: number;
  sellExitPremium: number | null;

  buySymbol: string;            // Far OTM buy/hedge leg trading symbol
  buyStrike: number;
  buyEntryPremium: number;
  buyExitPremium: number | null;

  netCreditAtEntry: number;     // sellEntryPremium - buyEntryPremium
  netCreditAtExit: number | null;

  // Margin and thresholds
  usedMargin: number;           // Actual (live) or estimated (paper)
  targetPnl: number;            // +1.5% of usedMargin
  slPnl: number;                // -1.5% of usedMargin (stored as negative)

  rsiAtEntry: number;
  status: 'OPEN' | 'CLOSED';
  exitReason: 'TARGET' | 'SL_HIT' | 'EOD' | null;
  pnl: number | null;           // (netCreditAtEntry - netCreditAtExit) × lotSize
}

export interface PaperStore {
  trades: PaperTrade[];
  summary: {
    totalTrades: number;
    winners: number;
    losers: number;
    totalPnl: number;
    avgPnl: number;
  };
}

// getAllTrades(): PaperTrade[]
// getTradeById(id): PaperTrade | null
// addTrade(trade): void
// updateTrade(id, updates): void
// getSummary(): PaperStore['summary']   ← recomputed from trades array on every call
```

**JSON file format (`data/paper-trades.json`):**
```json
{
  "trades": [
    {
      "id": "uuid-v4",
      "date": "2025-05-22",
      "entryTime": "2025-05-22T05:40:00.000Z",
      "exitTime": "2025-05-22T08:05:00.000Z",
      "underlying": "NIFTY",
      "optionType": "PE",
      "expiry": "22MAY2025",
      "lotSize": 75,
      "quantity": 75,
      "sellSymbol": "NIFTY22MAY202524200PE",
      "sellStrike": 24200,
      "sellEntryPremium": 135.40,
      "sellExitPremium": 158.20,
      "buySymbol": "NIFTY22MAY202523800PE",
      "buyStrike": 23800,
      "buyEntryPremium": 28.50,
      "buyExitPremium": 35.10,
      "netCreditAtEntry": 106.90,
      "netCreditAtExit": 123.10,
      "usedMargin": 46500.00,
      "targetPnl": 697.50,
      "slPnl": -697.50,
      "rsiAtEntry": 17.80,
      "status": "CLOSED",
      "exitReason": "SL_HIT",
      "pnl": -1215.00
    }
  ]
}
```

---

### `src/helpers/orders.ts`

Routes order execution to paper or live mode based on `config.paperTrading` flag.
All spread operations send **two orders** — both legs must be handled atomically (or as close as possible).

```typescript
// placeSpread(trade: ActiveTrade): Promise<void>
//   if PAPER_TRADING → paperTrader.paperPlaceSpread(trade)
//   else →
//     Order 1: POST /order/v1/placeOrder { transactiontype: 'SELL', symbol: sellLeg, ordertype: 'MARKET' }
//     Order 2: POST /order/v1/placeOrder { transactiontype: 'BUY',  symbol: buyLeg,  ordertype: 'MARKET' }
//     If Order 1 succeeds but Order 2 fails: log critical error + notify Telegram + attempt Order 2 retry
//     Angel One does not support basket/spread orders via SmartAPI — legs are placed sequentially

// exitSpread(trade: ActiveTrade, reason: 'TARGET' | 'SL_HIT' | 'EOD'): Promise<void>
//   if PAPER_TRADING → paperTrader.paperExitSpread(trade, reason)
//   else →
//     Order 1: POST /order/v1/placeOrder { transactiontype: 'BUY',  symbol: sellLeg, ordertype: 'MARKET' }
//     Order 2: POST /order/v1/placeOrder { transactiontype: 'SELL', symbol: buyLeg,  ordertype: 'MARKET' }
//     Same partial-fill guard as above
```

---

## Target & SL Calculation

Both target and SL are **1.5% of the used margin** — calculated after spread entry when actual
blocked margin is known.

```
Entry:
  Spread: Sell NIFTY 24200 PE @ ₹135.40 / Buy NIFTY 23800 PE @ ₹28.50
  Net credit per unit = 135.40 - 28.50 = ₹106.90
  Lot size = 75
  Total credit collected = 106.90 × 75 = ₹8,017.50

  Used margin (fetched post-fill) = ₹46,500
  Target  = +1.5% × 46,500 = +₹697.50   → spread must tighten to collect this
  SL      = -1.5% × 46,500 = -₹697.50   → spread must widen past this to exit

Spread MTM calculation (on every WebSocket tick):
  currentNetCredit = sellLeg.currentPremium - buyLeg.currentPremium
  spreadMtm        = (netCreditAtEntry - currentNetCredit) × lotSize
                   = (106.90 - currentNetCredit) × 75

  spreadMtm > 0  → profit (spread narrowed — good for us as sellers)
  spreadMtm < 0  → loss   (spread widened — bad for us)

Target exit triggered when:
  spreadMtm >= +₹697.50
  e.g. currentNetCredit = 97.60 → (106.90 - 97.60) × 75 = ₹697.50 ✅

SL exit triggered when:
  spreadMtm <= -₹697.50
  e.g. currentNetCredit = 116.22 → (106.90 - 116.22) × 75 = -₹699.00 ✅
```

Note: Actual fills may differ slightly from threshold due to WebSocket tick latency and
market impact on closing both legs. The WebSocket-based monitor is preferred over an
exchange SL order because the SL is on the **spread MTM** (net of two legs), not on a
single option premium — exchange orders cannot monitor net spread value.

---

## Data Flow Diagram

```
09:15 AM IST — Market opens
      │
      ▼
  main.ts boots
  ├── holidayCheck → exit if holiday
  ├── login → sessionStore
  ├── scripMasterCache.loadScripMaster()
  │     ├── CACHE HIT  (same day): load from data/scrip-master-cache.json → scripMasterStore
  │     └── CACHE MISS (stale/missing): download fresh → write cache → scripMasterStore
  └── WebSocket connect (slMonitor — idle until trade entry)
      │
      ▼
  Every 5 mins → rsiScanner.ts
  ├── getCandles(NIFTY, FIVE_MINUTE)
  ├── calculateRsi(candles, 14)
  │
  ├── RSI ≤ 20? ──────────────────────────────────────────┐
  │   ├── getAtmStrike + getFarOtmStrike (ATM - 400)       │
  │   ├── findOptionToken × 2 (sell PE + buy PE)           │ OVERSOLD
  │   ├── placeSpread (SELL ATM PE / BUY OTM PE)           │ credit spread
  │   ├── getUsedMargin → compute target (+1.5%) + SL (-1.5%)│
  │   └── slMonitor.subscribe(sellToken, buyToken)         │
  │                                                        │
  ├── RSI ≥ 80? ──────────────────────────────────────────┤
  │   ├── getAtmStrike + getFarOtmStrike (ATM + 400)       │
  │   ├── findOptionToken × 2 (sell CE + buy CE)           │ OVERBOUGHT
  │   ├── placeSpread (SELL ATM CE / BUY OTM CE)           │ credit spread
  │   ├── getUsedMargin → compute target (+1.5%) + SL (-1.5%)│
  │   └── slMonitor.subscribe(sellToken, buyToken)         │
  │                                                        │
  └── 20 < RSI < 80 → log, no action                      │
                                                           │
  WebSocket tick stream (both legs) ◄────────────────────-┘
  ├── Update currentPremium for each leg in tradeStore
  ├── Compute spreadMtm = (netCreditAtEntry - currentNetCredit) × lotSize
  ├── spreadMtm >= targetPnl (+1.5% margin)?
  │   └── YES → exitSpread(TARGET) → notify Telegram → clearActiveTrade
  ├── spreadMtm <= slPnl (-1.5% margin)?
  │   └── YES → exitSpread(SL_HIT) → notify Telegram → clearActiveTrade → dailySLHit=true
  └── NO  → continue monitoring
  │
3:25 PM → eodSquareOff.ts
  ├── hasActiveTrade? → exitSpread(EOD) → notify Telegram → clearActiveTrade
  └── No trade? → log "No open position at EOD"
```

---

## Telegram Notification Messages

| Event | Message |
|---|---|
| Holiday/Weekend | `🚫 RSI Algo — Today is NSE holiday ({{reason}}). Not running.` |
| Algo started | `✅ RSI Algo started — Paper: {{true/false}} — {{date}}` |
| Scrip cache hit | `📦 Scrip master: loaded from cache ({{count}} records)` |
| Scrip downloaded | `⬇️ Scrip master: downloaded fresh ({{count}} records, cached for today)` |
| SELL PUT spread entry | `📉 SPREAD ENTRY [PUT] — Sell {{sellSymbol}} @ ₹{{sellPremium}} / Buy {{buySymbol}} @ ₹{{buyPremium}} \| Net credit: ₹{{netCredit}} \| RSI: {{rsi}} \| Margin: ₹{{margin}} \| Target: +₹{{target}} \| SL: -₹{{sl}}` |
| SELL CALL spread entry | `📈 SPREAD ENTRY [CALL] — Sell {{sellSymbol}} @ ₹{{sellPremium}} / Buy {{buySymbol}} @ ₹{{buyPremium}} \| Net credit: ₹{{netCredit}} \| RSI: {{rsi}} \| Margin: ₹{{margin}} \| Target: +₹{{target}} \| SL: -₹{{sl}}` |
| Target hit | `🎯 TARGET HIT — {{sellSymbol}} spread \| P&L: +₹{{pnl}} \| Exit net credit: ₹{{exitCredit}}` |
| SL hit | `🛑 SL HIT — {{sellSymbol}} spread \| P&L: -₹{{pnl}} \| Exit net credit: ₹{{exitCredit}}` |
| EOD exit (profit) | `✅ EOD EXIT — {{sellSymbol}} spread \| P&L: +₹{{pnl}}` |
| EOD exit (loss) | `❌ EOD EXIT — {{sellSymbol}} spread \| P&L: -₹{{pnl}}` |
| No open position | `💤 EOD — No open position today.` |
| API error | `⚠️ RSI Algo ERROR — {{module}} — {{error message}}` |

---

## Paper Trade Walkthrough

```
Date: Thursday 22 May 2025

STARTUP (09:15 AM):
  scripMasterCache.loadScripMaster():
    Check data/scrip-master-cache.json → cachedDate = "2025-05-21" (yesterday) → STALE
    Download fresh scrip master → write cache (cachedDate = "2025-05-22") → 14,823 records loaded
    📦 Scrip master: downloaded fresh (14,823 records, cached for today)

09:20 AM — rsiScanner starts. Only 1 candle, skipping (need 28).
10:30 AM — 28 candles available. RSI = 42.5 → NEUTRAL, no action.
11:00 AM — Nifty sells off hard. RSI = 34.1 → NEUTRAL.
11:05 AM — RSI = 21.4 → NEUTRAL.
11:10 AM — RSI = 17.8 → OVERSOLD ✅

ENTRY at 11:10 AM:
  Nifty spot        = 24,180
  ATM strike        = 24,200  (round(24180/50)*50)
  Hedge strike      = 23,800  (24200 - HEDGE_OFFSET(400))
  Expiry            = 22MAY2025 (Thursday, before 3:30 PM)

  Sell leg: NIFTY22MAY202524200PE  LTP = ₹135.40
  Buy  leg: NIFTY22MAY202523800PE  LTP = ₹28.50
  Net credit at entry = 135.40 - 28.50 = ₹106.90 per unit

  [PAPER] placeSpread → SELL 24200PE @ ₹135.40 / BUY 23800PE @ ₹28.50

  usedMargin (estimated, paper mode) = ₹46,500
  targetPnl  = +1.5% × 46,500 = +₹697.50
  slPnl      = -1.5% × 46,500 = -₹697.50

  WebSocket subscribed: tokens [24200PE, 23800PE]
  📉 SPREAD ENTRY [PUT] — Sell 24200PE @ ₹135.40 / Buy 23800PE @ ₹28.50
     Net credit: ₹106.90 | RSI: 17.8 | Margin: ₹46,500 | Target: +₹697.50 | SL: -₹697.50

11:10 AM → 12:00 PM — Nifty recovers. Spread narrows (puts decay):
  Time    | 24200PE | 23800PE | Net credit | SpreadMtm
  11:15   | ₹128.20 | ₹27.10  | ₹101.10   | (106.90-101.10)×75 = +₹435.00
  11:30   | ₹119.50 | ₹25.80  | ₹93.70    | (106.90-93.70)×75  = +₹990.00 ← target nearing
  11:35   | ₹116.80 | ₹25.50  | ₹91.30    | (106.90-91.30)×75  = +₹1,170 ← exceeds target?

Wait — targetPnl = ₹697.50. Let's check 11:30 more precisely:
  11:30 tick: spreadMtm = +₹990.00 ≥ +₹697.50 → TARGET HIT ✅

TARGET EXIT at 11:30 AM:
  Buy  back 24200PE @ ₹119.50  (close sell leg)
  Sell back 23800PE @ ₹25.80   (close buy/hedge leg)
  Exit net credit = 119.50 - 25.80 = ₹93.70
  P&L = (106.90 - 93.70) × 75 = 13.20 × 75 = +₹990.00

  [PAPER] EXIT spread | P&L: +₹990.00 | Reason: TARGET
  🎯 TARGET HIT — NIFTY22MAY202524200PE spread | P&L: +₹990.00 | Exit net credit: ₹93.70

  dailySLHit = false (target hit does NOT block re-entry)

--- RE-ENTRY SCENARIO (same day, later) ---
13:40 PM — Nifty rallies hard. RSI = 82.3 → OVERBOUGHT ✅

ENTRY at 13:40 PM:
  ATM strike   = 24,450 (spot has risen to 24,440)
  Hedge strike = 24,850 (ATM + 400)
  Sell: NIFTY22MAY202524450CE @ ₹98.20
  Buy:  NIFTY22MAY202524850CE @ ₹22.10
  Net credit = ₹76.10 | usedMargin = ₹44,200
  Target = +₹663 | SL = -₹663

3:25 PM — eodSquareOff fires. CE spread still open.
  Buy back 24450CE @ ₹81.40 / Sell back 24850CE @ ₹18.30
  Exit net credit = 81.40 - 18.30 = ₹63.10
  P&L = (76.10 - 63.10) × 75 = +₹975.00

  ✅ EOD EXIT — NIFTY22MAY202524450CE spread | P&L: +₹975.00

Day summary: 2 trades | +₹990 (target) + ₹975 (EOD) = +₹1,965 total
```

---

## Key Decisions

1. **RSI source = Nifty 50 spot candles, not futures** — Spot index (`99926000`) is used for RSI
   calculation to avoid futures roll distortion. Option strikes are also relative to spot (ATM).

2. **Credit spread, not naked sell** — Buying a far OTM option (400 points away) as a hedge leg
   significantly reduces SPAN margin blocked by the exchange (typically 60–70% reduction vs naked).
   This directly lowers the denominator in the 1.5% target/SL calculation, making the thresholds
   achievable within a single trading session.

3. **Target and SL = 1.5% of used margin** — Both are symmetric. Using margin as the base (not
   a fixed rupee amount) makes the strategy self-scaling: larger margin deployments have larger
   absolute thresholds, preserving the same risk-reward ratio regardless of account size.

4. **Margin fetched post-fill, not pre-trade** — Angel One's `getRMS` API returns `utilisedAmount`
   which reflects the actual SPAN + exposure margin blocked after the spread is live. Pre-trade
   margin estimates differ from actual blocked margin. Fetch post-fill for accuracy.

5. **Target hit allows re-entry; SL hit blocks it** — A target exit means the strategy worked.
   If RSI signals again later the same day, re-entry is valid. An SL hit means the mean reversion
   thesis failed — further signals on the same day are unreliable. `dailySLHit` blocks re-entry.

6. **SL/target monitoring via WebSocket on both legs** — The exit condition is `spreadMtm` (net
   of two legs), not individual option LTP. An exchange SL order cannot monitor net spread MTM.
   WebSocket ticks for both tokens compute the spread value in real-time.

7. **Hedge offset = 400 points (constant)** — 400 points (8 strikes at ×50) gives a hedge
   premium that is typically ₹15–40 (deep OTM, low cost) while providing meaningful margin
   relief. This is defined as `HEDGE_OFFSET` in `constants.ts` for easy adjustment.

8. **Scrip master cached to disk, not just memory** — The scrip master (~5MB JSON) is downloaded
   once per calendar day and written to `data/scrip-master-cache.json`. Process restarts within
   the same trading day (crash recovery, PM2 reload) reuse the cached file instantly. The cache
   is considered stale when `cachedDate !== today (IST)` — checked on every startup.

9. **Lot size is dynamic from scrip master** — Nifty lot size changes periodically (was 50,
   became 75 in 2024). Never hardcode it. Always read `lotSize` from the scrip master record
   for the matched symbol.

10. **`otplib` version** — Use `^13.x` (latest stable v13.4.0). TypeScript-first, async-native.
    The `createGuardrails` / `MIN_SECRET_BYTES` workaround from older repos is **not needed** in
    v13 — the API is simply `await generate({ secret })`.

11. **Paper trade entry/exit uses real LTP** — `getLtp` is called at signal time even in paper
    mode. This makes paper P&L realistic (reflects actual market prices, not theoretical).
    Paper mode uses a fixed margin estimate (`PAPER_MARGIN_ESTIMATE` in `constants.ts`) since
    the real margin API requires a live order to compute utilisedAmount.

---

## Resolved Decisions

1. **Underlying** — Nifty 50 index options (NFO exchange). Spot token `99926000` for candles + RSI.

2. **Expiry** — Current week's nearest Thursday. If today is Thursday before 3:30 PM, use today's
   expiry. If Thursday after 3:30 PM or any other day, use next Thursday.

3. **Paper trade storage** — Local JSON file (`data/paper-trades.json`). Atomic writes.
   Auto-created on first run if file doesn't exist.

4. **One spread at a time** — If an RSI signal fires while a spread is already open, skip it.
   Only one spread (two legs) is active at any point.

5. **EOD cutoff** — Hard square-off at 3:25 PM IST via cron regardless of P&L. Both legs closed.
   No positions held overnight.

6. **Hedge distance** — 400 points (8 strikes) from ATM. Defined as `HEDGE_OFFSET = 400` in
   `constants.ts`. Chosen for deep OTM status (low debit cost) + meaningful SPAN margin relief.

7. **Scrip master cache TTL** — 1 calendar day (IST). Stale = `cachedDate !== today in IST`.
   Cache file: `data/scrip-master-cache.json`. Gitignored. Auto-created on first download.

8. **Target and SL symmetry** — Both are exactly 1.5% of used margin. No asymmetric targets.
   Rationale: premium selling has negative skew; symmetric thresholds are simpler and consistent.

## Remaining Open Questions

None. All decisions resolved.
