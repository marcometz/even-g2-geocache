---
name: even-g2-display-design
title: "Even G2 Display Design Skill"
summary: "Design and redesign Even G2 app views using the official Even Realities Figma guidelines and Display & UI constraints."
author: marcometz
skills-version: 1
categories:
  - ui-design
  - accessibility
  - prototyping
license: MIT
---

# Purpose

This skill enforces how Even G2 app views must be designed.

Sources:
- Figma: https://www.figma.com/design/X82y5uJvqMH95jgOfmV34j/Even-Realities---Software-Design-Guidelines--Public-?node-id=2922-80782&p=f
- Display docs: https://hub.evenrealities.com/docs/guides/display

# Hard Constraints (must follow)

1. Design for a fixed **576 x 288 px** canvas.
2. Use only **4-bit greyscale** visual language (16 levels, hardware appears green).
3. Assume **no arbitrary HTML/CSS layout engine** on device.
4. Build layout as containers with explicit coordinates/sizing.
5. Keep within page limits:
   - max **4 image containers**
   - max **8 non-image containers**
   - exactly **1 event-capturing container**
6. Use borders/text/image for structure (no background fill semantics).
7. Keep list-heavy screens compatible with native list behavior:
   - max 20 items
   - max 64 chars per item
8. Prefer clear, compact, high-contrast typography and icon silhouettes.

# Interaction Patterns

- Single active input target per page.
- Use clear focus/selection markers (e.g. cursor glyphs like `>` / `▶`).
- Support simple flows:
  - list navigation
  - detail drill-down
  - back navigation
  - optional progressive reveal (e.g. hint/info)

# Redesign Checklist

When redesigning any view, always:

- map each screen to the 576x288 constraints first
- remove non-compliant decorative styling
- use border-based grouping and compact spacing
- keep text concise and scannable
- ensure selected state is visible in monochrome
- verify readability in simulator/hardware rendering

