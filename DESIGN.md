---
name: "TicketClub Pocket Player"
description: "A silver handheld event player that turns verified artist announcements into a clear, tactile queue."
colors:
  shell: "#d8dad9"
  shell-light: "#f3f4f2"
  shell-dark: "#a7aaa9"
  canvas: "#c9ccca"
  screen: "#252a28"
  screen-soft: "#343b37"
  screen-text: "#e9f1e7"
  screen-muted: "#aebbb2"
  accent-pink: "#d0789d"
  accent-pink-dark: "#8d4967"
  ink: "#222725"
  text-muted: "#5e6461"
typography:
  display:
    fontFamily: "var(--font-chinese), 'Noto Sans SC', sans-serif"
    fontSize: "clamp(2.2rem, 5vw, 4.7rem)"
    fontWeight: 720
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  title:
    fontFamily: "var(--font-chinese), 'Noto Sans SC', sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "var(--font-chinese), 'Noto Sans SC', sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "var(--font-english), 'DM Sans', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.12em"
rounded:
  lcd: "0.5rem"
  control: "0.68rem"
  button: "0.7rem"
  surface: "0.85rem"
  shell: "1.35rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.accent-pink-dark}"
    textColor: "{colors.screen-text}"
    rounded: "{rounded.button}"
    padding: "0 1.15rem"
    height: "3.2rem"
  button-secondary:
    backgroundColor: "{colors.shell-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "0 1.15rem"
    height: "3.2rem"
  lcd-status:
    backgroundColor: "{colors.screen}"
    textColor: "{colors.screen-text}"
    rounded: "{rounded.lcd}"
    padding: "0.65rem 0.8rem"
  hardware-shell:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.ink}"
    rounded: "{rounded.shell}"
    padding: "3.25rem 1.3rem 1.35rem"
---

# Design System: TicketClub Pocket Player

## Overview

**Creative North Star: "The Pocket Player"**

TicketClub is an event-operating tool housed in the visual language of a compact silver MP3 player. Its desktop form is a centered console; its mobile form becomes a handheld device. Translucent brushed-metal shells frame dark LCD status surfaces, while short raised controls make every action feel physical and dependable.

Verified events are tracks moving through a queue. The metaphor supports scanning without obscuring product truth: sources, uncertainty, event state, and travel feasibility remain explicit. The mood is nostalgic but disciplined—Y2K hardware memory expressed through quiet materials, restrained geometry, and highly legible Chinese typography.

The ticket-stub metaphor is reserved for a future attended-event collection feature. It must not appear in current operating screens, navigation, event cards, decision flows, setup, or empty states.

**Key Characteristics:**

- Silver transparent hardware shells with visible layered depth.
- Dark inset LCD surfaces for status, counts, dates, and active state.
- One muted pink signal color, used sparingly.
- Short, raised, tactile controls with physical press feedback.
- Event queue and track language across operating surfaces.
- Clear Chinese sans typography with compact English hardware labels.
- Desktop console and mobile handheld expressions of the same device.

## Colors

The palette is almost entirely metallic neutral and charcoal, with muted pink acting as the sole signal accent.

### Primary

- **Signal Pink:** The only expressive accent. Use for status LEDs, primary actions, active progress, notifications, selection, and focus—not large decorative fields.
- **Deep Signal Pink:** Provides contrast for primary controls, carets, and focus outlines.

### Neutral

- **Brushed / Highlight / Machined Silver:** Hardware shells, lit edges, recesses, borders, and lower gradients.
- **LCD Charcoal / Soft LCD Charcoal:** Status panels, selected navigation, counts, dates, and compact system labels.
- **LCD Phosphor / Muted LCD Phosphor:** Primary and supporting text inside LCD surfaces.
- **Hardware Ink / Machined Grey:** Primary and secondary text on silver surfaces.

**The One Signal Rule.** Pink is the only chromatic action and state signal; do not introduce blue, green, yellow, or rainbow status systems.

**The LCD Meaning Rule.** Dark surfaces communicate status, selection, counts, or device readouts. They are not generic decorative cards.

## Typography

**Display Font:** Noto Sans SC (system sans-serif fallback)

**Body Font:** Noto Sans SC (system sans-serif fallback)

**Label Font:** DM Sans (system sans-serif fallback)

Chinese content is direct, open, and highly legible. DM Sans supplies the compact technical voice for English product marks, track labels, dates, counts, and tabular readouts.

### Hierarchy

- **Display:** Heavy, tightly tracked Chinese headings; generous on desktop, bold and compact on mobile.
- **Title:** Firm section and card titles, generally 1.125rem.
- **Body:** Clear Chinese reading text at 0.9375rem with comfortable line spacing.
- **Label:** Compact DM Sans at 0.75rem, often bold with 0.12em tracking.

