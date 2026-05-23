/*
 * TORO RANK 2126 — Agent page FX
 *
 * Loaded only on agent.html. Three effects that make the page feel
 * like it's assembling from a transmission rather than just rendering:
 *
 *   1. Character decode on section headings — text scrambles in
 *      katakana/symbols, then locks in left-to-right.
 *   2. Service card boot-up — corner brackets draw in (CSS-driven),
 *      triggered when each card enters the viewport.
 *   3. Signals chip stagger — each chip fades + scales in with a
 *      small delay offset, triggered when the strip enters viewport.
 *   4. Field log line draw — dashed border draws across the entry
 *      before content appears (CSS-driven, same trigger pattern).
 *
 * No deps. Plain script. Respects prefers-reduced-motion.
 */

(function () {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // -------------------------------------------------------------
  // Character decode
  //
  // Pool of glyphs to scramble through. Mix of katakana, ASCII
  // symbols, and digits — feels like the page is being decrypted.
  // -------------------------------------------------------------
  const DECODE_POOL =
    "アイウエオカキクケコサシスセソタチツテト0123456789@#${}<>/[];:";
  const DECODE_DURATION_MS = 900;

  function decodeText(element) {
    const finalText = element.textContent || "";
    if (!finalText) return;

    // Cache the target so we can restore it (and skip re-running)
    if (element.dataset.decoded === "true") return;
    element.dataset.decoded = "true";

    if (prefersReducedMotion) {
      // Just leave the text as-is
      return;
    }

    const chars = Array.from(finalText);
    const startTime = performance.now();

    function frame() {
      const t = Math.min(1, (performance.now() - startTime) / DECODE_DURATION_MS);
      const lockedCount = Math.floor(t * chars.length);

      const display = chars
        .map((target, i) => {
          if (i < lockedCount) return target;
          if (target === " " || target === "\n") return target;
          return DECODE_POOL[Math.floor(Math.random() * DECODE_POOL.length)];
        })
        .join("");

      element.textContent = display;

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        element.textContent = finalText;
      }
    }

    frame();
  }

  // -------------------------------------------------------------
  // Element boot-up — adds .is-booted class when in viewport
  // -------------------------------------------------------------
  function bootOnVisible(elements) {
    if (!elements.length) return;

    if (!("IntersectionObserver" in window) || prefersReducedMotion) {
      elements.forEach((el) => el.classList.add("is-booted"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (!entry.isIntersecting) return;
          // Stagger delay so multiple visible elements pop in sequence
          const idx = Array.from(elements).indexOf(entry.target);
          const delay = idx * 80;
          setTimeout(() => entry.target.classList.add("is-booted"), delay);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    elements.forEach((el) => observer.observe(el));
  }

  // -------------------------------------------------------------
  // Decode trigger — decode section h2s when they enter view
  // -------------------------------------------------------------
  function bindDecode() {
    const headings = document.querySelectorAll(".section-heading h2");
    if (!headings.length) return;

    if (!("IntersectionObserver" in window) || prefersReducedMotion) {
      // Leave text as-is
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          decodeText(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );

    headings.forEach((h) => observer.observe(h));
  }

  // -------------------------------------------------------------
  // Random chip flicker
  //
  // Every ~2.5 seconds, pick a random signals chip and briefly
  // highlight it. Reads as "data point activating" — gives the
  // page ambient motion without being distracting.
  // -------------------------------------------------------------
  function startRandomFlicker() {
    const chips = document.querySelectorAll(".signals__list li");
    if (!chips.length || prefersReducedMotion) return;

    setInterval(() => {
      // Skip flicker when tab is hidden — no point burning cycles
      if (document.hidden) return;
      const chip = chips[Math.floor(Math.random() * chips.length)];
      chip.classList.add("is-flickering");
      setTimeout(() => chip.classList.remove("is-flickering"), 700);
    }, 2500);
  }

  // -------------------------------------------------------------
  // Init
  // -------------------------------------------------------------
  bindDecode();
  bootOnVisible(document.querySelectorAll(".service"));
  bootOnVisible(document.querySelectorAll(".signals__list li"));
  bootOnVisible(document.querySelectorAll(".field-log__entry"));
  startRandomFlicker();
})();
