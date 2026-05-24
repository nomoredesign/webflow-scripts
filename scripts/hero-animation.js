function initHeroAnimation() {

  // ── Collect words from hidden CMS list spans ──────────────────────────────
  function getWords(lineKey) {
    return Array.from(
      document.querySelectorAll(`[data-hero-line="${lineKey}"]`)
    ).map((el) => el.textContent.trim()).filter(Boolean);
  }

  const wordBank = {
    outputs: getWords("outputs"),
    clients: getWords("clients"),
    style:   getWords("style"),
  };

  // Line order: 1 → outputs, 2 → clients, 3 → style
  const lines = [
    { attr: "1", key: "outputs" },
    { attr: "2", key: "clients" },
    { attr: "3", key: "style"   },
  ];

  // Bail if no words found
  if (lines.every(({ key }) => wordBank[key].length === 0)) return;

  // ── Inject shared character styles ───────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    .hw-char {
      display: inline-block;
      overflow: hidden;
      max-width: 0;
      opacity: 0;
      filter: blur(6px);
      transition: opacity 0.3s ease, filter 0.3s ease, max-width 0.3s ease, transform 0.3s ease;
      white-space: pre;
      vertical-align: bottom;
    }
    .hw-char.hw-in {
      opacity: 1;
      filter: blur(0px);
      max-width: 2em;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);

  // ── Timing ────────────────────────────────────────────────────────────────
  const CHAR_STAGGER_MS  = 22;
  const TRANSITION_MS    = 300;
  const WORD_HOLD_MS     = 1000;
  const INITIAL_DELAY_MS = 1500;

  // ── State ─────────────────────────────────────────────────────────────────
  const indices   = { outputs: 0, clients: 0, style: 0 };
  let activeLine  = 0;
  let cycling     = false;

  // ── Build char spans into a target element ────────────────────────────────
  function buildChars(target, word) {
    target.innerHTML = "";
    return Array.from(word).map((ch) => {
      const span = document.createElement("span");
      span.className   = "hw-char";
      span.textContent = ch === " " ? "\u00A0" : ch;
      span.style.transform = "translateY(4px)";
      target.appendChild(span);
      return span;
    });
  }

  // ── Animate all chars OUT (right → left stagger) ──────────────────────────
  function animateOut(spans) {
    return new Promise((resolve) => {
      [...spans].reverse().forEach((s, i) => {
        setTimeout(() => {
          s.classList.remove("hw-in");
          s.style.transform = "translateY(-4px)";
        }, i * CHAR_STAGGER_MS);
      });
      setTimeout(resolve, spans.length * CHAR_STAGGER_MS + TRANSITION_MS);
    });
  }

  // ── Animate all chars IN (left → right stagger) ───────────────────────────
  function animateIn(spans) {
    return new Promise((resolve) => {
      spans.forEach((s, i) => {
        setTimeout(() => {
          s.classList.add("hw-in");
          s.style.transform = "translateY(0)";
        }, i * CHAR_STAGGER_MS);
      });
      setTimeout(resolve, spans.length * CHAR_STAGGER_MS + TRANSITION_MS);
    });
  }

  // ── Cycle one line to its next word ───────────────────────────────────────
  async function cycleLine({ attr, key }) {
    const target = document.querySelector(`[data-hero-word="${attr}"]`);
    if (!target) return;

    const bank = wordBank[key];
    if (!bank || bank.length < 2) return;

    // Build the current word as char spans (visible) so we can animate out
    const currentWord = target.textContent.trim();
    const outSpans    = buildChars(target, currentWord);

    // Snap to visible state without transition
    outSpans.forEach((s) => {
      s.style.transition = "none";
      s.classList.add("hw-in");
      s.style.transform  = "translateY(0)";
    });

    // Re-enable transitions on next frame
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    outSpans.forEach((s) => (s.style.transition = ""));

    // Animate out
    await animateOut(outSpans);

    // Advance to next word
    indices[key] = (indices[key] + 1) % bank.length;
    const nextWord = bank[indices[key]];

    // Build new word chars (hidden) and animate in
    const inSpans = buildChars(target, nextWord);
    await animateIn(inSpans);

    // Replace with plain text so it's clean for the next cycle
    target.textContent = nextWord;
  }

  // ── Main loop ─────────────────────────────────────────────────────────────
  async function tick() {
    if (cycling) return;
    cycling = true;

    await cycleLine(lines[activeLine]);
    activeLine = (activeLine + 1) % lines.length;

    cycling = false;
    setTimeout(tick, WORD_HOLD_MS);
  }

  setTimeout(tick, INITIAL_DELAY_MS);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHeroAnimation);
} else {
  initHeroAnimation();
}
