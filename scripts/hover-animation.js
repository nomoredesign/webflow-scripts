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
   * Build character spans for a string.
   * Each word's characters are wrapped in a white-space:nowrap inline span
   * so the browser can break between words but never mid-word.
   * Returns a flat array of all character spans (for animation targeting).
   */
  function buildCharSpans(text) {
    var allSpans = [];

    // Split into tokens: words and the spaces between them
    var tokens = text.match(/\S+|\s+/g) || [];

    for (var t = 0; t < tokens.length; t++) {
      var token = tokens[t];
      var isSpace = /^\s+$/.test(token);

      if (isSpace) {
        // Spaces: one span per space character, sits outside the nowrap wrapper
        for (var s = 0; s < token.length; s++) {
          var spaceSpan = document.createElement('span');
          spaceSpan.textContent      = token[s];
          spaceSpan.style.display    = 'inline-block';
          spaceSpan.style.whiteSpace = 'pre';
          spaceSpan.style.maxWidth   = '0';
          spaceSpan.style.opacity    = '0';
          spaceSpan.style.filter     = 'blur(6px)';
          spaceSpan.style.transform  = 'translateY(3px)';
          spaceSpan.style.overflow   = 'hidden';
          spaceSpan.style.transition =
            'opacity '   + TRANSITION_MS + 'ms ease, ' +
            'filter '    + TRANSITION_MS + 'ms ease, ' +
            'transform ' + TRANSITION_MS + 'ms ease, ' +
            'max-width ' + TRANSITION_MS + 'ms ease';
          allSpans.push(spaceSpan);
        }
      } else {
        // Word: wrap all its char spans in a nowrap container
        var wordWrapper = document.createElement('span');
        wordWrapper.style.display    = 'inline';
        wordWrapper.style.whiteSpace = 'nowrap';

        for (var c = 0; c < token.length; c++) {
          var charSpan = document.createElement('span');
          charSpan.textContent      = token[c];
          charSpan.style.display    = 'inline-block';
          charSpan.style.whiteSpace = 'pre';
          charSpan.style.maxWidth   = '0';
          charSpan.style.opacity    = '0';
          charSpan.style.filter     = 'blur(6px)';
          charSpan.style.transform  = 'translateY(3px)';
          charSpan.style.overflow   = 'hidden';
          charSpan.style.transition =
            'opacity '   + TRANSITION_MS + 'ms ease, ' +
            'filter '    + TRANSITION_MS + 'ms ease, ' +
            'transform ' + TRANSITION_MS + 'ms ease, ' +
            'max-width ' + TRANSITION_MS + 'ms ease';
          wordWrapper.appendChild(charSpan);
          allSpans.push(charSpan);
        }
      }
    }

    return allSpans;
  }

  /**
   * Same as buildCharSpans but also returns the wrapper elements so the
   * caller can append them to the DOM (rather than the spans directly).
   * Returns { spans, nodes } where nodes is what gets appended to the parent.
   */
  function buildTextNodes(text) {
    var allSpans = [];
    var domNodes = []; // what to appendChild onto the headline element

    var tokens = text.match(/\S+|\s+/g) || [];

    for (var t = 0; t < tokens.length; t++) {
      var token   = tokens[t];
      var isSpace = /^\s+$/.test(token);

      if (isSpace) {
        for (var s = 0; s < token.length; s++) {
          var spaceSpan = document.createElement('span');
          spaceSpan.textContent      = token[s];
          spaceSpan.style.display    = 'inline-block';
          spaceSpan.style.whiteSpace = 'pre';
          spaceSpan.style.maxWidth   = '0';
          spaceSpan.style.opacity    = '0';
          spaceSpan.style.filter     = 'blur(6px)';
          spaceSpan.style.transform  = 'translateY(3px)';
          spaceSpan.style.overflow   = 'hidden';
          spaceSpan.style.transition =
            'opacity '   + TRANSITION_MS + 'ms ease, ' +
            'filter '    + TRANSITION_MS + 'ms ease, ' +
            'transform ' + TRANSITION_MS + 'ms ease, ' +
            'max-width ' + TRANSITION_MS + 'ms ease';
          allSpans.push(spaceSpan);
          domNodes.push(spaceSpan);
        }
      } else {
        var wordWrapper = document.createElement('span');
        wordWrapper.style.display    = 'inline';
        wordWrapper.style.whiteSpace = 'nowrap';

        for (var c = 0; c < token.length; c++) {
          var charSpan = document.createElement('span');
          charSpan.textContent      = token[c];
          charSpan.style.display    = 'inline-block';
          charSpan.style.whiteSpace = 'pre';
          charSpan.style.maxWidth   = '0';
          charSpan.style.opacity    = '0';
          charSpan.style.filter     = 'blur(6px)';
          charSpan.style.transform  = 'translateY(3px)';
          charSpan.style.overflow   = 'hidden';
          charSpan.style.transition =
            'opacity '   + TRANSITION_MS + 'ms ease, ' +
            'filter '    + TRANSITION_MS + 'ms ease, ' +
            'transform ' + TRANSITION_MS + 'ms ease, ' +
            'max-width ' + TRANSITION_MS + 'ms ease';
          wordWrapper.appendChild(charSpan);
          allSpans.push(charSpan);
        }
        domNodes.push(wordWrapper);
      }
    }

    return { spans: allSpans, nodes: domNodes };
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
   * Build the opening paren span.
   * Uses a negative left margin equal to its own rendered width so it
   * overlaps into the margin and never displaces the text to the right.
   * The span itself has width:0 / overflow:hidden so it takes no layout space.
   */
  function buildOpenParen() {
    var span = document.createElement('span');
    span.textContent         = '(';
    span.style.display       = 'inline-block';
    span.style.whiteSpace    = 'pre';
    span.style.width         = '0';
    span.style.overflow      = 'visible'; // render outside its zero box
    span.style.marginLeft    = '-0.6em';  // pull into left margin
    span.style.opacity       = '0';
    span.style.filter        = 'blur(6px)';
    span.style.transform     = 'translateY(3px)';
    span.style.transition    =
      'opacity '   + PAREN_DURATION_MS + 'ms ease, ' +
      'filter '    + PAREN_DURATION_MS + 'ms ease, ' +
      'transform ' + PAREN_DURATION_MS + 'ms ease';
    return span;
  }

  /**
   * Build the closing paren span.
   * Uses max-width collapse so it takes no space when invisible.
   */
  function buildCloseParen() {
    var span = document.createElement('span');
    span.textContent      = ')';
    span.style.display    = 'inline-block';
    span.style.whiteSpace = 'pre';
    span.style.maxWidth   = '0';
    span.style.overflow   = 'hidden';
    span.style.opacity    = '0';
    span.style.filter     = 'blur(6px)';
    span.style.transform  = 'translateY(3px)';
    span.style.transition =
      'opacity '   + PAREN_DURATION_MS + 'ms ease, ' +
      'filter '    + PAREN_DURATION_MS + 'ms ease, ' +
      'transform ' + PAREN_DURATION_MS + 'ms ease, ' +
      'max-width ' + PAREN_DURATION_MS + 'ms ease';
    return span;
  }

  function showOpenParen(span) {
    span.style.opacity   = '1';
    span.style.filter    = 'blur(0px)';
    span.style.transform = 'translateY(0)';
  }

  function hideOpenParen(span) {
    span.style.opacity   = '0';
    span.style.filter    = 'blur(6px)';
    span.style.transform = 'translateY(3px)';
  }

  function showCloseParen(span) {
    span.style.maxWidth  = '2em';
    span.style.opacity   = '1';
    span.style.filter    = 'blur(0px)';
    span.style.transform = 'translateY(0)';
  }

  function hideCloseParen(span) {
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

    // Clear existing content
    el.innerHTML = '';

    // Build parens
    var openParen  = buildOpenParen();
    var closeParen = buildCloseParen();

    // Build text nodes (word-wrapped) and char span arrays
    var defaultResult = buildTextNodes(defaultText);
    var altResult     = buildTextNodes(alternateText);
    var defaultSpans  = defaultResult.spans;
    var altSpans      = altResult.spans;

    // DOM order: openParen | defaultNodes | altNodes | closeParen
    el.appendChild(openParen);
    defaultResult.nodes.forEach(function (n) { el.appendChild(n); });
    altResult.nodes.forEach(function (n) { el.appendChild(n); });
    el.appendChild(closeParen);

    // Show default text immediately (no animation on load)
    defaultSpans.forEach(function (s) {
      s.style.transition = 'none';
      showSpan(s);
      void s.offsetWidth;
      s.style.transition =
        'opacity '   + TRANSITION_MS + 'ms ease, ' +
        'filter '    + TRANSITION_MS + 'ms ease, ' +
        'transform ' + TRANSITION_MS + 'ms ease, ' +
        'max-width ' + TRANSITION_MS + 'ms ease';
    });

    var busy  = false;
    var shown = 'default';

    // default → alternate
    function toAlternate(onDone) {
      if (busy) return;
      busy = true;

      showOpenParen(openParen);
      showCloseParen(closeParen);

      var defaultLen = defaultSpans.length;
      var altLen     = altSpans.length;

      for (var i = 0; i < defaultLen; i++) {
        (function (idx) {
          setTimeout(function () {
            hideSpan(defaultSpans[defaultLen - 1 - idx]);
          }, idx * CHAR_STAGGER_MS);
        })(i);
      }

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

    // alternate → default
    function toDefault(onDone) {
      if (busy) return;
      busy = true;

      var defaultLen = defaultSpans.length;
      var altLen     = altSpans.length;

      for (var i = 0; i < altLen; i++) {
        (function (idx) {
          setTimeout(function () {
            hideSpan(altSpans[altLen - 1 - idx]);
          }, idx * CHAR_STAGGER_MS);
        })(i);
      }

      var dissolveTime = animDuration(altLen);
      for (var j = 0; j < defaultLen; j++) {
        (function (idx) {
          setTimeout(function () {
            showSpan(defaultSpans[idx]);
          }, dissolveTime + idx * CHAR_STAGGER_MS);
        })(j);
      }

      var defaultInTime = dissolveTime + animDuration(defaultLen);
      setTimeout(function () {
        hideOpenParen(openParen);
        hideCloseParen(closeParen);
      }, defaultInTime);

      var totalTime = defaultInTime + PAREN_DURATION_MS;
      setTimeout(function () {
        shown = 'default';
        busy  = false;
        if (onDone) onDone();
      }, totalTime);
    }

    // Desktop
    if (!isTouch) {
      el.addEventListener('mouseenter', function () {
        if (shown === 'default') toAlternate();
      });
      el.addEventListener('mouseleave', function () {
        if (shown === 'alternate') toDefault();
      });
    }

    // Touch auto-cycle
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
