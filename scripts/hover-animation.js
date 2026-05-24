/**
 * hover-animation.js
 * nomoredesign 2026 — Hover headline blur-fade animation
 *
 * Targets any element with [data-hover-headline] and [data-hover-alternate].
 * On desktop: mouseenter/mouseleave triggers the transition.
 * On touch devices: auto-cycles after an initial 1.5s delay.
 *
 * No special CSS required on the headline element.
 *
 * HTML usage:
 *   <h1 data-hover-headline="Default text here."
 *       data-hover-alternate="Alternate text.">
 *     Default text here.
 *   </h1>
 */

(function () {
  'use strict';

  var CHAR_STAGGER_MS   = 22;
  var TRANSITION_MS     = 300;
  var PAREN_DURATION_MS = 350;
  var INITIAL_DELAY_MS  = 1500;
  var HOLD_MS           = 1500;

  var isTouch = navigator.maxTouchPoints > 0;

  // ─── Character span ───────────────────────────────────────────────────────────
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

  // ─── Text node builder ────────────────────────────────────────────────────────
  // Words  → nowrap wrapper containing char spans
  // Spaces → toggleable span (display:none when text group is hidden)
  function buildTextNodes(text) {
    var allSpans   = [];
    var domNodes   = [];
    var spaceNodes = [];
    var tokens     = text.match(/\S+|\s+/g) || [];

    for (var t = 0; t < tokens.length; t++) {
      var token   = tokens[t];
      var isSpace = /^\s+$/.test(token);

      if (isSpace) {
        var sw = document.createElement('span');
        sw.style.cssText  = 'display:none;white-space:pre;';
        sw.textContent    = token;
        spaceNodes.push(sw);
        domNodes.push(sw);
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

    return { spans: allSpans, nodes: domNodes, spaceNodes: spaceNodes };
  }

  function showSpaces(nodes) {
    for (var i = 0; i < nodes.length; i++) nodes[i].style.display = 'inline';
  }
  function hideSpaces(nodes) {
    for (var i = 0; i < nodes.length; i++) nodes[i].style.display = 'none';
  }

  // ─── Parentheses ─────────────────────────────────────────────────────────────
  /**
   * Both parens are plain inline spans.
   *
   * Open paren strategy:
   *   - Always occupies its natural inline space (so text never shifts)
   *   - Uses visibility + opacity/filter/transform for the fade
   *   - visibility:hidden when inactive keeps it invisible but preserves layout
   *
   * Close paren strategy:
   *   - max-width collapse (same as character spans) — it sits at the end of
   *     the text so collapsing it causes no reflow on preceding content
   */
  function buildOpenParen() {
    var span = document.createElement('span');
    span.textContent = '(';
    span.style.cssText =
      'display:inline-block;' +
      'white-space:pre;' +
      'visibility:hidden;' +
      'opacity:0;' +
      'filter:blur(6px);' +
      'transform:translateY(3px);' +
      'transition:' +
        'opacity '   + PAREN_DURATION_MS + 'ms ease,' +
        'filter '    + PAREN_DURATION_MS + 'ms ease,' +
        'transform ' + PAREN_DURATION_MS + 'ms ease;';
    return span;
  }

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
    span.style.visibility = 'visible';
    span.style.opacity    = '1';
    span.style.filter     = 'blur(0px)';
    span.style.transform  = 'translateY(0)';
  }
  function hideOpenParen(span) {
    span.style.opacity   = '0';
    span.style.filter    = 'blur(6px)';
    span.style.transform = 'translateY(3px)';
    // delay visibility:hidden until after the fade transition completes
    setTimeout(function () {
      span.style.visibility = 'hidden';
    }, PAREN_DURATION_MS);
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

  // ─── Per-element init ─────────────────────────────────────────────────────────
  function initElement(el) {
    var defaultText   = el.getAttribute('data-hover-headline') || '';
    var alternateText = el.getAttribute('data-hover-alternate') || '';
    if (!defaultText || !alternateText) return;

    el.innerHTML = '';

    var openParen  = buildOpenParen();
    var closeParen = buildCloseParen();

    var defResult  = buildTextNodes(defaultText);
    var altResult  = buildTextNodes(alternateText);
    var defSpans   = defResult.spans;
    var altSpans   = altResult.spans;
    var defSpaces  = defResult.spaceNodes;
    var altSpaces  = altResult.spaceNodes;

    // DOM order: openParen | defaultNodes | altNodes | closeParen
    // Open paren is first but uses visibility so it never pushes text.
    // Close paren is last, collapses cleanly with no upstream reflow.
    el.appendChild(openParen);
    defResult.nodes.forEach(function (n) { el.appendChild(n); });
    altResult.nodes.forEach(function (n) { el.appendChild(n); });
    el.appendChild(closeParen);

    // Initialise: default visible, alt hidden
    defSpans.forEach(function (s) {
      s.style.transition = 'none';
      showSpan(s);
      void s.offsetWidth;
      s.style.transition =
        'opacity '   + TRANSITION_MS + 'ms ease,' +
        'filter '    + TRANSITION_MS + 'ms ease,' +
        'transform ' + TRANSITION_MS + 'ms ease,' +
        'max-width ' + TRANSITION_MS + 'ms ease';
    });
    showSpaces(defSpaces);
    hideSpaces(altSpaces);

    var busy  = false;
    var shown = 'default';

    // default → alternate
    function toAlternate(onDone) {
      if (busy) return;
      busy = true;

      showOpenParen(openParen);
      showCloseParen(closeParen);
      showSpaces(altSpaces);

      var defLen = defSpans.length;
      var altLen = altSpans.length;

      for (var i = 0; i < defLen; i++) {
        (function (idx) {
          setTimeout(function () {
            hideSpan(defSpans[defLen - 1 - idx]);
          }, idx * CHAR_STAGGER_MS);
        })(i);
      }

      var dissolveTime = animDuration(defLen);
      setTimeout(function () { hideSpaces(defSpaces); }, dissolveTime);

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

      showSpaces(defSpaces);

      var defLen = defSpans.length;
      var altLen = altSpans.length;

      for (var i = 0; i < altLen; i++) {
        (function (idx) {
          setTimeout(function () {
            hideSpan(altSpans[altLen - 1 - idx]);
          }, idx * CHAR_STAGGER_MS);
        })(i);
      }

      var dissolveTime = animDuration(altLen);
      setTimeout(function () { hideSpaces(altSpaces); }, dissolveTime);

      for (var j = 0; j < defLen; j++) {
        (function (idx) {
          setTimeout(function () {
            showSpan(defSpans[idx]);
          }, dissolveTime + idx * CHAR_STAGGER_MS);
        })(j);
      }

      var defInTime = dissolveTime + animDuration(defLen);
      setTimeout(function () {
        hideOpenParen(openParen);
        hideCloseParen(closeParen);
      }, defInTime);

      setTimeout(function () {
        shown = 'default';
        busy  = false;
        if (onDone) onDone();
      }, defInTime + PAREN_DURATION_MS);
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
