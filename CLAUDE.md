# CLAUDE.md — nomoredesign 2026 Hero Animation

This file is a persistent brief for Claude Code sessions working on this project.
Always read it at the start of any session before touching any code.

---

## What the script does

`scripts/hero-animation.js` drives the animated headline on the nomoredesign 2026
landing page. Three `<h1>` elements each contain a single word that cycles through
a CMS-driven word bank. One line cycles at a time in a fixed rotation
(line 1 → line 2 → line 3 → line 1 → …). Each transition uses a per-character
blur-fade effect: characters leave the screen right-to-left and arrive left-to-right.

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

| Constant          | Value   | Purpose                                          |
|-------------------|---------|--------------------------------------------------|
| `CHAR_STAGGER_MS` | `22ms`  | Delay between each character's animation start  |
| `TRANSITION_MS`   | `300ms` | CSS transition duration per character            |
| `WORD_HOLD_MS`    | `1000ms`| How long the new word stays visible before the next cycle |
| `INITIAL_DELAY_MS`| `1500ms`| Pause after page load before animation starts   |

### Out animation (right → left)

Each character transitions to: `opacity: 0`, `filter: blur(6px)`, `max-width: 0`,
`transform: translateY(-4px)`.

### In animation (left → right)

Each character transitions to: `opacity: 1`, `filter: blur(0px)`, `max-width: 2em`,
`transform: translateY(0)`.

---

## Where the code is embedded in Webflow

The script is pasted into **Site Settings → Custom Code → Footer Code** (or the
equivalent per-page embed block on the home page). It runs after the DOM is ready
via a `DOMContentLoaded` listener with an `init()` fallback for already-loaded
documents.

The hidden CMS collection lists must be present in the DOM **before** the script
runs so that `collectWords()` can populate the word banks on initialisation.

---

## File locations

```
/
├── CLAUDE.md                  ← this file
└── scripts/
    └── hero-animation.js      ← the animation script
```

---

## Notes for future sessions

- Do **not** alter `CHAR_STAGGER_MS` or `TRANSITION_MS` without re-testing on
  mobile — the stagger total (`chars × 22ms`) can exceed the perceived hold time
  on very long words.
- The script is self-contained (no dependencies) and uses an IIFE to avoid
  polluting the global scope.
- Word banks are collected once on init. If CMS words change after page load,
  a full reload is required.
- `indices` tracks the current word position per line independently, so all three
  lines can be at different positions in their word banks at any time.
