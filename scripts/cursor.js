// cursor.js — nomoredesign 2026 custom cursor
// v1.0.0
//
// Features:
//  1. Smooth-follows the mouse with a lag factor
//  2. Snaps to & matches the size of hovered <a> elements
//  3. Brackets font-size matches the hovered link's computed font-size
//  4. Colour scheme inverts (is-dark class) when cursor is inside
//     any element with [data-scroll="dark"]
//
// HTML required in Webflow:
//  <div class="cursor">
//    <span class="bracket">(</span>
//    <span class="bracket">)</span>
//    <!-- dot-wrapper elements etc. -->
//  </div>
//
// CSS to paste into Webflow Site Settings > Custom Code > Head:
//
//  .cursor {
//    position: fixed !important;
//    top: 0 !important;
//    left: 0 !important;
//    pointer-events: none;
//    z-index: 9999;
//    opacity: 1;
//    transition: opacity 0.3s ease;
//    margin: 0 !important;
//  }
//  .cursor.is-snapping {
//    transition: width 0.25s ease, height 0.25s ease,
//                transform 0.25s ease, opacity 0.3s ease !important;
//  }
//  .cursor.is-hidden { opacity: 0; }
//
//  /* Dark-section colour scheme — add your own token/colour values */
//  .cursor.is-dark { /* e.g. filter: invert(1); or swap colour variables */ }

(function () {
  'use strict';

  var cursor   = document.querySelector('.cursor');
  var brackets = document.querySelectorAll('.cursor .bracket');
  var links    = document.querySelectorAll('a');

  if (!cursor) return; // bail if cursor element not on page

  // --- State ---
  var mouseX = 0, mouseY = 0;
  var cursorX = 0, cursorY = 0;
  var isSnapped  = false;
  var snapTimer  = null;
  var activeLink = null;

  // --- Mouse tracking ---
  document.addEventListener('mousemove', function (e) {
        mouseX = e.clientX;
    mouseY = e.clientY;
    updateDarkMode(e.target);
  });

  document.addEventListener('mouseleave', function () {
        cursor.classList.add('is-hidden');
  });

  document.addEventListener('mouseenter', function () {
        cursor.classList.remove('is-hidden');
  });

  // --- Feature 1: Dark colour scheme ---
  // Walk up the DOM from the element under the pointer.
  // If any ancestor has data-scroll="dark", toggle is-dark on cursor.
  function updateDarkMode(target) {
        var el = target;
    while (el && el !== document.documentElement) {
      if (el.dataset && el.dataset.scroll === 'dark') {
        cursor.classList.add('is-dark');
        return;
      }
      el = el.parentElement;
    }
    cursor.classList.remove('is-dark');
  }

  // --- Feature 2: Bracket font-size matching ---
  // Pass a pixel number to set, or null to reset to CSS default.
  function setBracketFontSize(px) {
        brackets.forEach(function (b) {
      b.style.fontSize = px !== null ? px + 'px' : '';
});
  }

  // --- Animation loop ---
  function animate() {
        if (!isSnapped) {
      // Smooth lag follow
      cursorX += (mouseX - cursorX) * 0.15;
      cursorY += (mouseY - cursorY) * 0.15;
      cursor.style.transform =
                'translate3d(' + cursorX + 'px, ' + cursorY + 'px, 0) translate(-50%, -50%)';
        } else if (activeLink) {
      // Recalculate every frame so cursor follows if page scrolls
      var rect    = activeLink.getBoundingClientRect();
      var centerX = rect.left + rect.width  / 2;
      var centerY = rect.top  + rect.height / 2;

      cursorX = centerX;
      cursorY = centerY;

      cursor.style.transform =
                'translate3d(' + centerX + 'px, ' + centerY + 'px, 0) translate(-50%, -50%)';
      cursor.style.width  = rect.width  + 'px';
      cursor.style.height = rect.height + 'px';
        }

    requestAnimationFrame(animate);
  }

  animate();

  // --- Link hover: snap + size + bracket font-size ---
  links.forEach(function (link) {
        link.addEventListener('mouseenter', function () {
                if (snapTimer) clearTimeout(snapTimer);

      activeLink = link;
      isSnapped  = true;
      cursor.classList.add('is-snapping');

      // Feature 2: read the link's computed font-size and apply to brackets
      var linkFontSize = parseFloat(window.getComputedStyle(link).fontSize);
      setBracketFontSize(linkFontSize);
        });

    link.addEventListener('mouseleave', function () {
            activeLink = null;

      // Reset cursor to default dot size
      cursor.style.width  = '20px';
      cursor.style.height = '20px';

      // Reset bracket font-size back to CSS default
      setBracketFontSize(null);

      snapTimer = setTimeout(function () {
                cursor.classList.remove('is-snapping');
        isSnapped = false;
        snapTimer = null;
      }, 250);
    });
  });

}());
