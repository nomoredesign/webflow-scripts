// cursor.js - nomoredesign 2026 custom cursor
// v2.0.0
//
// Your original cursor script with two additions:
//   1. Bracket font-size matches the hovered link computed font-size
//   2. is-dark class toggled when cursor is inside [data-scroll="dark"] sections
//
// CSS to add to Webflow Site Settings > Custom Code > Head:
//
// .cursor {
//   position: fixed !important;
//   top: 0 !important;
//   left: 0 !important;
//   pointer-events: none;
//   z-index: 9999;
//   opacity: 1;
//   transition: opacity 0.3s ease;
//   margin: 0 !important;
// }
// .cursor.is-snapping {
//   transition: width 0.25s ease, height 0.25s ease, transform 0.25s ease, opacity 0.3s ease !important;
// }
// .cursor.is-hidden { opacity: 0; }
// .cursor.is-dark .bracket { color: #fff; }
// .cursor.is-dark .dot { background: #fff; }

const cursor   = document.querySelector('.cursor');
const brackets = document.querySelectorAll('.cursor .bracket');
const links    = document.querySelectorAll('a');

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

document.addEventListener('mouseleave', () => {
  cursor.classList.add('is-hidden');
});

document.addEventListener('mouseenter', () => {
  cursor.classList.remove('is-hidden');
});

function animate() {
  if (!isSnapped) {
    cursorX += (mouseX - cursorX) * 0.15;
    cursorY += (mouseY - cursorY) * 0.15;
    cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;
  } else if (activeLink) {
    const rect    = activeLink.getBoundingClientRect();
    const centerX = rect.left + (rect.width  / 2);
    const centerY = rect.top  + (rect.height / 2);
    cursorX = centerX;
    cursorY = centerY;
    cursor.style.transform = `translate3d(${centerX}px, ${centerY}px, 0) translate(-50%, -50%)`;
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

    // Match bracket font-size to this link
    const fs = parseFloat(window.getComputedStyle(link).fontSize);
    brackets.forEach(b => { b.style.fontSize = fs + 'px'; });
  });

  link.addEventListener('mouseleave', () => {
    activeLink = null;
    cursor.style.width  = '20px';
    cursor.style.height = '20px';

    // Reset bracket font-size
    brackets.forEach(b => { b.style.fontSize = ''; });

    snapTimer = setTimeout(() => {
      cursor.classList.remove('is-snapping');
      isSnapped = false;
      snapTimer = null;
    }, 250);
  });
});
