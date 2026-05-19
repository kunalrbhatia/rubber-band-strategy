# RSI Algo — Options Mean Reversion Strategy

Automated daily intraday options selling strategy on Nifty 50 index using RSI extremes.

## 📈 Strategy Overview

The "Rubber Band Strategy" is an intraday mean reversion system that sells option premium when the Nifty 50 index reaches oversold or overbought levels.

- **Instrument**: Nifty 50 Index Options (NFO).
- **Timeframe**: 5-minute candles.
- **Indicator**: 14-period RSI (Wilder's Smoothing/RMA).
- **Execution**: Credit Spreads (Bull Put Spread or Bear Call Spread).

### Signals
| RSI Level | Condition | Action | Spread Type |
|---|---|---|---|
| **≤ 20** | Oversold | **Sell ATM Put** | Bull Put Spread |
| **≥ 80** | Overbought | **Sell ATM Call** | Bear Call Spread |

### Exit Conditions
| Condition | Trigger | Action |
|---|---|---|
| **Target** | MTM Profit ≥ **1.5%** of blocked margin | Close both legs |
| **Stop Loss** | MTM Loss ≥ **1.5%** of blocked margin | Close both legs |
| **EOD Cutoff** | **3:25 PM IST** | Hard square-off |

---

## 📝 Trade Example

### Scenario: Oversold Reversal
1.  **Signal**: At 11:10 AM, RSI drops to **17.8**.
2.  **Entry**:
    *   Nifty Spot: 24,180.
    *   **Leg 1 (Sell)**: ATM PE (24,200) @ ₹135.
    *   **Leg 2 (Buy)**: OTM PE (23,800) @ ₹28.
    *   **Net Credit**: ₹107/unit.
3.  **Thresholds**:
    *   Blocked Margin: ₹46,500.
    *   Target (+1.5%): +₹697.50.
    *   SL (-1.5%): -₹697.50.
4.  **Monitoring**: Real-time MTM tracking via WebSocket ticks.
5.  **Exit**: At 11:30 AM, spread narrows to ₹93.70. **Profit = ₹990**. Target hit!

---

## 🚀 Setup & Initialization

### Prerequisites
- **Node.js** >= 20 LTS
- **pnpm** (preferred)
- **Angel One SmartAPI** Credentials
- **Telegram Bot** (for notifications)

### Installation
1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/rubber-band-strategy.git
    cd rubber-band-strategy
    ```
2.  **Install dependencies**:
    ```bash
    pnpm install
    ```
3.  **Configure Environment**:
    Copy `.env.example` to `.env` and fill in your credentials.
    ```bash
    cp .env.example .env
    ```
4.  **Build the project**:
    ```bash
    pnpm run build
    ```

### Running the App
- **Development**: `pnpm run dev` (uses `tsx` for hot-reloading).
- **Production**: `pnpm start` (runs the compiled JS).

---

## 🛠️ Project Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript (Strict Mode)
- **Broker**: Angel One SmartAPI
- **Scheduling**: `node-cron`
- **Socket**: `ws` for real-time MTM monitoring
- **Logging**: Winston (Daily rolling logs in IST)
- **Testing**: Jest (100% coverage goal)

---

## 📁 Directory Structure

```
src/
├── config/       # Environment validation & typed config
├── store/        # Singleton state (Session, Trade, Scrip Master)
├── helpers/      # API, Math, Logic, and Utility functions
├── jobs/         # Scheduled Cron tasks (Scanner, Square-off)
├── paper/        # Paper trading simulation logic
├── main.ts       # Application entry point
├── server.ts     # Health check server
└── notifier.ts   # Telegram notification wrapper
```

---

## 📜 Available Scripts

- `pnpm run build`: Compile TypeScript to JavaScript.
- `pnpm run dev`: Start application in development mode.
- `pnpm run start`: Run the production build.
- `pnpm test`: Execute Jest test suite with coverage.
- `pnpm run lint`: Run ESLint checks.
- `pnpm run format`: Format code with Prettier.
- `pnpm run commit`: Trigger Commitizen for conventional commits.
