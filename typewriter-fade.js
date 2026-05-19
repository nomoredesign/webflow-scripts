function initTypewriter() {
  function getWordsFromList(selector) {
    const elements = document.querySelectorAll(`${selector} [data-word]`);
    return Array.from(elements).map((el) => el.textContent.trim());
  }

  const listDesigning = getWordsFromList(".list-designing");
  const listFor = getWordsFromList(".list-for");
  const listWith = getWordsFromList(".list-with");

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

  // Inject styles for fade + slide transition
  const style = document.createElement("style");
  style.textContent = `
    .type-line-1,
    .type-line-2,
    .type-line-3 {
      display: inline-block;
      transition: opacity 0.35s ease, filter 0.35s ease;
    }
    .type-line-1.tw-hidden,
    .type-line-2.tw-hidden,
    .type-line-3.tw-hidden {
      opacity: 0;
      filter: blur(6px);
    }
    .type-line-1.tw-visible,
    .type-line-2.tw-visible,
    .type-line-3.tw-visible {
      opacity: 1;
      filter: blur(0);
    }
  `;
  document.head.appendChild(style);

  // Start all targets hidden
  targets.forEach((t) => {
    if (t) t.classList.add("tw-hidden");
  });

  const typeSpeed = 100;
  const eraseSpeed = 40;
  const delayBetween = 2500;
  const fadeDuration = 350; // matches CSS transition (ms)

  let currentCycleIndex = 0;
  let currentIndices = [0, 0, 0];
  let isDeleting = false;

  function setVisible(target, visible) {
    if (!target) return;
    target.classList.toggle("tw-hidden", !visible);
    target.classList.toggle("tw-visible", visible);
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

      // Fade in as soon as a line starts typing, fade out as it finishes erasing
      if (currentIndices[i] > 0) {
        setVisible(target, true);
      } else {
        setVisible(target, false);
      }
    });

    let nextTimeout = isDeleting ? eraseSpeed : typeSpeed;

    if (!isDeleting && currentIndices.every((val, i) => val === currentPhrases[i].length)) {
      isDeleting = true;
      nextTimeout = delayBetween;
    } else if (isDeleting && currentIndices.every((val) => val === 0)) {
      isDeleting = false;
      currentCycleIndex = (currentCycleIndex + 1) % maxCycles;
      // Small pause after fade out before next cycle starts typing
      nextTimeout = fadeDuration + 100;
    }

    setTimeout(typeEffect, nextTimeout);
  }

  // Brief delay on load so initial fade-in is visible
  setTimeout(typeEffect, 300);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTypewriter);
} else {
  initTypewriter();
}
