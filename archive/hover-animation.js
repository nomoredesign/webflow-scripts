/**
 * hover-animation.js
 * nomoredesign 2026 — Hover headline blur-fade animation v3.0.2
 *
 * Uses GSAP (available globally via Webflow) for interruptible,
 * reversible character-level blur-fade animations.
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

  var CHAR_DURATION  = 0.3;
  var CHAR_STAGGER   = 0.022;
  var PAREN_DURATION = 0.35;
  var INITIAL_DELAY  = 1.5;
  var HOLD_TIME      = 1.5;

  var isTouch = navigator.maxTouchPoints > 0;

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function makeCharSpan(char) {
    var span = document.createElement('span');
    span.textContent = char;
    span.style.cssText =
      'display:inline-block;' +
      'vertical-align:baseline;' +
      'line-height:1.125;' +
      'white-space:pre;';
    gsap.set(span, { opacity: 0, filter: 'blur(6px)', y: 3 });
    return span;
  }

  /**
   * Build DOM nodes and flat span array for a string.
   * Words → nowrap wrapper with per-char spans
   * Spaces → plain text node
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

  /**
   * Open paren — absolutely positioned, sits INSIDE textContainer as first child.
   * position:absolute takes it out of flow so it doesn't push text right.
   * left:0 anchors to textContainer's left edge (which must be position:relative).
   * Being inside textContainer means it shares the same line box baseline.
   */
  function buildOpenParen() {
    var span = document.createElement('span');
    span.textContent = '(';
    span.style.cssText =
      'position:absolute;' +
      'left:0;' +
      'top:0;' +
      'display:inline-block;' +
      'line-height:1.125;' +
      'white-space:pre;';
    gsap.set(span, { opacity: 0, filter: 'blur(6px)', xPercent: -100, y: 3 });
    return span;
  }

  /**
   * Close paren — inline, sits INSIDE textContainer as last child.
   * Being in flow means it naturally trails the last character on any line.
   * Collapsed via scaleX:0 when hidden so it takes no space.
   */
  function buildCloseParen() {
    var span = document.createElement('span');
    span.textContent = ')';
    span.style.cssText =
      'display:inline-block;' +
      'vertical-align:baseline;' +
      'line-height:1.125;' +
      'white-space:pre;';
    gsap.set(span, { opacity: 0, filter: 'blur(6px)', y: 3 });
    return span;
  }

  // ─── Per-element init ─────────────────────────────────────────────────────────

  function initElement(el) {
    var defaultText   = el.getAttribute('data-hover-headline') || '';
    var alternateText = el.getAttribute('data-hover-alternate') || '';
    if (!defaultText || !alternateText) return;

    el.innerHTML = '';
    el.style.position = 'relative';

    // textContainer needs position:relative so open paren's left:0 anchors here
    var textContainer = document.createElement('span');
    textContainer.style.cssText = 'display:inline;position:relative;line-height:1.125;';
    el.appendChild(textContainer);

    // Parens live INSIDE textContainer so they follow the text's line boxes
    var openParen  = buildOpenParen();
    var closeParen = buildCloseParen();

    // Populate with default text, shown immediately
    // openParen is abs-positioned first child; closeParen added dynamically
    var active = buildNodes(defaultText);
    textContainer.appendChild(openParen);
    active.nodes.forEach(function (n) { textContainer.appendChild(n); });
    // closeParen not in DOM yet — added during transitions only

    gsap.set(active.spans, { opacity: 1, filter: 'blur(0px)', y: 0 });

    var tl   = null;
    var shown = 'default';

    /**
     * Build a GSAP timeline:
     * 1. Parens fade in
     * 2. Current spans dissolve R→L
     * 3. DOM swapped (next text inserted between parens)
     * 4. Next spans reveal L→R
     * 5. Parens fade out
     */
    function buildTimeline(nextText, onComplete) {
      var currentSpans = active.spans.slice();
      var currentLen   = currentSpans.length;
      var dissolveTime = currentLen * CHAR_STAGGER + CHAR_DURATION;

      var timeline = gsap.timeline({ onComplete: onComplete });

      // 1. Parens in (both directions)
      timeline.to(openParen, {
        duration: PAREN_DURATION,
        opacity: 1, filter: 'blur(0px)', xPercent: -100, y: 0
      }, 0);
      timeline.to(closeParen, {
        duration: PAREN_DURATION,
        opacity: 1, filter: 'blur(0px)', y: 0
      }, 0);

      // Remove closeParen from DOM before dissolve so it doesn't sit
      // at the wrong position during the transition
      if (closeParen.parentNode) closeParen.parentNode.removeChild(closeParen);

      // 2. Dissolve current text R→L
      timeline.to(currentSpans.slice().reverse(), {
        duration: CHAR_DURATION,
        opacity: 0, filter: 'blur(6px)', y: 3,
        stagger: CHAR_STAGGER
      }, 0);

      // 3. Swap DOM after dissolve — remove old text nodes, insert new ones
      // keeping openParen first and closeParen last inside textContainer
      timeline.add(function () {
        // Remove everything except the parens
        var children = Array.prototype.slice.call(textContainer.childNodes);
        children.forEach(function (child) {
          if (child !== openParen && child !== closeParen) {
            textContainer.removeChild(child);
          }
        });

        // Insert new text nodes, then append closeParen at the end
        var next = buildNodes(nextText);
        next.nodes.forEach(function (n) { textContainer.appendChild(n); });
        textContainer.appendChild(closeParen);
        gsap.set(next.spans, { opacity: 0, filter: 'blur(6px)', y: 3 });
        active = next;

        // 4. Reveal next text L→R
        timeline.to(next.spans, {
          duration: CHAR_DURATION,
          opacity: 1, filter: 'blur(0px)', y: 0,
          stagger: CHAR_STAGGER
        });

        var revealTime = next.spans.length * CHAR_STAGGER + CHAR_DURATION;

        // 5. Parens out after reveal
        timeline.to(openParen, {
          duration: PAREN_DURATION,
          opacity: 0, filter: 'blur(6px)', xPercent: -100, y: 3
        });
        timeline.to(closeParen, {
          duration: PAREN_DURATION,
          opacity: 0, filter: 'blur(6px)', y: 3
        }, '<');

      }, dissolveTime);

      return timeline;
    }

    function toAlternate() {
      if (tl) tl.kill();
      tl = buildTimeline(alternateText, function () {
        shown = 'alternate'; tl = null;
      });
    }

    function toDefault() {
      if (tl) tl.kill();
      tl = buildTimeline(defaultText, function () {
        shown = 'default'; tl = null;
      });
    }

    // Desktop
    if (!isTouch) {
      el.addEventListener('mouseenter', function () {
        if (shown === 'default' || tl) toAlternate();
      });
      el.addEventListener('mouseleave', function () {
        if (shown === 'alternate' || tl) toDefault();
      });
    }

    // Touch auto-cycle
    if (isTouch) {
      function cycle() {
        tl = buildTimeline(alternateText, function () {
          shown = 'alternate'; tl = null;
          setTimeout(function () {
            tl = buildTimeline(defaultText, function () {
              shown = 'default'; tl = null;
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
    if (typeof gsap === 'undefined') { setTimeout(init, 50); return; }
    var elements = document.querySelectorAll('[data-hover-headline]');
    for (var i = 0; i < elements.length; i++) { initElement(elements[i]); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
