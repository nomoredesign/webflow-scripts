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
  const HOLD_MS          = 1500; // how long all three lines sit together before clearing
  const INITIAL_DELAY_MS = 1500;

  // ── State ─────────────────────────────────────────────────────────────────
  const indices = { outputs: 0, clients: 0, style: 0 };

  // ── Build char spans into a target element (hidden state) ─────────────────
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

  // ── Animate chars IN (left → right) ──────────────────────────────────────
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

  // ── Animate chars OUT (right → left) ─────────────────────────────────────
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

  // ── Get the char spans currently in a target ──────────────────────────────
  function getSpans(target) {
    return Array.from(target.querySelectorAll(".hw-char"));
  }

  // ── Main loop ─────────────────────────────────────────────────────────────
  async function cycle() {
    // 1. Animate each line IN, one after another
    for (const { attr, key } of lines) {
      const target = document.querySelector(`[data-hero-word="${attr}"]`);
      if (!target) continue;

      const word  = wordBank[key][indices[key]];
      const spans = buildChars(target, word);
      await animateIn(spans);
    }

    // 2. Hold — all three lines visible together
    await new Promise((r) => setTimeout(r, HOLD_MS));

    // 3. Animate all three lines OUT simultaneously
    const allTargets = lines.map(({ attr }) =>
      document.querySelector(`[data-hero-word="${attr}"]`)
    ).filter(Boolean);

    // Kick off all three out-animations at the same time, wait for the longest
    const longestOut = Math.max(
      ...allTargets.map((t) => getSpans(t).length)
    );
    allTargets.forEach((t) => animateOut(getSpans(t)));
    await new Promise((r) =>
      setTimeout(r, longestOut * CHAR_STAGGER_MS + TRANSITION_MS)
    );

    // 4. Advance word indices and clear targets
    lines.forEach(({ attr, key }) => {
      indices[key] = (indices[key] + 1) % wordBank[key].length;
      const target = document.querySelector(`[data-hero-word="${attr}"]`);
      if (target) target.textContent = "";
    });

    // 5. Repeat
    cycle();
  }

  setTimeout(cycle, INITIAL_DELAY_MS);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHeroAnimation);
} else {
  initHeroAnimation();
}
