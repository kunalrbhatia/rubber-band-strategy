# Project Gemini Instructions

These instructions are foundational for any agent or developer working on the `rubber-band-strategy` codebase.

## 🏗️ Architecture Mandates

- **Singleton Stores**: Use the singleton pattern for state management in `src/store/`.
  - `sessionStore`: SmartAPI tokens.
  - `tradeStore`: Active trade state and daily SL flags.
  - `scripMasterStore`: In-memory instrument cache.
- **Helper Isolation**: Keep `src/helpers/` modules stateless and focused on single responsibilities.
- **Job Scheduling**: All recurring tasks must be implemented in `src/jobs/` and scheduled in `main.ts` using `node-cron`.
- **Simulation Layer**: All trade execution must route through `src/helpers/orders.ts`, which branches to `src/paper/` or live API based on `config.paperTrading`.

## 🛠️ Development Workflow

- **Conventional Commits**: All commits must follow the Conventional Commits specification. Use `pnpm run commit` (Commitizen).
- **TypeScript & ESM**: Use strict TypeScript and ES Modules. Always include `.js` extensions in local imports (e.g., `import { x } from './y.js'`).
- **ESLint Flat Config**: Adhere to the `eslint.config.js` rules. We prioritize clean code but allow warnings for unused variables matching the `^_` pattern.
- **Testing**:
  - Use **Jest** with `ts-jest` in ESM mode.
  - Mock external dependencies (like `axios`) in `__mocks__/`.
  - Maintain a high coverage baseline (~70% total, 100% for core logic).

## 🔒 Security & Standards

- **Credential Safety**: Never log or print API keys, tokens, or TOTP secrets.
- **Timezone Consistency**: All operations and logs must use **Asia/Kolkata** (IST). Use `date-fns-tz` for conversions.
- **Graceful Shutdown**: The Express server and WebSocket connection must handle `SIGTERM` and `SIGINT` signals by unsubscribing and closing cleanly.

## 📊 Strategy Specifics

- **Hedge Offset**: Constant `STRATEGY_CONSTANTS.HEDGE_OFFSET` is 400 points.
- **Margin-Based Exit**: Target and SL are calculated as **1.5%** of the *actual* used margin fetched post-fill.
- **One Trade Policy**: Only one active spread allowed. No re-entry after a Stop Loss hit on the same day.
