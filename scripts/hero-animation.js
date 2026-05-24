/**
 * hero-animation.js
 * Nomoredesign 2026 — Hero section word cycling animation
 *
 * Cycles through CMS-driven words across three headline lines with a
 * per-character blur-fade transition. Words are sourced from hidden
 * Webflow CMS collection lists rendered on the page.
 *
 * Timing constants
 *   CHAR_STAGGER_MS   : 22   — delay between each character's animation
 *   TRANSITION_MS     : 300  — opacity / blur transition duration per char
 *   WORD_HOLD_MS      : 1000 — how long each word stays fully visible
 *   INITIAL_DELAY_MS  : 1500 — pause before the first cycle begins
 */

(function () {
  "use strict";

  // ─── Timing ────────────────────────────────────────────────────────────────
  const CHAR_STAGGER_MS  = 22;
  const TRANSITION_MS    = 300;
  const WORD_HOLD_MS     = 1000;
  const INITIAL_DELAY_MS = 1500;

  // ─── State ─────────────────────────────────────────────────────────────────
  // Maps line key → array of words pulled from the hidden CMS lists
  const wordBank = {
    outputs: [],
    clients: [],
    style:   [],
  };

  // Current word index per line (independent counters)
  const indices = { outputs: 0, clients: 0, style: 0 };

  // The three active word spans in the h1 elements, keyed by line order 1-3
  // Line 1 → outputs, Line 2 → clients, Line 3 → style
  const lineMap = [
    { attr: "1", key: "outputs" },
    { attr: "2", key: "clients" },
    { attr: "3", key: "style"   },
  ];

  // Which line index (0-based into lineMap) is currently animating
  let activeLine = 0;
  let animating  = false;

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Collect all words from the hidden CMS collection list spans.
   * Each span carries data-hero-line="outputs|clients|style".
   */
  function collectWords() {
    document.querySelectorAll("[data-hero-line]").forEach((el) => {
      const key  = el.getAttribute("data-hero-line");
      const word = el.textContent.trim();
      if (wordBank[key] !== undefined && word) {
        wordBank[key].push(word);
      }
    });
  }

  /**
   * Return the active display span for a given line attr ("1", "2", "3").
   */
  function getDisplaySpan(attr) {
    return document.querySelector(`[data-hero-word="${attr}"]`);
  }

  /**
   * Wrap each character of `text` in a <span> with inline transition styles,
   * appended into `container`. Characters start in their `startState`.
   *
   * @param {HTMLElement} container
   * @param {string}      text
   * @param {"in"|"out"} startState
   * @returns {HTMLSpanElement[]}  array of char spans in DOM order
   */
  function buildCharSpans(container, text, startState) {
    container.innerHTML = "";
    const spans = [];

    for (let i = 0; i < text.length; i++) {
      const s = document.createElement("span");
      s.textContent = text[i] === " " ? "\u00A0" : text[i];
      s.style.display    = "inline-block";
      s.style.overflow   = "hidden";
      s.style.transition = `opacity ${TRANSITION_MS}ms ease, filter ${TRANSITION_MS}ms ease, max-width ${TRANSITION_MS}ms ease, transform ${TRANSITION_MS}ms ease`;

      if (startState === "out") {
        // Visible state — ready to animate out
        s.style.opacity  = "1";
        s.style.filter   = "blur(0px)";
        s.style.maxWidth = "2em";
        s.style.transform = "translateY(0)";
      } else {
        // Hidden state — ready to animate in
        s.style.opacity  = "0";
        s.style.filter   = "blur(6px)";
        s.style.maxWidth = "0";
        s.style.transform = "translateY(4px)";
      }

      container.appendChild(s);
      spans.push(s);
    }

    return spans;
  }

  /**
   * Animate character spans OUT (right → left stagger).
   * Returns a Promise that resolves when all characters have finished.
   */
  function animateOut(spans) {
    return new Promise((resolve) => {
      const reversed = [...spans].reverse();
      reversed.forEach((s, i) => {
        setTimeout(() => {
          s.style.opacity   = "0";
          s.style.filter    = "blur(6px)";
          s.style.maxWidth  = "0";
          s.style.transform = "translateY(-4px)";
        }, i * CHAR_STAGGER_MS);
      });

      const totalDelay = reversed.length * CHAR_STAGGER_MS + TRANSITION_MS;
      setTimeout(resolve, totalDelay);
    });
  }

  /**
   * Animate character spans IN (left → right stagger).
   * Returns a Promise that resolves when all characters have finished.
   */
  function animateIn(spans) {
    return new Promise((resolve) => {
      spans.forEach((s, i) => {
        setTimeout(() => {
          s.style.opacity   = "1";
          s.style.filter    = "blur(0px)";
          s.style.maxWidth  = "2em";
          s.style.transform = "translateY(0)";
        }, i * CHAR_STAGGER_MS);
      });

      const totalDelay = spans.length * CHAR_STAGGER_MS + TRANSITION_MS;
      setTimeout(resolve, totalDelay);
    });
  }

  /**
   * Perform one full cycle: animate the current word out, swap to the next
   * word, animate in.
   *
   * @param {{ attr: string, key: string }} line
   */
  async function cycleWord(line) {
    const span = getDisplaySpan(line.attr);
    if (!span) return;

    const bank = wordBank[line.key];
    if (!bank || bank.length < 2) return;

    // Advance index
    indices[line.key] = (indices[line.key] + 1) % bank.length;
    const nextWord = bank[indices[line.key]];

    // Build out-spans from current text content
    const outSpans = buildCharSpans(span, span.textContent.trim(), "out");

    // Animate out
    await animateOut(outSpans);

    // Build in-spans for next word
    const inSpans = buildCharSpans(span, nextWord, "in");

    // Animate in
    await animateIn(inSpans);

    // Replace span content with plain text so it stays consistent
    // (we leave the spans in place — they're already in their final visible state)
  }

  /**
   * Main loop — cycles through lines 1 → 2 → 3 → 1 → …
   */
  async function tick() {
    if (animating) return;
    animating = true;

    const line = lineMap[activeLine];
    await cycleWord(line);

    activeLine = (activeLine + 1) % lineMap.length;

    // Hold before next cycle step
    setTimeout(() => {
      animating = false;
      setTimeout(tick, WORD_HOLD_MS);
    }, 0);
  }

  // ─── Initialise ────────────────────────────────────────────────────────────

  function init() {
    collectWords();

    // Seed the display spans with the first word from each bank so they match
    // whatever the designer set as the initial CMS value (no forced replacement
    // needed if the Webflow static text already matches index 0).

    // Kick off the animation loop after the initial delay
    setTimeout(tick, INITIAL_DELAY_MS);
  }

  // Wait for DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
