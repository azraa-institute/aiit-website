# AIIT Platform — instructions for Claude Code

At the beginning of every new session, read the root `memory.md` before planning or
modifying code. Treat it as the project handover document — it is written to make a
fresh session productive without needing prior conversation history. Verify specific
details against the current source when precision matters; `memory.md` is updated on
a best-effort basis and may lag the actual code.

Before ending a meaningful development session (a feature shipped, a bug fixed, a
decision made, a milestone reached), update `memory.md`:
- Update the affected sections (feature registry, routes, decisions, known issues)
  to reflect the new state — don't just append, correct what changed.
- Update §11 (Current development position) with the exact next action.
- Update §12 (backlog) if something was resolved or newly discovered.
- Add a concise entry to §15 (Session handover log).
- Never claim something is implemented, tested, deployed, or fixed without having
  actually verified it in that session. Mark unknowns as unknown rather than
  guessing.

This is a monorepo (`apps/web` React/Vite frontend, `apps/api` NestJS/Prisma/Postgres
backend, `packages/shared` shared types). Root `README.md` is also kept reasonably
current (see `memory.md` §9 for the two spots where it's known to have drifted) and is
a good secondary architecture reference.
