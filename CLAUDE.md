# CLAUDE.md — AI Assistant Instructions

## Build and Test
- Build: `pnpm run build`
- Test: `pnpm test`
- Lint: `pnpm run lint`
- Format: `pnpm run format`

## Architecture
- **Language**: TypeScript (strict, ES modules)
- **Stores**: Singletons in `src/store/`
- **Helpers**: Stateless utility functions in `src/helpers/`
- **Jobs**: Cron tasks in `src/jobs/`
- **Paper Trading**: Local simulation in `src/paper/`

## Coding Standards
- Use `logger` for all console output.
- All timestamps in `Asia/Kolkata`.
- 100% test coverage enforced.
- No `process.env` access outside of `src/config/env.ts`.