**The Chinese First Rule.** Operational meaning must remain immediately readable in Chinese; English is a device label or queue vocabulary, never the sole explanation.

**The Readout Rule.** Dates, times, counts, and statuses use tabular numerals wherever alignment matters.

## Layout

The application is capped at 100rem and centered as a desktop console against a fixed metallic background. Home content is narrower at 74rem, with fluid gutters and enough open space to expose the shell. Larger workflows pair a flexible workspace with a narrower contextual rail.

At 48rem and below, the console becomes a full-width handheld. Headers simplify, gutters become 1rem, columns stack, and a floating bottom navigation sits inside a raised silver housing. Touch targets remain at least 44px; the canonical raised button is 3.2rem tall.

**The Same Device Rule.** Responsive changes recompose one hardware system. Desktop must not feel like a website while mobile alone carries the device metaphor.

## Elevation & Depth

Depth is structural and material. Shells combine translucent silver gradients, hairline borders, a bright inner top edge, and broad ambient shadows. LCDs and fields are inset; buttons are raised and become inset when pressed.

### Shadow Vocabulary

- **Shell:** `0 28px 70px rgb(42 47 44 / .22), inset 0 1px rgb(255 255 255 / .9), inset 0 -1px rgb(70 75 72 / .22)`.
- **Raised:** `inset 0 1px 1px rgb(255 255 255 / .9), 0 2px 3px rgb(54 60 57 / .25), 0 8px 18px rgb(54 60 57 / .08)`.
- **Inset:** `inset 0 2px 4px rgb(29 34 31 / .3), inset 0 -1px rgb(255 255 255 / .72)`.
- **Surface:** `0 18px 44px rgb(45 50 47 / .14)`.

**The Mechanical Depth Rule.** Every shadow must explain whether an element is a shell, a raised control, or an inset readout.

## Shapes

Geometry is compact and machined: LCD corners are 0.5rem, fields and controls near 0.68rem, buttons 0.7rem, operating surfaces 0.85rem, and principal shells 1.2–1.35rem. Circular shapes are reserved for LEDs and small indicators; primary controls are short rounded rectangles.

**The Hardware Radius Rule.** Avoid pills, oversized soft cards, torn edges, perforations, notches, and paper-like irregularity on operating screens.

## Components

### Buttons

- **Shape:** Short raised rectangle (0.7rem radius; 3.2rem minimum height).
- **Primary:** Deep pink gradient, pale text, darker pink border, and bright upper inset edge.
- **Secondary:** Highlight-to-machined-silver gradient with hardware ink and raised shadow.
- **Hover / Focus / Active:** Hover lifts 1px; active moves down 2px and becomes inset. Focus uses a 2px deep-pink outline with 3px offset.

### Cards / Containers

- **Hardware Shell:** Layered translucent silver, thin dark border, bright top edge, broad shadow, and optional product engraving plus pink LED.
- **Operating Surface:** Light silver, 0.85rem corners, inner highlight, and restrained ambient shadow.
- **LCD Surface:** Charcoal, pale phosphor text, compact corners, and inset depth.

### Inputs / Fields

- **Style:** Recessed grey well with 0.55rem radius, dark translucent border, hardware ink, and inset shadow.
- **Focus:** Deep-pink border or outline with a soft pink ring; the field remains visibly inset.

### Navigation

Desktop navigation sits inside an inset silver well; the active item becomes a dark LCD key. Header utilities are raised controls. Mobile navigation moves to a floating bottom hardware dock with the same LCD active state.

### Event Queue

Confirmed events form a single scan-friendly track list, not a ticket grid. Dates are compact LCD readouts, source counts are aligned metadata, and hover changes the local silver tone without turning the row into a floating card.

### Status Readouts

Sync state, counts, progress, and system labels use LCD charcoal with phosphor text. Pink LEDs communicate attention but never replace a written status.

## Do's and Don'ts

### Do:

- **Do** use silver shells, charcoal LCDs, and physical depth to unite operating surfaces.
- **Do** reserve pink for action, attention, active progress, selection, and focus.
- **Do** describe events as tracks in a verified queue while keeping source and uncertainty explicit.
- **Do** preserve Chinese-first clarity and use English only as concise hardware labeling.
- **Do** adapt the console into a compact handheld with 44px-or-larger touch targets.

### Don't:

- **Don't** use ticket stubs, perforations, torn paper, boarding passes, QR decoration, instant photos, sticky notes, or travel-desk collage in current operating screens.
- **Don't** introduce multiple accent hues or pastel-coded card categories.
- **Don't** use dark LCD panels as arbitrary decoration.
- **Don't** use tall pill buttons, excessive rounding, or soft floating-card styling.
- **Don't** sacrifice product truth: source links, confidence, confirmation, changes, and cancellations remain plainly stated.
