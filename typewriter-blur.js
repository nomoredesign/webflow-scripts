function initTypewriter() {
  function getWordsFromList(selector) {
    const elements = document.querySelectorAll(`${selector} [data-word]`);
    return Array.from(elements).map((el) => el.textContent.trim());
  }

  const listDesigning = getWordsFromList(".list-designing");
  const listFor       = getWordsFromList(".list-for");
  const listWith      = getWordsFromList(".list-with");

  const maxCycles = Math.max(
    listDesigning.length,
    listFor.length,
    listWith.length
  );

  if (maxCycles === 0) return;

  const targets = [
    document.querySelector(".type-line-1"),
    document.querySelector(".type-line-2"),
    document.querySelector(".type-line-3"),
  ];

  // Inject styles — blur and opacity transition tied to a CSS variable
  // so we can drive them smoothly as typing progresses
  const style = document.createElement("style");
  style.textContent = `
    .type-line-1,
    .type-line-2,
    .type-line-3 {
      display: inline-block;
      transition: opacity 0.15s ease, filter 0.15s ease;
    }
  `;
  document.head.appendChild(style);

  const typeSpeed    = 100;
  const eraseSpeed   = 40;
  const delayBetween = 2500;

  let currentCycleIndex = 0;
  let currentIndices = [0, 0, 0];
  let isDeleting = false;

  // Max blur at 0 chars, 0 blur when fully typed
  const maxBlur = 8; // px

  function applyBlur(target, charsTyped, totalChars) {
    if (!target) return;
    const progress = totalChars === 0 ? 1 : charsTyped / totalChars;
    const blur     = maxBlur * (1 - progress);
    const opacity  = 0.2 + 0.8 * progress; // fade from 0.2 → 1 as it types in
    target.style.filter  = `blur(${blur.toFixed(2)}px)`;
    target.style.opacity = opacity.toFixed(3);
  }

  function typeEffect() {
    const rawPhrases = [
      listDesigning[currentCycleIndex % listDesigning.length] || "",
      listFor[currentCycleIndex % listFor.length] || "",
      listWith[currentCycleIndex % listWith.length] || "",
    ];

    const currentPhrases = rawPhrases.map((str) => [...str]);

    targets.forEach((target, i) => {
      if (!target) return;
      const fullTextArray = currentPhrases[i];

      if (!isDeleting) {
        let canType = false;
        if (i === 0) canType = true;
        if (i === 1 && currentIndices[0] === currentPhrases[0].length) canType = true;
        if (i === 2 && currentIndices[1] === currentPhrases[1].length) canType = true;

        if (canType && currentIndices[i] < fullTextArray.length) {
          currentIndices[i]++;
        }
      } else {
        if (currentIndices[i] > 0) {
          currentIndices[i]--;
        }
      }

      target.textContent = fullTextArray.slice(0, currentIndices[i]).join("");
      applyBlur(target, currentIndices[i], fullTextArray.length);
    });

    let nextTimeout = isDeleting ? eraseSpeed : typeSpeed;

    if (!isDeleting && currentIndices.every((val, i) => val === currentPhrases[i].length)) {
      isDeleting = true;
      nextTimeout = delayBetween;
    } else if (isDeleting && currentIndices.every((val) => val === 0)) {
      isDeleting = false;
      currentCycleIndex = (currentCycleIndex + 1) % maxCycles;
      nextTimeout = 100;
    }

    setTimeout(typeEffect, nextTimeout);
  }

  setTimeout(typeEffect, 300);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTypewriter);
} else {
  initTypewriter();
}
