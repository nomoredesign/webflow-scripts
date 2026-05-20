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

  const style = document.createElement("style");
  style.textContent = `
    .tw-char {
      display: inline-block;
      overflow: hidden;
      width: 0;
      opacity: 0;
      filter: blur(8px);
      transition: opacity 0.4s ease, filter 0.4s ease, width 0.1s ease;
      white-space: pre;
      vertical-align: bottom;
    }
    .tw-char.tw-in {
      opacity: 1;
      filter: blur(0px);
      /* width is set inline to the character's natural width */
    }
  `;
  document.head.appendChild(style);

  const typeSpeed    = 100;
  const eraseSpeed   = 40;
  const delayBetween = 2500;

  let currentCycleIndex = 0;
  let currentIndices = [0, 0, 0];
  let isDeleting = false;

  function buildChars(target, charArray) {
    target.innerHTML = "";
    charArray.forEach((ch) => {
      const span = document.createElement("span");
      span.className = "tw-char";
      span.textContent = ch;
      target.appendChild(span);
    });
  }

  function showChar(target, i) {
    const span = target.children[i];
    if (!span) return;
    // Measure natural width before it's visible
    span.style.width = "auto";
    span.style.overflow = "visible";
    const naturalWidth = span.getBoundingClientRect().width;
    span.style.width = "0";
    span.style.overflow = "hidden";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        span.classList.add("tw-in");
        span.style.width = naturalWidth + "px";
      });
    });
  }

  function hideChar(target, i) {
    const span = target.children[i];
    if (!span) return;
    span.classList.remove("tw-in");
    span.style.width = "0";
  }

  function typeEffect() {
    const rawPhrases = [
      listDesigning[currentCycleIndex % listDesigning.length] || "",
      listFor[currentCycleIndex % listFor.length] || "",
      listWith[currentCycleIndex % listWith.length] || "",
    ];

    const currentPhrases = rawPhrases.map((str) => [...str]);

    if (!isDeleting && currentIndices.every((v) => v === 0)) {
      targets.forEach((target, i) => {
        if (target) buildChars(target, currentPhrases[i]);
      });
    }

    targets.forEach((target, i) => {
      if (!target) return;
      const fullTextArray = currentPhrases[i];

      if (!isDeleting) {
        let canType = false;
        if (i === 0) canType = true;
        if (i === 1 && currentIndices[0] === currentPhrases[0].length) canType = true;
        if (i === 2 && currentIndices[1] === currentPhrases[1].length) canType = true;

        if (canType && currentIndices[i] < fullTextArray.length) {
          showChar(target, currentIndices[i]);
          currentIndices[i]++;
        }
      } else {
        if (currentIndices[i] > 0) {
          currentIndices[i]--;
          hideChar(target, currentIndices[i]);
        }
      }
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
