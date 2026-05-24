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

  if (lines.every(({ key }) => wordBank[key].length === 0)) {
    console.warn("[hero] No words found — check data-hero-line attributes.");
    return;
  }

  console.log("[hero] Word banks loaded:", wordBank);

  // ── Inject shared character styles ───────────────────────────────────────
  const styleEl = document.createElement("style");
  styleEl.textContent = `
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
  document.head.appendChild(styleEl);

  // ── Timing ────────────────────────────────────────────────────────────────
  const CHAR_STAGGER_MS  = 22;
  const TRANSITION_MS    = 300;
  const HOLD_MS          = 1500;
  const INITIAL_DELAY_MS = 1500;

  // ── State ─────────────────────────────────────────────────────────────────
  const indices = { outputs: 0, clients: 0, style: 0 };

  // ── Font sizing ───────────────────────────────────────────────────────────
  function fitFontSize() {
    const h1Els = lines.map(({ attr }) => {
      const span = document.querySelector(`[data-hero-word="${attr}"]`);
      return span ? (span.closest("h1") || span.parentElement) : null;
    }).filter(Boolean);

    if (!h1Els.length) return;

    // Find the container: walk up from the first h1 until we find an element
    // wider than the h1 itself (i.e. the wrapping section/div)
    let container = h1Els[0].parentElement;
    while (container && container !== document.body) {
      const cw = container.getBoundingClientRect().width;
      const hw = h1Els[0].getBoundingClientRect().width;
      if (cw > hw) break;
      container = container.parentElement;
    }

    if (!container || container === document.body) {
      console.warn("[hero] Could not find a container wider than h1.");
      return;
    }

    const containerWidth = container.getBoundingClientRect().width;
    console.log("[hero] Container width:", containerWidth, container);

    // Probe element — measures text width at a known size
    const probe = document.createElement("span");
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;top:-9999px;left:-9999px;";
    document.body.appendChild(probe);

    const BASE = 100; // px reference size
    let smallestRatio = Infinity;

    h1Els.forEach((h1, i) => {
      const key = lines[i].key;
      const animSpan = document.querySelector(`[data-hero-word="${lines[i].attr}"]`);
      if (!animSpan) return;

      // Static text = full h1 text minus whatever is in the animated span
      const staticText = h1.innerText.replace(animSpan.innerText, "").trim();

      // Longest word by character count
      const longestWord = wordBank[key].reduce((a, b) =>
        a.length >= b.length ? a : b, "");

      const fullLine = `${staticText} ${longestWord}`;

      // Match h1 font exactly
      const cs = getComputedStyle(h1);
      probe.style.fontFamily   = cs.fontFamily;
      probe.style.fontWeight   = cs.fontWeight;
      probe.style.fontStyle    = cs.fontStyle;
      probe.style.letterSpacing = cs.letterSpacing;
      probe.style.fontSize     = BASE + "px";
      probe.textContent        = fullLine;

      const textWidth = probe.getBoundingClientRect().width;
      const ratio = (containerWidth / textWidth) * BASE;
      console.log(`[hero] Line ${i + 1}: "${fullLine}" → ${textWidth}px at ${BASE}px → ratio ${ratio.toFixed(1)}px`);
      if (ratio < smallestRatio) smallestRatio = ratio;
    });

    document.body.removeChild(probe);

    if (smallestRatio === Infinity) return;

    h1Els.forEach((h1) => {
      h1.style.fontSize = `${smallestRatio}px`;
    });

    console.log("[hero] Font size set to:", smallestRatio.toFixed(1) + "px");
  }

  fitFontSize();
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitFontSize, 100);
  });

  // ── Build char spans ──────────────────────────────────────────────────────
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

  // ── Animate IN (left → right) ─────────────────────────────────────────────
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

  // ── Animate OUT (right → left) ────────────────────────────────────────────
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

  // ── Main cycle ────────────────────────────────────────────────────────────
  async function cycle() {
    // 1. Lines animate IN one by one
    for (const { attr, key } of lines) {
      const target = document.querySelector(`[data-hero-word="${attr}"]`);
      if (!target) continue;
      const word  = wordBank[key][indices[key]];
      const spans = buildChars(target, word);
      await animateIn(spans);
    }

    // 2. Hold — all three visible
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
