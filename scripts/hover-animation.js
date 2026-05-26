/**
 * hover-animation.js
 * nomoredesign 2026 — Hover headline blur-fade animation
 *
 * Uses GSAP (available globally via Webflow) for interruptible,
 * reversible character-level blur-fade animations.
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

  // ─── Timing constants ────────────────────────────────────────────────────────
  var CHAR_DURATION  = 0.3;   // seconds per character fade
  var CHAR_STAGGER   = 0.022; // seconds between each character start
  var PAREN_DURATION = 0.35;  // seconds for paren fade
  var INITIAL_DELAY  = 1.5;   // touch: seconds before first auto-cycle
  var HOLD_TIME      = 1.5;   // touch: seconds to hold alternate text

  // ─── Touch detection ─────────────────────────────────────────────────────────
  var isTouch = navigator.maxTouchPoints > 0;

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /** Create a single character span, initially hidden */
  function makeCharSpan(char) {
    var span = document.createElement('span');
    span.textContent = char;
    span.style.cssText =
      'display:inline-block;' +
      'vertical-align:baseline;' +
      'line-height:1.125;' +
      'white-space:pre;' +
      'opacity:0;' +
      'filter:blur(6px);' +
      'transform:translateY(3px);';
    return span;
  }

  /**
   * Build DOM nodes and flat span array for a string.
   * Words → nowrap wrapper with per-char spans
   * Spaces → plain text node
   * Returns { nodes, spans }
   */
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
        wrapper.style.cssText = 'display:inline;white-space:nowrap;vertical-align:baseline;line-height:1.125;';
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

  /** Build open paren — absolutely positioned, appended last.
   *  top/bottom:auto lets it sit at the baseline of the first line.
   *  GSAP controls all transforms — no CSS transform set here.
   */
  function buildOpenParen() {
    var span = document.createElement('span');
    span.textContent = '(';
    span.style.cssText =
      'position:absolute;' +
      'left:0;' +
      'display:inline-block;' +
      'line-height:1.125;' +
      'white-space:pre;' +
      'opacity:0;';
    // Set initial GSAP state: pulled left, blurred, shifted down
    gsap.set(span, { xPercent: -100, y: 3, filter: 'blur(6px)', opacity: 0 });
    return span;
  }

  /** Build close paren — inline, hidden via opacity/scaleX/blur */
  function buildCloseParen() {
    var span = document.createElement('span');
    span.textContent = ')';
    span.style.cssText =
      'display:inline-block;' +
      'vertical-align:baseline;' +
      'line-height:1.125;' +
      'white-space:pre;' +
      'opacity:0;';
    gsap.set(span, { scaleX: 0, y: 3, filter: 'blur(6px)', opacity: 0, transformOrigin: 'left center' });
    return span;
  }

  // ─── Per-element init ─────────────────────────────────────────────────────────

  function initElement(el) {
    var defaultText   = el.getAttribute('data-hover-headline') || '';
    var alternateText = el.getAttribute('data-hover-alternate') || '';
    if (!defaultText || !alternateText) return;

    el.innerHTML = '';
    el.style.position = 'relative';

    // Text container — only active text lives here
    var textContainer = document.createElement('span');
    textContainer.style.cssText = 'display:inline;line-height:1.125;';
    el.appendChild(textContainer);

    var closeParen = buildCloseParen();
    el.appendChild(closeParen);

    var openParen = buildOpenParen();
    el.appendChild(openParen);

    // Build and show default text immediately
    var active = buildNodes(defaultText);
    active.nodes.forEach(function (n) { textContainer.appendChild(n); });
    gsap.set(active.spans, { opacity: 1, filter: 'blur(0px)', y: 0, maxWidth: '2em' });

    // The main interruptible timeline
    var tl = null;
    var shown = 'default';

    /**
     * Build a GSAP timeline that:
     * 1. Fades parens in
     * 2. Dissolves current spans R→L
     * 3. Swaps DOM to next text
     * 4. Reveals next spans L→R
     * 5. Fades parens out
     */
    function buildTimeline(nextText, onComplete) {
      var currentSpans = active.spans.slice(); // snapshot
      var currentLen   = currentSpans.length;

      var timeline = gsap.timeline({ onComplete: onComplete });

      // 1. Parens in
      timeline.to(openParen, {
        duration: PAREN_DURATION,
        opacity: 1,
        filter: 'blur(0px)',
        xPercent: -100,
        y: 0
      }, 0);
      timeline.to(closeParen, {
        duration: PAREN_DURATION,
        opacity: 1,
        filter: 'blur(0px)',
        scaleX: 1,
        y: 0
      }, 0);

      // 2. Dissolve current text R→L
      timeline.to(currentSpans.slice().reverse(), {
        duration: CHAR_DURATION,
        opacity: 0,
        filter: 'blur(6px)',
        y: 3,
        stagger: CHAR_STAGGER
      }, 0);

      var dissolveTime = currentLen * CHAR_STAGGER + CHAR_DURATION;

      // 3. Swap DOM at the midpoint (after dissolve completes)
      timeline.add(function () {
        while (textContainer.firstChild) textContainer.removeChild(textContainer.firstChild);
        var next = buildNodes(nextText);
        next.nodes.forEach(function (n) { textContainer.appendChild(n); });
        // Set next spans to hidden state so GSAP can animate them in
        gsap.set(next.spans, { opacity: 0, filter: 'blur(6px)', y: 3 });
        active = next;

        // 4. Reveal next text L→R — added dynamically after DOM swap
        timeline.to(next.spans, {
          duration: CHAR_DURATION,
          opacity: 1,
          filter: 'blur(0px)',
          y: 0,
          stagger: CHAR_STAGGER
        });

        var revealTime = next.spans.length * CHAR_STAGGER + CHAR_DURATION;

        // 5. Parens out after reveal
        timeline.to(openParen, {
          duration: PAREN_DURATION,
          opacity: 0,
          filter: 'blur(6px)',
          y: 3
        });
        timeline.to(closeParen, {
          duration: PAREN_DURATION,
          opacity: 0,
          filter: 'blur(6px)',
          scaleX: 0,
          y: 3
        }, '<');

      }, dissolveTime);

      return timeline;
    }

    function toAlternate() {
      if (tl) tl.kill();
      tl = buildTimeline(alternateText, function () {
        shown = 'alternate';
        tl = null;
      });
    }

    function toDefault() {
      if (tl) tl.kill();
      tl = buildTimeline(defaultText, function () {
        shown = 'default';
        tl = null;
      });
    }

    // Desktop — interrupt and reverse immediately on hover out
    if (!isTouch) {
      el.addEventListener('mouseenter', function () {
        if (shown === 'default') toAlternate();
        else if (tl) { tl.kill(); tl = null; toAlternate(); }
      });
      el.addEventListener('mouseleave', function () {
        if (shown === 'alternate') toDefault();
        else if (tl) { tl.kill(); tl = null; toDefault(); }
      });
    }

    // Touch auto-cycle
    if (isTouch) {
      function cycle() {
        tl = buildTimeline(alternateText, function () {
          shown = 'alternate';
          tl = null;
          setTimeout(function () {
            tl = buildTimeline(defaultText, function () {
              shown = 'default';
              tl = null;
              setTimeout(cycle, HOLD_TIME * 1000);
            });
          }, HOLD_TIME * 1000);
        });
      }
      setTimeout(cycle, INITIAL_DELAY * 1000);
    }
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────────

  function init() {
    // Wait for GSAP to be available (Webflow loads it async)
    if (typeof gsap === 'undefined') {
      setTimeout(init, 50);
      return;
    }
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
