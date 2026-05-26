# CLAUDE.md — nomoredesign 2026 Hero Animation

This file is a persistent brief for Claude Code sessions working on this project.
Always read it at the start of any session before touching any code.

---

## What the script does

`scripts/hero-animation.js` drives the animated headline on the nomoredesign 2026
landing page. Three `<h1>` elements each contain a static word and a cycling word
in parentheses. The cycling word animates through a CMS-driven word bank with a
per-character blur-fade effect.

### Sequence per cycle
1. Line 1 animated word fades in (left → right character stagger)
2. Line 2 animated word fades in
3. Line 3 animated word fades in
4. All three lines hold together for 1.5 seconds
5. All three lines fade out simultaneously (right → left character stagger)
6. Repeat from 1 with the next word in each bank

### Font sizing
On load (and on window resize), the script measures the container width against
the longest possible full line string across all three lines, then sets `font-size`
on all three `<h1>` elements so the longest line fills the container exactly
without wrapping. Resize is debounced at 100ms.

---

## Webflow site details

| Field        | Value                                      |
|--------------|--------------------------------------------|
| Site name    | nomoredesign 2026                          |
| Site ID      | `6a11b855a3b0df7cae8adcad`                 |
| Published at | `nomoredesign-2026.webflow.io`             |

---

## CMS collection structure

| Field         | Value                                      |
|---------------|--------------------------------------------|
| Collection    | Hero words                                 |
| Collection ID | `6a12b854c34a30326bc9d571`                 |
| Total items   | 40                                         |
| Filter field  | `line` (option field)                      |

### Option values and item counts

| Option value | Headline line | Item count |
|--------------|---------------|------------|
| `outputs`    | Line 1        | 14         |
| `clients`    | Line 2        | 14         |
| `style`      | Line 3        | 12         |

---

## HTML attribute conventions

### Active display spans (inside the three `<h1>` elements)

```html
<span data-hero-word="1">websites</span>   <!-- line 1 / outputs -->
<span data-hero-word="2">startups</span>   <!-- line 2 / clients -->
<span data-hero-word="3">love</span>       <!-- line 3 / style   -->
```

`data-hero-word` values are `"1"`, `"2"`, `"3"` — matching `lineMap` order in the script.

### Hidden CMS collection list items

Three hidden collection lists (one per `line` option) render all available words:

```html
<span data-hero-line="outputs">apps</span>
<span data-hero-line="clients">agencies</span>
<span data-hero-line="style">care</span>
```

`data-hero-line` values must exactly match the CMS `line` field option values:
`outputs`, `clients`, `style`.

---

## Animation timing values

| Constant          | Value    | Purpose                                           |
|-------------------|----------|---------------------------------------------------|
| `CHAR_STAGGER_MS` | `22ms`   | Delay between each character's animation start   |
| `TRANSITION_MS`   | `300ms`  | CSS transition duration per character             |
| `HOLD_MS`         | `1500ms` | How long all three lines stay visible together    |
| `INITIAL_DELAY_MS`| `1500ms` | Pause after page load before animation starts     |

### Out animation (right → left)
Each character transitions to: `opacity: 0`, `filter: blur(6px)`, `max-width: 0`,
`transform: translateY(-4px)`.

### In animation (left → right)
Each character transitions to: `opacity: 1`, `filter: blur(0px)`, `max-width: 2em`,
`transform: translateY(0)`.

---

## Embedding in Webflow

The script is loaded via a `<script>` tag in **Site Settings → Custom Code → Footer Code**.

### ⚠️ Always use a commit SHA — never `@main`

jsDelivr caches `@main` aggressively and the purge tool is unreliable. Always pin
to a specific commit SHA to guarantee the latest version is served immediately.

**Current working script tag:**
```html
<script src="https://cdn.jsdelivr.net/gh/nomoredesign/webflow-scripts@e196bcfed184185e2fc759ee2139e88fc92e885e/scripts/hero-animation.js"></script>
```

After every push, get the new commit SHA with:
```bash
curl -s -H "Authorization: token YOUR_TOKEN" \
  "https://api.github.com/repos/nomoredesign/webflow-scripts/commits?path=scripts/hero-animation.js&per_page=1" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['sha'])"
```

Then update the `src` in Webflow with the new SHA.

---

## File locations

```
/
├── CLAUDE.md                        ← this file
└── scripts/
    ├── hero-animation.js            ← CMS-driven cycling headline animation
    └── hover-animation.js           ← hover/touch blur-fade headline switcher
```

---

## Notes for future sessions

- Do **not** alter `CHAR_STAGGER_MS` or `TRANSITION_MS` without re-testing on
  mobile — the stagger total (`chars × 22ms`) can exceed the perceived hold time
  on very long words.
