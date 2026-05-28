# Flytext — Design Agent Configuration

## Always-Active Design Skills

When performing ANY UI, CSS, visual, component, or layout change, invoke these skills before writing code. They encode the design system, prevent anti-patterns, and ensure every change meets the premium production bar.

### Tier 1 — Every design task (always invoke):
1. `/impeccable craft` — production quality gate, anti-pattern prevention
2. `/high-end-visual-design` — premium aesthetics (liquid glass, grain, depth)
3. `/design-taste-frontend` — component structure and interaction standards
4. `/emil-design-eng` — micro-detail philosophy, animation decisions
5. `/stitch-design-taste` — ensures coherent, unified design language

### Tier 2 — Invoke for specific task types:

| Task | Skills |
|------|--------|
| Color, palette, contrast | `/build-color-palette` `/manage-color-contrast` `/colorize` |
| Typography, text rendering | `/apply-typography-scale` `/typeset` |
| Layout, spatial rhythm | `/layout` `/canvas-design` `/ux-designer` |
| Full redesigns | `/redesign-existing-projects` `/stitch-design-taste` |
| Motion, transitions | `/animate` `/delight` |
| Polish, fine-tuning | `/polish` |
| Increase visual weight | `/bolder` |
| Reduce visual noise | `/quieter` |
| Grain, texture, worn feel | `/decay` |
| Minimal style direction | `/minimalist-ui` |
| Brutalist/industrial direction | `/industrial-brutalist-ui` |

---

## Visual Design System

### Identity
Flytext is a premium Electron typing overlay. It sits above all windows, always visible, always ambient. The UI must feel like a physical glass slab — present but not intrusive, material but not heavy.

**Three brand words:** *ambient · precise · warm*

### Liquid Glass Material System

Every surface that uses the `.glass` class implements the full liquid glass stack:

| Layer | Implementation |
|-------|---------------|
| Lens gradient | `radial-gradient` + `linear-gradient` multi-layer background |
| Backdrop blur | `blur(48px) saturate(180%) brightness(0.88) contrast(1.02)` |
| Top specular | `::before` — 1px gradient line, bright center, fades to transparent |
| Depth shadows | 4-layer outer shadow stack + 4 inset shadows |
| Amber glow | `0 0 120px rgba(212, 149, 106, 0.05)` outer ambient |
| Film grain | `::after` — animated via `steps(10)`, 0.8s cycle, `mix-blend-mode: overlay` |
| Grain opacity | `0.065` — visible texture, not visible pattern |

### Grain Noise
The grain animates at ~10fps using CSS `steps(10)` timing — this simulates film grain, not a smooth transition. The noise SVG uses `fractalNoise` with `stitchTiles='stitch'` so it tiles seamlessly as it shifts.

### Color Tokens
```
--bg-base:       #0d0d10          — near-black, slight blue-tinted
--accent:        #d4956a          — warm amber/terracotta
--accent-bright: #e8a87c
--accent-glow:   rgba(212,149,106,0.45)
--accent2:       #6b8cba          — cool steel blue (AI/chat)
--text-primary:  #edebe8          — warm off-white
--text-muted:    #7a7875
```

### Radius Scale
```
--radius-sm:   6px    — buttons, badges, inputs
--radius-md:   12px   — cards, dropdowns
--radius-lg:   20px   — main panel (liquid glass pill)
--radius-pill: 999px  — collapsed mode
```

### Typography
- **Sans:** Inter (system fallback) — UI labels, body
- **Mono:** Geist Mono / IBM Plex Mono — typing display, code, status

### Anti-patterns (never do these)
- No border-left stripe accents (see /impeccable absolute bans)
- No gradient text (see /impeccable absolute bans)
- No `ease-in-out` transitions — use spring physics or `cubic-bezier(0.32,0.72,0,1)`
- No `backdrop-filter` on scrolling containers
- No `width/height` animation — transform + opacity only
- No grain on scrolling containers — `.glass::after` only

---

## Window Modes

| Mode | Width | Height | Border Radius |
|------|-------|--------|---------------|
| expanded | 440px | 560px | `--radius-lg` (20px) |
| collapsed | 260px | 44px | pill (999px) |
| ghost | 200px | 6px | 0 |
