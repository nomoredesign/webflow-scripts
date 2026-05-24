/**
 * hover-animation.js
 * nomoredesign 2026 — Hover headline blur-fade animation
 *
 * Targets any element with [data-hover-headline] and [data-hover-alternate].
 * On desktop: mouseenter/mouseleave triggers the transition.
 * On touch devices: auto-cycles after an initial 1.5s delay.
 *
 * HTML usage:
 *   <h1 data-hover-headline="Default text here." data-hover-alternate="Alternate text.">
 *     Default text here.
 *   </h1>
 */

(function () {
  'use strict';

  // ─── Timing constants ────────────────────────────────────────────────────────
  var CHAR_STAGGER_MS   = 22;   // Delay between each character animation start
  var TRANSITION_MS     = 300;  // CSS transition duration per character (ms)
  var PAREN_DURATION_MS = 350;  // Parenthesis fade duration (ms)
  var INITIAL_DELAY_MS  = 1500; // Touch: pause before first auto-cycle
  var HOLD_MS           = 1500; // Touch: how long alternate text stays visible

  // ─── Touch detection ─────────────────────────────────────────────────────────
  var isTouch = navigator.maxTouchPoints > 0;

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Wrap each character of a string in an animated <span>.
   * Space characters use white-space:pre so they are preserved.
   */
  function buildCharSpans(text) {
    var spans = [];
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var span = document.createElement('span');
      span.textContent = ch;
      span.style.display        = 'inline-block';
      span.style.whiteSpace     = 'pre';
      span.style.maxWidth       = '0';
      span.style.opacity        = '0';
      span.style.filter         = 'blur(6px)';
      span.style.transform      = 'translateY(3px)';
      span.style.overflow       = 'hidden';
      span.style.transition     =
        'opacity ' + TRANSITION_MS + 'ms ease, ' +
        'filter '  + TRANSITION_MS + 'ms ease, ' +
        'transform ' + TRANSITION_MS + 'ms ease, ' +
        'max-width ' + TRANSITION_MS + 'ms ease';
      spans.push(span);
    }
    return spans;
  }

  /** Show a character span (animate in) */
  function showSpan(span) {
    span.style.maxWidth  = '2em';
    span.style.opacity   = '1';
    span.style.filter    = 'blur(0px)';
    span.style.transform = 'translateY(0)';
  }

  /** Hide a character span (animate out) */
  function hideSpan(span) {
    span.style.maxWidth  = '0';
    span.style.opacity   = '0';
    span.style.filter    = 'blur(6px)';
    span.style.transform = 'translateY(3px)';
  }

  /**
   * Build a parenthesis span with collapsed width by default.
   * @param {string} char   '(' or ')'
   * @param {boolean} isOpen  true = opening paren (negative left margin)
   */
  function buildParenSpan(char, isOpen) {
    var span = document.createElement('span');
    span.textContent = char;
    span.style.display        = 'inline-block';
    span.style.whiteSpace     = 'pre';
    span.style.opacity        = '0';
    span.style.filter         = 'blur(6px)';
    span.style.transform      = 'translateY(3px)';
    span.style.transition     =
      'opacity ' + PAREN_DURATION_MS + 'ms ease, ' +
      'filter '  + PAREN_DURATION_MS + 'ms ease, ' +
      'transform ' + PAREN_DURATION_MS + 'ms ease, ' +
      'max-width ' + PAREN_DURATION_MS + 'ms ease';

    if (isOpen) {
      // Opening paren: always rendered but pulled left so it takes no layout space
      span.style.marginLeft = '-1em';
    } else {
      // Closing paren: collapse its width when hidden
      span.style.maxWidth  = '0';
      span.style.overflow  = 'hidden';
    }

    return span;
  }

  /** Fade in a parenthesis */
  function showParen(span, isOpen) {
    span.style.opacity   = '1';
    span.style.filter    = 'blur(0px)';
    span.style.transform = 'translateY(0)';
    if (!isOpen) span.style.maxWidth = '2em';
  }

  /** Fade out a parenthesis */
  function hideParen(span, isOpen) {
    span.style.opacity   = '0';
    span.style.filter    = 'blur(6px)';
    span.style.transform = 'translateY(3px)';
    if (!isOpen) span.style.maxWidth = '0';
  }

  /**
   * Calculate the total animation duration for dissolving N chars
   * at the given stagger, plus one transition window.
   */
  function animDuration(numChars) {
    return numChars * CHAR_STAGGER_MS + TRANSITION_MS;
  }

  // ─── Per-element initialisation ──────────────────────────────────────────────

  function initElement(el) {
    var defaultText   = el.getAttribute('data-hover-headline') || '';
    var alternateText = el.getAttribute('data-hover-alternate') || '';

    if (!defaultText || !alternateText) return;

    // Clear existing content
    el.innerHTML = '';

    // Build opening paren
    var openParen  = buildParenSpan('(', true);
    // Build default text spans
    var defaultSpans = buildCharSpans(defaultText);
    // Build closing paren
    var closeParen = buildParenSpan(')', false);
    // Build alternate text spans (hidden initially)
    var altSpans   = buildCharSpans(alternateText);

    // Append: openParen | defaultSpans | closeParen | altSpans
    // altSpans sit hidden in the DOM, ready to swap in
    el.appendChild(openParen);
    defaultSpans.forEach(function (s) { el.appendChild(s); });
    el.appendChild(closeParen);
    altSpans.forEach(function (s) { el.appendChild(s); });

    // Show default text immediately (no animation on load)
    defaultSpans.forEach(function (s) {
      s.style.transition = 'none';
      showSpan(s);
      // Force reflow then restore transition
      void s.offsetWidth;
      s.style.transition =
        'opacity ' + TRANSITION_MS + 'ms ease, ' +
        'filter '  + TRANSITION_MS + 'ms ease, ' +
        'transform ' + TRANSITION_MS + 'ms ease, ' +
        'max-width ' + TRANSITION_MS + 'ms ease';
    });

    var busy   = false;
    var shown  = 'default'; // 'default' | 'alternate'

    /**
     * Transition: default → alternate
     * 1. Parens fade in
     * 2. Default dissolves R→L
     * 3. Alternate types in L→R
     */
    function toAlternate(onDone) {
      if (busy) return;
      busy = true;

      // Step 1: fade in parens
      showParen(openParen, true);
      showParen(closeParen, false);

      var defaultLen = defaultSpans.length;
      var altLen     = altSpans.length;

      // Step 2: dissolve default R→L
      for (var i = 0; i < defaultLen; i++) {
        (function (idx) {
          setTimeout(function () {
            hideSpan(defaultSpans[defaultLen - 1 - idx]);
          }, idx * CHAR_STAGGER_MS);
        })(i);
      }

      // Step 3: type in alternate L→R (start after default fully gone)
      var dissolveTime = animDuration(defaultLen);
      for (var j = 0; j < altLen; j++) {
        (function (idx) {
          setTimeout(function () {
            showSpan(altSpans[idx]);
          }, dissolveTime + idx * CHAR_STAGGER_MS);
        })(j);
      }

      var totalTime = dissolveTime + animDuration(altLen);
      setTimeout(function () {
        shown = 'alternate';
        busy  = false;
        if (onDone) onDone();
      }, totalTime);
    }

    /**
     * Transition: alternate → default
     * 1. Alternate dissolves R→L
     * 2. Default types in L→R
     * 3. Parens fade out
     */
    function toDefault(onDone) {
      if (busy) return;
      busy = true;

      var defaultLen = defaultSpans.length;
      var altLen     = altSpans.length;

      // Step 1: dissolve alternate R→L
      for (var i = 0; i < altLen; i++) {
        (function (idx) {
          setTimeout(function () {
            hideSpan(altSpans[altLen - 1 - idx]);
          }, idx * CHAR_STAGGER_MS);
        })(i);
      }

      // Step 2: type in default L→R
      var dissolveTime = animDuration(altLen);
      for (var j = 0; j < defaultLen; j++) {
        (function (idx) {
          setTimeout(function () {
            showSpan(defaultSpans[idx]);
          }, dissolveTime + idx * CHAR_STAGGER_MS);
        })(j);
      }

      // Step 3: fade out parens (after default fully visible)
      var defaultInTime = dissolveTime + animDuration(defaultLen);
      setTimeout(function () {
        hideParen(openParen, true);
        hideParen(closeParen, false);
      }, defaultInTime);

      var totalTime = defaultInTime + PAREN_DURATION_MS;
      setTimeout(function () {
        shown = 'default';
        busy  = false;
        if (onDone) onDone();
      }, totalTime);
    }

    // ── Desktop: mouse events ─────────────────────────────────────────────────
    if (!isTouch) {
      el.addEventListener('mouseenter', function () {
        if (shown === 'default') toAlternate();
      });

      el.addEventListener('mouseleave', function () {
        if (shown === 'alternate') toDefault();
      });
    }

    // ── Touch: auto-cycle ─────────────────────────────────────────────────────
    if (isTouch) {
      function cycle() {
        toAlternate(function () {
          setTimeout(function () {
            toDefault(function () {
              setTimeout(cycle, HOLD_MS);
            });
          }, HOLD_MS);
        });
      }

      setTimeout(cycle, INITIAL_DELAY_MS);
    }
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────────

  function init() {
    var elements = document.querySelectorAll('[data-hover-headline]');
    for (var i = 0; i < elements.length; i++) {
      initElement(elements[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
