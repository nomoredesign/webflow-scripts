// cursor.js - nomoredesign 2026 custom cursor
// v2.3.0
//
// Original script + two additions only:
//   1. Bracket font-size + line-height matches hovered link
//   2. is-dark class toggled when inside [data-scroll="dark"] sections
//
// Position strategy: cursorX/Y is always the top-left of the cursor box.
// Free: top-left = mouse - halfSize (centres cursor on pointer).
// Snapped: top-left = rect.left/top (aligns cursor exactly to link bounds).
// No translate(-50%,-50%) — that breaks alignment when cursor size changes.
//
// CSS for Webflow Site Settings > Custom Code > Head:
//
// .cursor {
//   position: fixed !important;
//   top: 0 !important;
//   left: 0 !important;
//   pointer-events: none;
//   z-index: 9999;
//   opacity: 1;
//   transition: opacity 0.3s ease !important;
//   margin: 0 !important;
// }
// .cursor.is-snapping {
//   transition: width 0.25s ease, height 0.25s ease, transform 0.25s ease, opacity 0.3s ease !important;
// }
// .cursor.is-hidden { opacity: 0; }
// .cursor.is-dark {
//   --color-scheme-1--text: var(--_primitives---colors--white);
//   --color-scheme-1--background: var(--_primitives---colors--neutral-darkest);
// }

const cursor   = document.querySelector('.cursor');
const brackets = document.querySelectorAll('.cursor .bracket');
const links    = document.querySelectorAll('a');

// Read the cursor's natural half-size once (CSS sets it to 2rem)
const halfSize = cursor.offsetWidth / 2;

let mouseX = 0, mouseY = 0;
let cursorX = 0, cursorY = 0;
let isSnapped  = false;
let snapTimer  = null;
let activeLink = null;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;

  // Dark mode: walk up from element under pointer, look for data-scroll="dark"
  let el = document.elementFromPoint(mouseX, mouseY);
  let isDark = false;
  while (el && el !== document.documentElement) {
    if (el.dataset && el.dataset.scroll === 'dark') { isDark = true; break; }
    el = el.parentElement;
  }
  cursor.classList.toggle('is-dark', isDark);
});

document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
document.addEventListener('mouseenter', () => cursor.classList.remove('is-hidden'));

function animate() {
  if (!isSnapped) {
    // Lag-follow: track top-left = mouse minus half the natural cursor size
    const targetX = mouseX - halfSize;
    const targetY = mouseY - halfSize;
    cursorX += (targetX - cursorX) * 0.05;
    cursorY += (targetY - cursorY) * 0.05;
    cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
  } else if (activeLink) {
    // Snap to link top-left exactly
    const rect = activeLink.getBoundingClientRect();
    cursorX = rect.left;
    cursorY = rect.top;
    cursor.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
    cursor.style.width  = `${rect.width}px`;
    cursor.style.height = `${rect.height}px`;
  }
  requestAnimationFrame(animate);
}

animate();

links.forEach(link => {
  link.addEventListener('mouseenter', () => {
    if (snapTimer) clearTimeout(snapTimer);
    activeLink = link;
    isSnapped  = true;
    cursor.classList.add('is-snapping');

    // Match bracket font-size and line-height to this link
    const cs = window.getComputedStyle(link);
    brackets.forEach(b => {
      b.style.fontSize   = cs.fontSize;
      b.style.lineHeight = cs.lineHeight;
    });
  });

  link.addEventListener('mouseleave', () => {
    activeLink = null;
    // Empty string reverts to CSS-defined size (2rem)
    cursor.style.width  = '';
    cursor.style.height = '';

    // Reset bracket styles
    brackets.forEach(b => {
      b.style.fontSize   = '';
      b.style.lineHeight = '';
    });

    snapTimer = setTimeout(() => {
      cursor.classList.remove('is-snapping');
      isSnapped = false;
      snapTimer = null;
    }, 250);
  });
});

