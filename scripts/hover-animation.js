/**
 * hover-animation.js
 * nomoredesign 2026 — Hover headline blur-fade animation
 *
 * Targets any element with [data-hover-headline] and [data-hover-alternate].
 * On desktop: mouseenter/mouseleave triggers the transition.
 * On touch devices: auto-cycles after an initial 1.5s delay.
 *
 * The headline element must have position:relative in CSS.
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

  // ─── Char span ────────────────────────────────────────────────────────────────

  function makeCharSpan(char) {
    var span = document.createElement('span');
    span.textContent = char;
    span.style.cssText =
      'display:inline-block;' +
      'vertical-align:baseline;' +
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

  function animDuration(n) {
    return n * CHAR_STAGGER_MS + TRANSITION_MS;
  }

  // ─── Build a set of DOM nodes + flat span array for a string ─────────────────
  // Words  → nowrap wrapper with per-char spans
  // Spaces → plain text node (naturally collapses at line ends)
  // Returns { nodes, spans }

  function buildNodes(text) {
    var spans  = [];
    var nodes  = [];
    var tokens = text.match(/\S+|\s+/g) || [];

    for (var t = 0; t < tokens.length; t++) {
      var token = tokens[t];

      if (/^\s+$/.test(token)) {
        nodes.push(document.createTextNode(token));
      } else {
        var wrapper = document.createElement('span');
        wrapper.style.cssText = 'display:inline;white-space:nowrap;vertical-align:baseline;';
        for (var c = 0; c < token.length; c++) {
          var ch = makeCharSpan(token[c]);
          wrapper.appendChild(ch);
          spans.push(ch);
        }
        nodes.push(wrapper);
      }
    }

    return { nodes: nodes, spans: spans };
  }

  // ─── Parens ───────────────────────────────────────────────────────────────────

  /**
   * Open paren: position:absolute, left:0, translateX(-100%) so it sits just
   * outside the text's left edge. Appended as last child so it never
   * participates in the inline flow.
   * The <h1> must have position:relative.
   */
  function buildOpenParen() {
    var span = document.createElement('span');
    span.textContent = '(';
    span.style.cssText =
      'position:absolute;' +
      'left:0;top:0;' +
      'display:inline-block;' +
      'vertical-align:baseline;' +
      'white-space:pre;' +
      'opacity:0;' +
      'filter:blur(6px);' +
      'transform:translateX(-100%) translateY(3px);' +
      'transition:' +
        'opacity '   + PAREN_DURATION_MS + 'ms ease,' +
        'filter '    + PAREN_DURATION_MS + 'ms ease,' +
        'transform ' + PAREN_DURATION_MS + 'ms ease;';
    return span;
  }

  /**
   * Close paren: normal inline, max-width collapse.
   * Lives inside a dedicated wrapper so it always trails the active text.
   */
  function buildCloseParen() {
    var span = document.createElement('span');
    span.textContent = ')';
    span.style.cssText =
      'display:inline-block;' +
      'vertical-align:baseline;' +
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
    span.style.transform = 'translateX(-100%) translateY(0)';
  }
  function hideOpenParen(span) {
    span.style.opacity   = '0';
    span.style.filter    = 'blur(6px)';
    span.style.transform = 'translateX(-100%) translateY(3px)';
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

  // ─── Per-element init ─────────────────────────────────────────────────────────

  function initElement(el) {
    var defaultText   = el.getAttribute('data-hover-headline') || '';
    var alternateText = el.getAttribute('data-hover-alternate') || '';
    if (!defaultText || !alternateText) return;

    el.innerHTML = '';
    el.style.position = 'relative'; // required anchor for open paren

    // Text container — only the ACTIVE text's nodes live here at any time
    var textContainer = document.createElement('span');
    textContainer.style.cssText = 'display:inline;';
    el.appendChild(textContainer);

    // Close paren sits right after the text container, always trailing active text
    var closeParen = buildCloseParen();
    el.appendChild(closeParen);

    // Open paren appended last — absolutely positioned, out of flow entirely
    var openParen = buildOpenParen();
    el.appendChild(openParen);

    // Populate with default text, shown immediately
    var active = buildNodes(defaultText);
    active.nodes.forEach(function (n) { textContainer.appendChild(n); });
    active.spans.forEach(function (s) {
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

    /**
     * Swap: dissolve current spans out R→L, then replace DOM with next text,
     * then reveal next spans L→R.
     * showParens: true when transitioning to alternate, false when returning.
     */
    function swap(nextText, showParens, onDone) {
      if (busy) return;
      busy = true;

      var currentSpans = active.spans;
      var currentLen   = currentSpans.length;

      // Kick off paren animation immediately
      if (showParens) {
        showOpenParen(openParen);
        showCloseParen(closeParen);
      }

      // Dissolve current text R→L
      for (var i = 0; i < currentLen; i++) {
        (function (idx) {
          setTimeout(function () {
            hideSpan(currentSpans[currentLen - 1 - idx]);
          }, idx * CHAR_STAGGER_MS);
        })(i);
      }

      var dissolveTime = animDuration(currentLen);

      setTimeout(function () {
        // Swap DOM — clear container, insert next text hidden
        while (textContainer.firstChild) {
          textContainer.removeChild(textContainer.firstChild);
        }

        var next = buildNodes(nextText);
        next.nodes.forEach(function (n) { textContainer.appendChild(n); });
        active = next;

        // Force reflow so transitions fire correctly from hidden state
        void textContainer.offsetWidth;

        // Reveal next text L→R
        var nextLen = next.spans.length;
        for (var j = 0; j < nextLen; j++) {
          (function (idx) {
            setTimeout(function () {
              showSpan(next.spans[idx]);
            }, idx * CHAR_STAGGER_MS);
          })(j);
        }

        var revealTime = animDuration(nextLen);
        setTimeout(function () {
          // If returning to default, fade parens out after text is fully in
          if (!showParens) {
            hideOpenParen(openParen);
            hideCloseParen(closeParen);
          }
          busy = false;
          if (onDone) onDone();
        }, revealTime + (showParens ? 0 : PAREN_DURATION_MS));

      }, dissolveTime);
    }

    function toAlternate(onDone) {
      swap(alternateText, true, function () {
        shown = 'alternate';
        if (onDone) onDone();
      });
    }

    function toDefault(onDone) {
      swap(defaultText, false, function () {
        shown = 'default';
        if (onDone) onDone();
      });
    }

    // Desktop
    if (!isTouch) {
      el.addEventListener('mouseenter', function () {
        if (shown === 'default' && !busy) toAlternate();
      });
      el.addEventListener('mouseleave', function () {
        if (shown === 'alternate' && !busy) toDefault();
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