- The script is self-contained (no dependencies) and uses a named function
  (`initHeroAnimation`) to avoid polluting the global scope.
- Word banks are collected once on init. If CMS words change after page load,
  a full reload is required.
- `indices` tracks the current word position per line independently, so all three
  lines advance through their word banks at the same pace but can be at different
  positions.
- The font sizer walks up the DOM from the first `<h1>` to find the nearest
  ancestor wider than the `<h1>` itself — no custom attribute needed on the
  container.
- Debug logging is prefixed with `[hero]` — check the browser console if
  something stops working.
---

## `scripts/hover-animation.js` — Hover headline blur-fade animation

### What it does

Targets any element with `[data-hover-headline]` and `[data-hover-alternate]`
attributes. On desktop, `mouseenter` triggers a blur-fade transition from the
default text to the alternate text; `mouseleave` reverses it. On touch devices
the animation auto-cycles continuously.

### HTML attribute convention

```html
<h1 data-hover-headline="Great design and development, made simple."
    data-hover-alternate="One designer. Every detail.">
  Great design and development, made simple.
</h1>
```

| Attribute               | Purpose                                    |
|-------------------------|--------------------------------------------|
| `data-hover-headline`   | Default text (shown on load, shown at rest)|
| `data-hover-alternate`  | Text shown on hover / during touch cycle   |

Multiple elements on the same page are each initialised independently.

### Animation sequence

**Desktop — `mouseenter` (default → alternate)**
1. Opening `(` and closing `)` blur-fade in simultaneously
2. Default text dissolves character by character **right → left**
3. Alternate text types in character by character **left → right**

**Desktop — `mouseleave` (alternate → default)**
1. Alternate text dissolves **right → left**
2. Default text types back in **left → right**
3. Parentheses blur-fade out

**Touch — auto-cycle** (repeats indefinitely)
- Starts after a 1.5 s initial delay
- default → alternate → hold 1.5 s → default → hold → repeat

### Animation timing values

| Constant          | Value  | Purpose                                          |
|-------------------|--------|--------------------------------------------------|
| `CHAR_STAGGER_MS` | `22ms` | Delay between each character's animation start  |
| `TRANSITION_MS`   | `300ms`| CSS transition duration per character            |
| `PAREN_DURATION_MS`| `350ms`| Parenthesis fade duration                       |
| `HOLD_MS`         |`1500ms`| Touch: hold time while alternate text is visible |
| `INITIAL_DELAY_MS`|`1500ms`| Touch: pause before first cycle starts           |

### Character span style

Each character is wrapped in an `inline-block` `<span>` with `white-space: pre`
and `max-width: 2em`. Hidden state: `opacity: 0`, `filter: blur(6px)`,
`transform: translateY(3px)`, `max-width: 0`.

### Parenthesis style

- Opening `(`: permanent `margin-left: -1em` so it takes no layout space when
  invisible; no `max-width` collapse needed.
- Closing `)`: collapses via `max-width: 0 → 2em` when toggling visibility.
- Both transition on `opacity`, `filter`, and `transform` over `350ms`.

### Touch detection

```js
var isTouch = navigator.maxTouchPoints > 0;
```

### Re-trigger guard

A `busy` flag per element prevents the animation from being re-triggered while
already in progress.

### Embedding in Webflow

Loaded via a `<script>` tag in **Site Settings → Custom Code → Footer Code**.

#### ⚠️ Always use a commit SHA — never `@main`

jsDelivr caches `@main` aggressively. Pin to a specific commit SHA.

**Current script tag (commit `7dd7b278`):**
```html
<script src="https://cdn.jsdelivr.net/gh/nomoredesign/webflow-scripts@7dd7b278c88006ffe244ce8140941c29d62486d7/scripts/hover-animation.js"></script>
```

After every push, get the new SHA with:
```bash
curl -s -H "Authorization: token YOUR_TOKEN" \
  "https://api.github.com/repos/nomoredesign/webflow-scripts/commits?path=scripts/hover-animation.js&per_page=1" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['sha'])"
```

Then update the `src` in Webflow with the new SHA.

---

## `scripts/hover-animation-v4.js` — Auto-cycling headline animation (active)

This is the current production script, superseding `hover-animation.js` (archived to `archive/`).

### What it does

Auto-cycles between two headline text states on all devices. No hover interaction. A sibling `.plus-sign` element scales down during animation and back up when text is static.

### HTML attribute convention

```html
<h1 data-hover-headline="Default text here."
    data-hover-alternate="Alternate text.">
  Default text here.
</h1>
```

The `.plus-sign` element must be a sibling of the `<h1>` inside the same parent:

