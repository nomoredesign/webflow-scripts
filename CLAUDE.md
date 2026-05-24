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
├── CLAUDE.md                  ← this file
└── scripts/
    └── hero-animation.js      ← the animation script
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
