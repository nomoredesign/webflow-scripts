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
  const HOLD_MS          = 1500;
  const INITIAL_DELAY_MS = 1500;

  // ── State ─────────────────────────────────────────────────────────────────
  const indices = { outputs: 0, clients: 0, style: 0 };

  // ── Font sizing ───────────────────────────────────────────────────────────
  // Finds the longest full line string (static + longest word) and scales
  // font-size so that line fills the container width exactly.
  function fitFontSize() {
    const targets = lines.map(({ attr }) =>
      document.querySelector(`[data-hero-word="${attr}"]`)
    );
    const container = targets[0] && targets[0].closest("[data-hero-container]");
    if (!container) return;

    const containerWidth = container.getBoundingClientRect().width;
    if (!containerWidth) return;

    // Use a hidden probe element to measure text at a known font size
    const probe = document.createElement("span");
    probe.style.cssText = [
      "position:absolute",
      "visibility:hidden",
      "white-space:nowrap",
      "font-family:inherit",
      "font-weight:inherit",
      "font-size:100px",
      "letter-spacing:inherit",
    ].join(";");
    document.body.appendChild(probe);

    const baseSize = 100; // px — probe reference size
    let smallestRatio = Infinity;

    targets.forEach((target, i) => {
      if (!target) return;
      const key = lines[i].key;

      // Get the full h1 text including static prefix
      const h1 = target.closest("h1") || target.parentElement;
      if (!h1) return;

      // Measure the static part (everything except the animated span)
      const staticText = h1.textContent.replace(target.textContent, "").trim();

      // Find the longest word in this line's word bank
      const longestWord = wordBank[key].reduce((a, b) =>
        a.length >= b.length ? a : b, ""
      );

      // Full line = static text + space + longest word (with brackets if used)
      const fullLine = `${staticText} ${longestWord}`;

      probe.style.font = getComputedStyle(h1).font;
      probe.textContent = fullLine;
      const textWidth = probe.getBoundingClientRect().width;

      const ratio = (containerWidth / textWidth) * baseSize;
      if (ratio < smallestRatio) smallestRatio = ratio;
    });

    document.body.removeChild(probe);

    if (smallestRatio === Infinity) return;

    // Apply font size to all h1 elements
    targets.forEach((target) => {
      const h1 = target && (target.closest("h1") || target.parentElement);
      if (h1) h1.style.fontSize = `${smallestRatio}px`;
    });
  }

  // Run on load and on resize (debounced)
  fitFontSize();
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitFontSize, 100);
  });

  // ── Build char spans into a target element (hidden) ───────────────────────
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

  function getSpans(target) {
    return Array.from(target.querySelectorAll(".hw-char"));
  }

  // ── Main loop ─────────────────────────────────────────────────────────────
  async function cycle() {
    // 1. Lines animate IN one by one
    for (const { attr, key } of lines) {
      const target = document.querySelector(`[data-hero-word="${attr}"]`);
      if (!target) continue;
      const word  = wordBank[key][indices[key]];
      const spans = buildChars(target, word);
      await animateIn(spans);
    }

    // 2. All three hold together
    await new Promise((r) => setTimeout(r, HOLD_MS));

    // 3. All three animate OUT simultaneously
    const allTargets = lines
      .map(({ attr }) => document.querySelector(`[data-hero-word="${attr}"]`))
      .filter(Boolean);

    const longestOut = Math.max(...allTargets.map((t) => getSpans(t).length));
    allTargets.forEach((t) => animateOut(getSpans(t)));
    await new Promise((r) =>
      setTimeout(r, longestOut * CHAR_STAGGER_MS + TRANSITION_MS)
    );

    // 4. Advance indices and clear
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