```html
<div class="animated-title">
  <h1 data-hover-headline="..." data-hover-alternate="...">...</h1>
  <div class="plus-sign">...</div>
</div>
```

The headline element must have `position: relative` set in CSS.

### Animation sequence

1. `.plus-sign` scales down to 0, open `(` fades in
2. Current text dissolves character by character **right → left**
3. New text reveals character by character **left → right** (with `)` as the last character)
4. `)` and `(` fade out, `.plus-sign` scales back up to 1

Brackets are visible **during animation only** — never at rest.

### Timing values

| Constant | Value | Purpose |
|---|---|---|
| `INITIAL_DELAY` | `2.5s` | Pause before first animation |
| `HOLD_TIME` | `2.5s` | How long each text state stays visible |
| `CHAR_DURATION` | `0.3s` | Blur-fade duration per character |
| `CHAR_STAGGER` | `0.05s` | Delay between each character starting |
| `PAREN_DURATION` | `0.35s` | Bracket fade duration |
| `PLUS_DURATION` | `0.35s` | `.plus-sign` scale duration |

### Embedding in Webflow

Loaded via Webflow's registered scripts (Site Settings → Custom Code). Uses GSAP which is available globally via Webflow — no separate GSAP import needed.

**Current script tag (commit `e0331d3e`):**
```html
<script src="https://cdn.jsdelivr.net/gh/nomoredesign/webflow-scripts@e0331d3efbb10652f118acbb3f1c977341ecc17c/scripts/hover-animation-v4.js"></script>
```

### File locations

```
/
├── archive/
│   └── hover-animation.js       ← v3 hover-triggered version (archived)
├── scripts/
│   ├── hero-animation.js
│   └── hover-animation-v4.js    ← active
|   └── cursor.js           ← custom cursor (active)
└── CLAUDE.md
```

---

## scripts/cursor.js — Custom cursor (active)

### What it does

Replaces the browser cursor with a branded custom cursor element (`.cursor`) that smoothly follows the mouse. It snaps to and matches the dimensions of hovered `<a>` links, mirrors the link's font-size on the two bracket elements, and inverts its colour scheme when the pointer enters any section with `data-scroll="dark"`.

### HTML required in Webflow

```html
<div class="cursor">
  <span class="bracket">(</span>
  <span class="bracket">)</span>
  <!-- dot-wrapper elements as needed -->
</div>
```

The `.cursor` element sits at the top of the `<body>` (outside the page scroll flow).

### CSS to paste into Site Settings > Custom Code > Head

```css
.cursor {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  pointer-events: none;
  z-index: 9999;
  opacity: 1;
  transition: opacity 0.3s ease;
  margin: 0 !important;
}
.cursor.is-snapping {
  transition: width 0.25s ease, height 0.25s ease,
              transform 0.25s ease, opacity 0.3s ease !important;
}
.cursor.is-hidden { opacity: 0; }

/* Add your own colour values for the dark-section scheme */
.cursor.is-dark { /* e.g. filter: invert(1); or swap CSS variables */ }
```

### Behaviour

| State | Class on `.cursor` | Effect |
|---|---|---|
| Default | — | Smooth lag follow at 15% easing per frame |
| Link hover | `is-snapping` | Snaps to link, matches width/height, bracket font-size matches link |
| Dark section | `is-dark` | Colour scheme toggled (define `.cursor.is-dark` CSS) |
| Off screen | `is-hidden` | opacity: 0 |

### Dark section detection (Feature 1)

On every `mousemove` event the script walks up the DOM from `e.target`. If any ancestor element has `data-scroll="dark"`, `is-dark` is added to `.cursor`. The class is removed as soon as the pointer leaves the dark section.

Apply `data-scroll="dark"` to any Webflow section or div that has a dark background:

```html
<section data-scroll="dark">...</section>
```

### Bracket font-size matching (Feature 2)

On `mouseenter` for each `<a>`, the script reads `getComputedStyle(link).fontSize` and applies it to both `.bracket` elements via inline `style.fontSize`. On `mouseleave` the inline style is cleared, restoring whatever CSS size the brackets have by default.

### Embedding in Webflow

Load via Site Settings > Custom Code > Footer Code.

⚠️ Always use a commit SHA — never @main

**Current script tag (commit `f885c58`):**
```html
<script src="https://cdn.jsdelivr.net/gh/nomoredesign/webflow-scripts@f885c581d3f126672e3ce93eb53e334abeb564bb/scripts/cursor.js"></script>
```

After every push, get the new SHA with:

```bash
curl -s -H "Authorization: token YOUR_TOKEN" \
  "https://api.github.com/repos/nomoredesign/webflow-scripts/commits?path=scripts/cursor.js&per_page=1" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['sha'])"
```
```

