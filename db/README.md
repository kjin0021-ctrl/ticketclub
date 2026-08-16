# TicketClub data model

TicketClub uses SQLite-compatible Drizzle schema so the same model works with local SQLite and free-tier Cloudflare D1.

## Ownership

This is intentionally a single-user model. There is no `users` table and no account ID repeated across every record.

## Main chain

`artists → sources → source_items → events → feasibility_runs`

- One artist can have many sources.
- A raw post is preserved in `source_items` before AI extraction.
- Multiple source items can point to the same event through `event_source_items`.
- Event de-duplication uses `artist_id + dedupe_fingerprint`.
- Availability and every feasibility result are retained for auditability.

## Supporting areas

- `spots`: precise personal place library, tags, photos and after-event suitability.
- `notifications`: in-product and email delivery state.
- `settings`: the single-user timezone and all adjustable timing assumptions.

Run `pnpm db:generate` after changing `db/schema.ts`.
