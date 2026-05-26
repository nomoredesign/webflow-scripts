// cursor.js - nomoredesign 2026 custom cursor
// v1.3.1
//
// Features:
//   1. Smooth-follows the mouse with a lag factor
//   2. Snaps to & matches the size of hovered <a> elements (with eased transition)
//   3. Brackets font-size matches the hovered link's computed font-size
//   4. Colour scheme inverts (is-dark class) when cursor is inside
//      any element with [data-scroll="dark"]
//   5. Self-contained: injects its own CSS so no Webflow CSS is required
//
// HTML required in Webflow:
//   <div class="cursor">
//     <span class="bracket">(</span>
//     <span class="bracket">)</span>
//     <!-- dot-wrapper elements etc. -->
//   </div>
//
// In Webflow, set the .cursor element to:
//   Position: Fixed, Top: 0, Left: 0, z-index: 9999,
//   Width/Height: 2rem, Pointer events: None, Margin: 0

(function () {
  'use strict';

  var cursor   = document.querySelector('.cursor');
  var brackets = document.querySelectorAll('.cursor .bracket');

  if (!cursor) return;

  // Inject self-contained CSS
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

  // Move to body root so position:fixed works inside transformed ancestors
  document.body.appendChild(cursor);

  // State
  var mouseX = 0, mouseY = 0;
  var cursorX = 0, cursorY = 0;
  var lag = 0.12;

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

  // Link hover
  function onLinkEnter(e) {
    var link = e.currentTarget;
    var rect = link.getBoundingClientRect();
    var fs   = parseFloat(window.getComputedStyle(link).fontSize);
    brackets.forEach(function (b) { b.style.fontSize = fs + 'px'; });
    cursor.classList.add('is-snapping');
    cursor.style.width  = rect.width  + 'px';
    cursor.style.height = rect.height + 'px';
  }

  function onLinkLeave() {
    cursor.style.width  = '';
    cursor.style.height = '';
    brackets.forEach(function (b) { b.style.fontSize = ''; });
    setTimeout(function () {
      cursor.classList.remove('is-snapping');
    }, 300);
  }

  function attachLinkListeners() {
    document.querySelectorAll('a').forEach(function (a) {
      if (a._cursorBound) return;
      a._cursorBound = true;
      a.addEventListener('mouseenter', onLinkEnter);
      a.addEventListener('mouseleave', onLinkLeave);
    });
  }

  attachLinkListeners();

  var observer = new MutationObserver(attachLinkListeners);
  observer.observe(document.body, { childList: true, subtree: true });

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
