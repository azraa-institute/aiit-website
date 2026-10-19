# AIIT Platform — instructions for Claude Code

At the beginning of every new session — including a fresh session with no prior
conversation history, and regardless of which account is signed in — read the root
`memory.md` **in full** before planning or modifying code, or even answering a
question about project state. Don't skim just §11/§12/§15 (current position/
backlog/handover log); also read §3 (project architecture and directory map) and §4
(routes) so you actually understand the codebase's topology before touching it, not
just what changed most recently. Treat `memory.md` as the project handover
document — it exists specifically so a fresh session (any account, any point after a
conversation reset) can resume productively without needing prior conversation
history or asking the project owner to re-explain what's already been built. After
reading it, run `git log --oneline -15` and compare the top commit against whatever
commit hash `memory.md` most recently cites as the last-known `main` HEAD (check the
latest §9 addendum and the latest §15 entry — whichever is more recent) — if they
differ, something happened after `memory.md` was last updated that isn't documented
yet; account for that gap before proceeding rather than assuming the doc is fully
current. Verify specific details against the current source when precision matters;
`memory.md` is updated on a best-effort basis and may lag the actual code.

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
