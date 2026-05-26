/**
 * hover-animation-v4.js
 * nomoredesign 2026 — Auto-cycling headline blur-fade animation
 *
 * Uses GSAP (available globally via Webflow).
 *
 * Targets any element with [data-hover-headline] and [data-hover-alternate].
 * Animates automatically on all devices — no hover interaction.
 *
 * A sibling element matching [data-plus-sign] or .plus-sign scales down
 * during animation and back up when text is static.
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
  var PLUS_DURATION  = 0.35;
  var INITIAL_DELAY  = 1.5;
  var HOLD_TIME      = 1.5;

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
   * Build DOM nodes, flat span array, and a close paren span for a string.
   * The close paren is created fresh each time as the last span in the sequence
   * so it always sits exactly at the end of the text on any line.
   *
   * Returns { nodes, spans, closeParen }
   *   nodes     — DOM nodes to append to textContainer
   *   spans     — all animated spans including closeParen at the end
   *   closeParen — reference to the close paren span for separate timing
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

    // Close paren — created as last node, treated as a character span
    var closeParen = document.createElement('span');
    closeParen.textContent = ')';
    closeParen.style.cssText =
      'display:inline-block;' +
      'vertical-align:baseline;' +
      'line-height:1.125;' +
      'white-space:pre;';
    gsap.set(closeParen, { opacity: 0, filter: 'blur(6px)', y: 3 });
    nodes.push(closeParen);
    spans.push(closeParen);

    return { nodes: nodes, spans: spans, closeParen: closeParen };
  }

  /** Open paren — absolutely positioned, permanently in textContainer */
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

  // ─── Per-element init ─────────────────────────────────────────────────────────

  function initElement(el) {
    var defaultText   = el.getAttribute('data-hover-headline') || '';
    var alternateText = el.getAttribute('data-hover-alternate') || '';
    if (!defaultText || !alternateText) return;

    el.innerHTML = '';
    el.style.position = 'relative';

    // Find .plus-sign sibling
    var plusSign = null;
    var parent = el.parentNode;
    if (parent) {
      plusSign = parent.querySelector('.plus-sign');
    }

    // textContainer needs position:relative for open paren anchor
    var textContainer = document.createElement('span');
    textContainer.style.cssText = 'display:inline;position:relative;line-height:1.125;';
    el.appendChild(textContainer);

    // Open paren lives permanently in textContainer as first child
    var openParen = buildOpenParen();
    textContainer.appendChild(openParen);

    // Populate with default text, shown immediately (no close paren at rest)
    var active = buildNodes(defaultText);
    active.nodes.forEach(function (n) { textContainer.appendChild(n); });
    // Show all default spans immediately except close paren
    var defaultCharSpans = active.spans.slice(0, active.spans.length - 1);
    gsap.set(defaultCharSpans, { opacity: 1, filter: 'blur(0px)', y: 0 });
    // Keep close paren hidden and remove it from DOM at rest
    textContainer.removeChild(active.closeParen);

    var tl    = null;
    var shown = 'default';

    /**
     * Build a GSAP timeline:
     * 1. Plus sign scales down + open paren fades in
     * 2. Current text dissolves R→L (close paren already removed)
     * 3. DOM swapped to next text (with fresh close paren at end)
     * 4. Next text reveals L→R including close paren
     * 5. Close paren removed from DOM, open paren fades out, plus sign scales up
     */
    function buildTimeline(nextText, onComplete) {
      var currentSpans = active.spans.slice(0, active.spans.length - 1); // chars only
      var currentLen   = currentSpans.length;
      var dissolveTime = currentLen * CHAR_STAGGER + CHAR_DURATION;

      var timeline = gsap.timeline({ onComplete: onComplete });

      // 1. Plus sign down + open paren in
      if (plusSign) {
        timeline.to(plusSign, {
          duration: PLUS_DURATION,
          scale: 0,
          ease: 'power2.in'
        }, 0);
      }
      timeline.to(openParen, {
        duration: PAREN_DURATION,
        opacity: 1, filter: 'blur(0px)', xPercent: -100, y: 0
      }, 0);

      // 2. Dissolve current text R→L
      timeline.to(currentSpans.slice().reverse(), {
        duration: CHAR_DURATION,
        opacity: 0, filter: 'blur(6px)', y: 3,
        stagger: CHAR_STAGGER
      }, 0);

      // 3. Swap DOM after dissolve
      timeline.add(function () {
        // Remove old text nodes (keep openParen)
        var children = Array.prototype.slice.call(textContainer.childNodes);
        children.forEach(function (child) {
          if (child !== openParen) textContainer.removeChild(child);
        });

        // Build and insert next text (includes fresh close paren at end)
        var next = buildNodes(nextText);
        next.nodes.forEach(function (n) { textContainer.appendChild(n); });
        gsap.set(next.spans, { opacity: 0, filter: 'blur(6px)', y: 3 });
        active = next;

        // 4. Reveal next text L→R (all spans including close paren)
        timeline.to(next.spans, {
          duration: CHAR_DURATION,
          opacity: 1, filter: 'blur(0px)', y: 0,
          stagger: CHAR_STAGGER
        });

        var revealTime = next.spans.length * CHAR_STAGGER + CHAR_DURATION;

        // 5. Close paren out, open paren out, plus sign up — all together
        timeline.add(function () {
          // Remove close paren from DOM silently
          if (next.closeParen.parentNode) {
            next.closeParen.parentNode.removeChild(next.closeParen);
          }
        });
        timeline.to(openParen, {
          duration: PAREN_DURATION,
          opacity: 0, filter: 'blur(6px)', xPercent: -100, y: 3
        }, '-=0');
        if (plusSign) {
          timeline.to(plusSign, {
            duration: PLUS_DURATION,
            scale: 1,
            ease: 'power2.out'
          }, '<');
        }

      }, dissolveTime);

      return timeline;
    }

    function toAlternate(onDone) {
      if (tl) tl.kill();
      tl = buildTimeline(alternateText, function () {
        shown = 'alternate'; tl = null;
        if (onDone) onDone();
      });
    }

    function toDefault(onDone) {
      if (tl) tl.kill();
      tl = buildTimeline(defaultText, function () {
        shown = 'default'; tl = null;
        if (onDone) onDone();
      });
    }

    // Auto-cycle on all devices
    function cycle() {
      toAlternate(function () {
        setTimeout(function () {
          toDefault(function () {
            setTimeout(cycle, HOLD_TIME * 1000);
          });
        }, HOLD_TIME * 1000);
      });
    }
    setTimeout(cycle, INITIAL_DELAY * 1000);
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
