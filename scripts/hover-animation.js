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

  /** Create a single hidden animated character span */
  function makeCharSpan(char) {
    var span = document.createElement('span');
    span.textContent = char;
    span.style.cssText =
      'display:inline-block;' +
      'white-space:pre;' +
      'max-width:0;' +
      'opacity:0;' +
      'filter:blur(6px);' +
      'transform:translateY(3px);' +
      'overflow:hidden;' +
      'transition:' +
        'opacity '   + TRANSITION_MS + 'ms ease,' +
        'filter '    + TRANSITION_MS + 'ms ease,' +
        'transform ' + TRANSITION_MS + 'ms ease,' +
        'max-width ' + TRANSITION_MS + 'ms ease;';
    return span;
  }

  /**
   * Build character spans for a string, grouped by word.
   * Each word's chars sit inside a white-space:nowrap wrapper so the browser
   * can break between words but never mid-word.
   * Spaces are individual spans outside the word wrappers.
   *
   * Returns { spans, nodes }
   *   spans — flat array of all char spans (for animation)
   *   nodes — DOM nodes to append to the headline element
   */
  function buildTextNodes(text) {
    var allSpans = [];
    var domNodes = [];
    var tokens   = text.match(/\S+|\s+/g) || [];

    for (var t = 0; t < tokens.length; t++) {
      var token   = tokens[t];
      var isSpace = /^\s+$/.test(token);

      if (isSpace) {
        for (var s = 0; s < token.length; s++) {
          var sp = makeCharSpan('\u00a0'); // non-breaking space preserves width
          allSpans.push(sp);
          domNodes.push(sp);
        }
      } else {
        var wrapper = document.createElement('span');
        wrapper.style.cssText = 'display:inline;white-space:nowrap;';
        for (var c = 0; c < token.length; c++) {
          var ch = makeCharSpan(token[c]);
          wrapper.appendChild(ch);
          allSpans.push(ch);
        }
        domNodes.push(wrapper);
      }
    }

    return { spans: allSpans, nodes: domNodes };
  }

  function showSpan(span) {
    span.style.maxWidth  = '2em';
    span.style.opacity   = '1';
    span.style.filter    = 'blur(0px)';
    span.style.transform = 'translateY(0)';
  }

  function hideSpan(span) {
    span.style.maxWidth  = '0';
    span.style.opacity   = '0';
    span.style.filter    = 'blur(6px)';
    span.style.transform = 'translateY(3px)';
  }

  /**
   * Opening paren — zero-width inline element.
   * display:inline-block; width:0; overflow:visible means it renders
   * visually but takes no layout space whatsoever. The text never moves.
   * A negative margin pulls the rendered glyph to the left of the text edge.
   */
  function buildOpenParen() {
    var span = document.createElement('span');
    span.textContent = '(';
    span.style.cssText =
      'display:inline-block;' +
      'width:0;' +
      'overflow:visible;' +
      'white-space:pre;' +
      'margin-left:-0.55em;' +  // visual offset only — no layout impact
      'opacity:0;' +
      'filter:blur(6px);' +
      'transform:translateY(3px);' +
      'transition:' +
        'opacity '   + PAREN_DURATION_MS + 'ms ease,' +
        'filter '    + PAREN_DURATION_MS + 'ms ease,' +
        'transform ' + PAREN_DURATION_MS + 'ms ease;';
    return span;
  }

  /**
   * Closing paren — collapses to zero width when hidden.
   */
  function buildCloseParen() {
    var span = document.createElement('span');
    span.textContent = ')';
    span.style.cssText =
      'display:inline-block;' +
      'white-space:pre;' +
      'max-width:0;' +
      'overflow:hidden;' +
      'opacity:0;' +
      'filter:blur(6px);' +
      'transform:translateY(3px);' +
      'transition:' +
        'opacity '   + PAREN_DURATION_MS + 'ms ease,' +
        'filter '    + PAREN_DURATION_MS + 'ms ease,' +
        'transform ' + PAREN_DURATION_MS + 'ms ease,' +
        'max-width ' + PAREN_DURATION_MS + 'ms ease;';
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

  function animDuration(numChars) {
    return numChars * CHAR_STAGGER_MS + TRANSITION_MS;
  }

  // ─── Per-element initialisation ──────────────────────────────────────────────

  function initElement(el) {
    var defaultText   = el.getAttribute('data-hover-headline') || '';
    var alternateText = el.getAttribute('data-hover-alternate') || '';
    if (!defaultText || !alternateText) return;

    el.innerHTML = '';

    var openParen  = buildOpenParen();
    var closeParen = buildCloseParen();

    var defaultResult = buildTextNodes(defaultText);
    var altResult     = buildTextNodes(alternateText);
    var defaultSpans  = defaultResult.spans;
    var altSpans      = altResult.spans;

    // DOM: openParen | defaultNodes | altNodes | closeParen
    el.appendChild(openParen);
    defaultResult.nodes.forEach(function (n) { el.appendChild(n); });
    altResult.nodes.forEach(function (n) { el.appendChild(n); });
    el.appendChild(closeParen);

    // Show default text immediately, no animation on load
    defaultSpans.forEach(function (s) {
      s.style.transition = 'none';
      showSpan(s);
      void s.offsetWidth;
      s.style.transition =
        'opacity '   + TRANSITION_MS + 'ms ease,' +
        'filter '    + TRANSITION_MS + 'ms ease,' +
        'transform ' + TRANSITION_MS + 'ms ease,' +
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

      setTimeout(function () {
        shown = 'alternate';
        busy  = false;
        if (onDone) onDone();
      }, dissolveTime + animDuration(altLen));
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

      setTimeout(function () {
        shown = 'default';
        busy  = false;
        if (onDone) onDone();
      }, defaultInTime + PAREN_DURATION_MS);
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
