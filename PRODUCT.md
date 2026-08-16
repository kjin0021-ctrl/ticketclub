# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vinext/React 19, TypeScript, Tailwind CSS v4, native CSS design tokens, Drizzle ORM, Cloudflare-compatible deployment.

## Users

Primary users follow one or more artists and need to decide whether they can attend a newly announced offline event. Secondary users are technical fans who fork and self-host the open-source project.

## Product Purpose

TicketClub 票来 turns public artist posts into confirmed structured events, compares Korean events with manually entered availability, and produces an actionable travel plan.

## Positioning

The differentiating mechanism is the decision chain from public post to event extraction to personal travel feasibility, not ticket sales or generic trip planning.

## Capabilities and Constraints

- Single-user, self-hosted and zero-cost-first.
- Does not sell tickets or automate ticket purchasing.
- Users enter availability manually; calendar access is not required.
- Global event discovery, with full travel feasibility focused on Korea.
- Source adapters, AI providers and notifications must remain replaceable.

## Brand Commitments

Name: TicketClub 票来. The product uses a sweet Y2K concert-ticket and travel-desk visual language. It must remain clear that the product is not a ticket marketplace.

## Evidence on Hand

- Product requirements: `outputs/ticketclub-prd.md` in the parent workspace.
- Approved Figma visual boards exist in the connected Figma file.
- Initial implementation uses honest mock data, clearly labeled in source.

## Product Principles

- Show the original source and every timing assumption.
- Ask users to confirm extracted information rather than hiding uncertainty.
- Keep quiet when nothing changed; make new, changed and cancelled events obvious.
- Make the free mock workflow complete before depending on paid services.
- Let personal saved places improve later trips.

