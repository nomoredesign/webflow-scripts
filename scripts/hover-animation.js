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
  var CHAR_STAGGER_MS    = 22;   // Delay between each character animation start
  var TRANSITION_MS      = 300;  // CSS transition duration per character (ms)
  var PAREN_DURATION_MS  = 350;  // Parenthesis fade duration (ms)
  var INITIAL_DELAY_MS   = 1500; // Touch: pause before first auto-cycle
  var HOLD_MS            = 1500; // Touch: how long alternate text stays visible

  // ─── Touch detection ─────────────────────────────────────────────────────────
  var isTouch = navigator.maxTouchPoints > 0;

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Wrap each character of a string in an animated <span>.
   * Returns an array of spans; caller appends them inside a no-wrap wrapper.
   */
  function buildCharSpans(text) {
    var spans = [];
    for (var i = 0; i < text.length; i++) {
      var span = document.createElement('span');
      span.textContent = text[i];
      span.style.display    = 'inline-block';
      span.style.whiteSpace = 'pre';
      span.style.maxWidth   = '0';
      span.style.opacity    = '0';
      span.style.filter     = 'blur(6px)';
      span.style.transform  = 'translateY(3px)';
      span.style.overflow   = 'hidden';
      span.style.transition =
        'opacity '   + TRANSITION_MS + 'ms ease, ' +
        'filter '    + TRANSITION_MS + 'ms ease, ' +
        'transform ' + TRANSITION_MS + 'ms ease, ' +
        'max-width ' + TRANSITION_MS + 'ms ease';
      spans.push(span);
    }
    return spans;
  }

  /** Show a character span */
  function showSpan(span) {
    span.style.maxWidth  = '2em';
    span.style.opacity   = '1';
    span.style.filter    = 'blur(0px)';
    span.style.transform = 'translateY(0)';
  }

  /** Hide a character span */
  function hideSpan(span) {
    span.style.maxWidth  = '0';
    span.style.opacity   = '0';
    span.style.filter    = 'blur(6px)';
    span.style.transform = 'translateY(3px)';
  }

  /**
   * Build a parenthesis span.
   * Both parens use max-width collapse so neither affects layout when invisible.
   */
  function buildParenSpan(char) {
    var span = document.createElement('span');
    span.textContent      = char;
    span.style.display    = 'inline-block';
    span.style.whiteSpace = 'pre';
    span.style.maxWidth   = '0';
    span.style.opacity    = '0';
    span.style.filter     = 'blur(6px)';
    span.style.transform  = 'translateY(3px)';
    span.style.overflow   = 'hidden';
    span.style.transition =
      'opacity '   + PAREN_DURATION_MS + 'ms ease, ' +
      'filter '    + PAREN_DURATION_MS + 'ms ease, ' +
      'transform ' + PAREN_DURATION_MS + 'ms ease, ' +
      'max-width ' + PAREN_DURATION_MS + 'ms ease';
    return span;
  }

  function showParen(span) {
    span.style.maxWidth  = '2em';
    span.style.opacity   = '1';
    span.style.filter    = 'blur(0px)';
    span.style.transform = 'translateY(0)';
  }

  function hideParen(span) {
    span.style.maxWidth  = '0';
    span.style.opacity   = '0';
    span.style.filter    = 'blur(6px)';
    span.style.transform = 'translateY(3px)';
  }

  /** Total time to animate N chars at the stagger rate */
  function animDuration(numChars) {
    return numChars * CHAR_STAGGER_MS + TRANSITION_MS;
  }

  // ─── Per-element initialisation ──────────────────────────────────────────────

  function initElement(el) {
    var defaultText   = el.getAttribute('data-hover-headline') || '';
    var alternateText = el.getAttribute('data-hover-alternate') || '';

    if (!defaultText || !alternateText) return;

    // Prevent the headline from wrapping mid-word
    el.style.whiteSpace = 'nowrap';

    // Clear existing content
    el.innerHTML = '';

    // Build parens
    var openParen  = buildParenSpan('(');
    var closeParen = buildParenSpan(')');

    // Build char span arrays
    var defaultSpans = buildCharSpans(defaultText);
    var altSpans     = buildCharSpans(alternateText);

    // ── DOM order: openParen | defaultSpans | altSpans | closeParen ──────────
    // Closing paren always sits at the end of whichever text is visible,
    // so it never jumps when the hidden text group collapses.
    el.appendChild(openParen);
    defaultSpans.forEach(function (s) { el.appendChild(s); });
    altSpans.forEach(function (s) { el.appendChild(s); });
    el.appendChild(closeParen);

    // Show default text immediately without animating on load
    defaultSpans.forEach(function (s) {
      s.style.transition = 'none';
      showSpan(s);
      void s.offsetWidth; // force reflow
      s.style.transition =
        'opacity '   + TRANSITION_MS + 'ms ease, ' +
        'filter '    + TRANSITION_MS + 'ms ease, ' +
        'transform ' + TRANSITION_MS + 'ms ease, ' +
        'max-width ' + TRANSITION_MS + 'ms ease';
    });

    var busy  = false;
    var shown = 'default'; // 'default' | 'alternate'

    /**
     * default → alternate
     * 1. Parens fade in
     * 2. Default dissolves R→L
     * 3. Alternate types in L→R
     */
    function toAlternate(onDone) {
      if (busy) return;
      busy = true;

      showParen(openParen);
      showParen(closeParen);

      var defaultLen = defaultSpans.length;
      var altLen     = altSpans.length;

      // Dissolve default R→L
      for (var i = 0; i < defaultLen; i++) {
        (function (idx) {
          setTimeout(function () {
            hideSpan(defaultSpans[defaultLen - 1 - idx]);
          }, idx * CHAR_STAGGER_MS);
        })(i);
      }

      // Type in alternate L→R after default fully gone
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
     * alternate → default
     * 1. Alternate dissolves R→L
     * 2. Default types in L→R
     * 3. Parens fade out
     */
    function toDefault(onDone) {
      if (busy) return;
      busy = true;

      var defaultLen = defaultSpans.length;
      var altLen     = altSpans.length;

      // Dissolve alternate R→L
      for (var i = 0; i < altLen; i++) {
        (function (idx) {
          setTimeout(function () {
            hideSpan(altSpans[altLen - 1 - idx]);
          }, idx * CHAR_STAGGER_MS);
        })(i);
      }

      // Type in default L→R after alternate fully gone
      var dissolveTime = animDuration(altLen);
      for (var j = 0; j < defaultLen; j++) {
        (function (idx) {
          setTimeout(function () {
            showSpan(defaultSpans[idx]);
          }, dissolveTime + idx * CHAR_STAGGER_MS);
        })(j);
      }

      // Fade out parens after default fully visible
      var defaultInTime = dissolveTime + animDuration(defaultLen);
      setTimeout(function () {
        hideParen(openParen);
        hideParen(closeParen);
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
