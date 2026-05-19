document.addEventListener("DOMContentLoaded", function() {
  // Helper function to extract array of strings from a collection list
  function getWordsFromList(selector) {
    const elements = document.querySelectorAll(`${selector} [data-word]`);
    return Array.from(elements).map(el => el.textContent.trim());
  }

  // 1. Fetch the filtered words from the 3 Webflow CMS lists
  const listDesigning = getWordsFromList('.list-designing');
  const listFor = getWordsFromList('.list-for');
  const listWith = getWordsFromList('.list-with');

  // Find the maximum length among lists to know when to reset the main loop
  const maxCycles = Math.max(listDesigning.length, listFor.length, listWith.length);
  
  if (maxCycles === 0) return; // Exit if no data

  // Target spans where the typing animation happens
  const targets = [
    document.querySelector('.type-line-1'),
    document.querySelector('.type-line-2'),
    document.querySelector('.type-line-3')
  ];

  // Configuration
  const typeSpeed = 100;      // Time per letter typing (ms)
  const eraseSpeed = 40;     // Time per letter erasing (ms)
  const delayBetween = 1750; // How long to stay fully typed out (ms)
  
  let currentCycleIndex = 0;
  let currentIndices = [0, 0, 0];
  let isDeleting = false;

  function typeEffect() {
    // Safely grab the raw words for this cycle
    const rawPhrases = [
      listDesigning[currentCycleIndex % listDesigning.length] || '',
      listFor[currentCycleIndex % listFor.length] || '',
      listWith[currentCycleIndex % listWith.length] || ''
    ];

    // Convert strings to true character arrays to prevent Emoji slicing bugs
    const currentPhrases = rawPhrases.map(str => [...str]);

    // Update the DOM
    targets.forEach((target, i) => {
      if (!target) return;
      const fullTextArray = currentPhrases[i];
      
      if (!isDeleting) {
        // CONSECUTIVE TYPING LOGIC: 
        // Only type line 2 if line 1 is done. Only type line 3 if line 2 is done.
        let canType = false;
        if (i === 0) canType = true;
        if (i === 1 && currentIndices[0] === currentPhrases[0].length) canType = true;
        if (i === 2 && currentIndices[1] === currentPhrases[1].length) canType = true;

        if (canType && currentIndices[i] < fullTextArray.length) {
          currentIndices[i]++;
        }
      } else {
        // SIMULTANEOUS ERASING LOGIC: All lines erase backward at the same time
        if (currentIndices[i] > 0) {
          currentIndices[i]--;
        }
      }
      
      // Join the safe array back together up to the current typed index
      target.textContent = fullTextArray.slice(0, currentIndices[i]).join('');
    });

    // Pacing logic
    let nextTimeout = isDeleting ? eraseSpeed : typeSpeed;

    // Condition: The very last line has finished typing out completely
    if (!isDeleting && currentIndices.every((val, i) => val === currentPhrases[i].length)) {
      isDeleting = true;
      nextTimeout = delayBetween; // Pause so the user can read the full statement
    } 
    // Condition: All lines have finished erasing simultaneously
    else if (isDeleting && currentIndices.every(val => val === 0)) {
      isDeleting = false;
      // Increment to the next index group, looping cleanly back to 0
      currentCycleIndex = (currentCycleIndex + 1) % maxCycles; 
    }

    setTimeout(typeEffect, nextTimeout);
  }

  // Fire up the typewriter engine!
  typeEffect();
});
