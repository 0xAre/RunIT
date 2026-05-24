# RunIt Web3 UI Implementation Plan

## Goal
Re-skin RunIt into a Web3-style, Arena-inspired experience while keeping the core product flow intact and allowing selective layout restructuring. The UI should feel like a mission-control console: bold typography, layered grid backgrounds, neon accents, and operational readouts.

## Reference Style
Primary reference: https://arena.colosseum.org/

Key traits to emulate:
- Dark, atmospheric backgrounds with subtle grid/ASCII motifs
- Strong typographic hierarchy and mono-labels
- Glassy panels with soft borders and neon glows
- Split layouts and hero focus on the left, system visuals on the right
- Minimal but high-contrast CTAs

## Phase 1: Foundations (Global)
- Update global tokens and typography in [app/globals.css](app/globals.css)
- Replace font loading in [app/layout.tsx](app/layout.tsx)
- Add reusable utility classes: grid background, vignette, mono-label, ASCII blocks, auth layout helpers

## Phase 2: Landing + Auth (Public)
- Landing page ([app/page.tsx](app/page.tsx))
  - Split hero layout with mission-control card
  - Replace colors, badges, gradients, and icon backgrounds
  - Add atmospheric layers (grid, vignette, noise)
- Auth pages ([app/auth/signin/page.tsx](app/auth/signin/page.tsx), [app/auth/signup/page.tsx](app/auth/signup/page.tsx))
  - Two-column layout with form + system panel
  - ASCII data panels and mono labels
  - Responsive single-column fallback

## Phase 3: Workspace Shell
- Sidebar and header styling in [app/workspace/[id]/layout.tsx](app/workspace/[id]/layout.tsx)
  - Convert to command-center layout with panel header, event status, and mission bar
  - Add quick actions and system status badges
- Workspace dashboard [app/workspace/page.tsx](app/workspace/page.tsx)
  - Add system header band and status widgets
  - Update empty state styling with neon callouts

## Phase 4: Stage Pages
- Blueprint: [app/workspace/[id]/blueprint/page.tsx](app/workspace/[id]/blueprint/page.tsx)
  - Map new cards, tabs, and severity tags
- Dependencies: [app/workspace/[id]/dependencies/page.tsx](app/workspace/[id]/dependencies/page.tsx)
  - Add mission header and panelized React Flow container
- Simulation: [app/workspace/[id]/simulate/page.tsx](app/workspace/[id]/simulate/page.tsx)
  - Convert scenarios into console-like cards with heat levels
- Live Mode: [app/workspace/[id]/live/page.tsx](app/workspace/[id]/live/page.tsx)
  - Chat and updates into split panels with status lights
- Incident: [app/workspace/[id]/incident/page.tsx](app/workspace/[id]/incident/page.tsx)
  - Quick-action templates with alarm states
- Report: [app/workspace/[id]/report/page.tsx](app/workspace/[id]/report/page.tsx)
  - Output area as a log-style report viewer

## Phase 5: Motion + UX Polish
- Framer Motion reveal patterns
- Subtle hover lifts and active-state glows
- Reduced-motion support for key transitions

## Phase 6: QA + Verification
- Run `npm run lint`
- Run `npm run build`
- Check responsiveness on mobile for auth and workspace pages
- Validate contrast on badges, inputs, and tabs

## Current Progress
- Global design tokens updated
- Landing page redesigned
- Auth pages redesigned
- Responsive auth layout helpers added

## Next Actions
1. Refactor workspace layout and dashboard
2. Apply new panel system to blueprint, dependencies, simulation, live, incident, and report pages
3. Run lint/build and visual QA
