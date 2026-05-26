// cursor.js - nomoredesign 2026 custom cursor
// v1.4.0
//
// Features:
//   1. Smooth-follows the mouse with a lag factor
//   2. Snaps to & matches the size of hovered <a> elements (eased transition)
//   3. Brackets font-size matches the hovered link computed font-size
//   4. Colour scheme inverts (is-dark class) inside [data-scroll="dark"] sections
//   5. Self-contained: injects its own CSS
//   6. Uses event delegation so marquee clones work without re-binding
//
// HTML required in Webflow:
//   <div class="cursor">
//     <span class="bracket">(</span>
//     <span class="bracket">)</span>
//   </div>
//
// Webflow .cursor element settings:
//   Position: Fixed, Top: 0, Left: 0, z-index: 9999,
//   Width/Height: 2rem, Pointer events: None, Margin: 0

(function () {
  'use strict';

  var cursor   = document.querySelector('.cursor');
  var brackets = document.querySelectorAll('.cursor .bracket');

  if (!cursor) return;

  // Inject CSS
  var style = document.createElement('style');
  style.textContent =
    '.cursor {' +
    '  position: fixed !important;' +
    '  top: 0 !important;' +
    '  left: 0 !important;' +
    '  pointer-events: none !important;' +
    '  z-index: 9999 !important;' +
    '  margin: 0 !important;' +
    '  opacity: 1;' +
    '  transition: opacity 0.3s ease;' +
    '}' +
    '.cursor.is-snapping {' +
    '  transition: width 0.25s ease, height 0.25s ease, opacity 0.3s ease !important;' +
    '}' +
    '.cursor.is-hidden { opacity: 0 !important; }' +
    '.cursor.is-dark .bracket { color: #fff; }' +
    '.cursor.is-dark .dot { background: #fff; }';
  document.head.appendChild(style);

  // Move to body root so position:fixed is not broken by transformed ancestors
  document.body.appendChild(cursor);

  // State
  var mouseX = 0, mouseY = 0;
  var cursorX = 0, cursorY = 0;
  var lag = 0.12;
  var currentLink = null;

  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  document.addEventListener('mouseleave', function () {
    cursor.classList.add('is-hidden');
  });
  document.addEventListener('mouseenter', function () {
    cursor.classList.remove('is-hidden');
  });

  // Event delegation - works for all <a> tags including dynamically cloned ones
  document.addEventListener('mouseover', function (e) {
    var link = e.target.closest('a');
    if (!link || link === currentLink) return;
    currentLink = link;
    var rect = link.getBoundingClientRect();
    var fs = parseFloat(window.getComputedStyle(link).fontSize);
    brackets.forEach(function (b) { b.style.fontSize = fs + 'px'; });
    cursor.classList.add('is-snapping');
    cursor.style.width  = rect.width  + 'px';
    cursor.style.height = rect.height + 'px';
  });

  document.addEventListener('mouseout', function (e) {
    var link = e.target.closest('a');
    if (!link || link !== currentLink) return;
    // Only leave if we are moving outside the link entirely
    var to = e.relatedTarget ? e.relatedTarget.closest('a') : null;
    if (to === link) return;
    currentLink = null;
    cursor.style.width  = '';
    cursor.style.height = '';
    brackets.forEach(function (b) { b.style.fontSize = ''; });
    setTimeout(function () {
      cursor.classList.remove('is-snapping');
    }, 300);
  });

  // Dark section detection
  function updateDarkMode() {
    var el = document.elementFromPoint(mouseX, mouseY);
    var isDark = false;
    while (el && el !== document.documentElement) {
      if (el.dataset && el.dataset.scroll === 'dark') { isDark = true; break; }
      el = el.parentElement;
    }
    cursor.classList.toggle('is-dark', isDark);
  }

  // Animation loop
  function animate() {
    cursorX += (mouseX - cursorX) * lag;
    cursorY += (mouseY - cursorY) * lag;
    cursor.style.transform = 'translate(' + cursorX + 'px, ' + cursorY + 'px)';
    updateDarkMode();
    requestAnimationFrame(animate);
  }

  animate();

}());
