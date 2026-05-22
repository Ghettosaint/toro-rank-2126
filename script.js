/*
 * TORO RANK 2126 — boot sequence + reveal animations.
 *
 * No build, no modules. Single script for the static A3 deploy.
 * Keeps the accessibility patterns from the original A3 starter:
 *   - body.js-ready class so non-JS users see content immediately
 *   - prefers-reduced-motion is respected throughout
 *   - IntersectionObserver for scroll reveals
 */

document.body.classList.add("js-ready");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* -------------------------------------------------------------
 * Boot sequence
 *
 * Types out a few terminal-style lines, then fades in the hero.
 * The lines themselves are inserted dynamically — the <noscript>
 * inside .boot__lines is the no-JS fallback shown to crawlers.
 * ------------------------------------------------------------- */

const BOOT_LINES = [
  "> establishing uplink to TORO RANK node :: 2126",
  "> handshake :: schema.org / mcp / a2a",
  "> consultant online.",
];

const BOOT_CHAR_MS = 18;        // ms per character typed
const BOOT_LINE_PAUSE_MS = 240; // pause between lines

const bootContainer = document.querySelector(".boot__lines");
const bootTitle = document.querySelector(".boot__title");
const bootSubtitle = document.querySelector(".boot__subtitle");
const bootCta = document.querySelector(".boot__cta");

/**
 * Reveal hero copy. Called after the boot sequence finishes,
 * or immediately if the user prefers reduced motion.
 */
function revealHero() {
  bootTitle?.classList.add("boot__title--ready");
  bootSubtitle?.classList.add("boot__subtitle--ready");
  bootCta?.classList.add("boot__cta--ready");
}

/**
 * Type a single boot line character-by-character.
 * Returns a Promise that resolves once the line is fully typed.
 *
 * @param {string} text - The full line to type.
 * @param {boolean} isLast - If true, keep the blinking cursor on this line.
 */
function typeLine(text, isLast) {
  return new Promise((resolve) => {
    const span = document.createElement("span");
    span.className = "boot__line";
    if (isLast) span.classList.add("boot__line--current");
    bootContainer.appendChild(span);

    let i = 0;
    const tick = () => {
      span.textContent = text.slice(0, i);
      i += 1;
      if (i <= text.length) {
        setTimeout(tick, BOOT_CHAR_MS);
      } else {
        resolve();
      }
    };
    tick();
  });
}

async function runBootSequence() {
  if (!bootContainer) {
    // Defensive — if the markup ever changes, still reveal the hero.
    revealHero();
    return;
  }

  // Clear the <noscript> fallback now that we know JS is running.
  bootContainer.innerHTML = "";

  if (prefersReducedMotion) {
    // Show every line at once — no typing animation.
    BOOT_LINES.forEach((line) => {
      const span = document.createElement("span");
      span.className = "boot__line";
      span.textContent = line;
      bootContainer.appendChild(span);
    });
    revealHero();
    return;
  }

  for (let i = 0; i < BOOT_LINES.length; i++) {
    const isLast = i === BOOT_LINES.length - 1;
    await typeLine(BOOT_LINES[i], isLast);
    await new Promise((r) => setTimeout(r, BOOT_LINE_PAUSE_MS));
  }

  revealHero();
}

/* -------------------------------------------------------------
 * Section reveal on scroll
 *
 * Kept from the A3 starter — IntersectionObserver pattern is
 * lightweight and respects reduced-motion.
 * ------------------------------------------------------------- */
function setupRevealAnimations() {
  const revealItems = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window) || prefersReducedMotion) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.18 }
  );

  revealItems.forEach((item) => observer.observe(item));
}

/* -------------------------------------------------------------
 * Init
 * ------------------------------------------------------------- */
runBootSequence();
setupRevealAnimations();
