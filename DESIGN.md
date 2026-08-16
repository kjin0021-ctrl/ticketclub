# TicketClub Design System

## Direction

An operating interface presented as a collectible fan travel desk: concert ticket, transparent sleeve, instant photo, route labels and small paper notes. Decoration supports the task and never covers information or actions.

## Typography

- Chinese: Noto Sans SC.
- English and tabular data: DM Sans.
- Type sizes are controlled by CSS variables in `app/globals.css`.

## Palette

- Blush `#e8cdd8`
- Cement `#6c6d6a`
- Milk `#faf8f5`
- Mist blue `#c4dbea`
- Butter `#f2dea0`
- Ink `#242522`

## Geometry

- Controls: 12–15px radii.
- Content surfaces and tickets: 18–24px radii.
- Buttons are short, tactile and content-width; minimum height is 48px.
- Mobile controls maintain at least 44px touch targets.

## Responsive Rules

- Desktop uses an asymmetric ticket desk with a decision sidebar.
- Mobile stacks the photograph, ticket, actions and nearby event in reading order.
- Route and countdown labels stay inside the ticket header safe zone.

