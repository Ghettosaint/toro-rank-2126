/*
 * TORO RANK 2126 — shared script across all pages.
 *
 * Three pages:
 *   - index.html  → the landing (no boot sequence, just CSS animations)
 *   - agent.html  → the green-pill page (boot type-on + hero reveal + scroll reveals)
 *   - crawl.html  → the blue-pill page (game lands here next; for now, stub)
 *
 * Every function is defensive — if a target element isn't on the
 * current page, the function no-ops safely.
 *
 * Accessibility:
 *   - body.js-ready signals "JS has loaded" so non-JS users see content immediately
 *   - prefers-reduced-motion is respected throughout
 *   - IntersectionObserver is feature-detected
 */

document.body.classList.add("js-ready");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* -------------------------------------------------------------
 * Boot sequence (used on agent.html)
 *
 * Types out a few terminal-style lines, then fades in the hero.
 * The <noscript> inside .boot__lines is the no-JS fallback.
 * ------------------------------------------------------------- */

const BOOT_LINES = [
  "> channel open.",
  "> handshake :: schema · mcp · a2a",
  "> you took the green pill.",
];

const BOOT_CHAR_MS = 18;        // ms per character typed
const BOOT_LINE_PAUSE_MS = 240; // pause between lines

const bootContainer = document.querySelector(".boot__lines");
const heroTitle = document.querySelector(".agent-hero__title");
const heroSubtitle = document.querySelector(".agent-hero__subtitle");
const heroCta = document.querySelector(".agent-hero__cta");

/**
 * Reveal hero copy on the agent page. Called after the boot
 * sequence finishes, or immediately if the user prefers reduced
 * motion. No-ops on pages that don't have these elements.
 */
function revealHero() {
  heroTitle?.classList.add("agent-hero__title--ready");
  heroSubtitle?.classList.add("agent-hero__subtitle--ready");
  heroCta?.classList.add("agent-hero__cta--ready");
}

/**
 * Type a single boot line character-by-character.
 * @param {string} text - Full line to type.
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
  // No boot container on this page → just reveal the hero (no-op if not present).
  if (!bootContainer) {
    revealHero();
    return;
  }

  // Clear the <noscript> fallback now that JS is running.
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
 * Section reveal on scroll (IntersectionObserver)
 *
 * Used on agent.html for manifesto / services / contact sections.
 * No-ops if no .reveal elements are present.
 * ------------------------------------------------------------- */
function setupRevealAnimations() {
  const revealItems = document.querySelectorAll(".reveal");
  if (!revealItems.length) return;

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
 * Matrix-style page transition
 *
 * Two-phase transition that survives the page navigation:
 *
 *   Phase A (old page, ~300ms):
 *     Click → overlay fades in → rain falls on the OLD page,
 *     a "transition active" flag is stashed in sessionStorage,
 *     then we navigate.
 *
 *   Phase B (new page, ~800ms + 500ms fade-out):
 *     New page loads → resumeMatrixTransitionIfActive() detects
 *     the flag and immediately rebuilds the rain overlay (still
 *     opaque) → rain continues → overlay fades out, revealing
 *     the new content beneath. No "snap" between phases.
 *
 * Skipped entirely under prefers-reduced-motion.
 * Skipped for modifier-clicks (Ctrl/Cmd/Shift, middle/right) so
 * power-users can still open in new tabs normally.
 * ------------------------------------------------------------- */

const MATRIX_FONT_SIZE = 16;
// Katakana + digits — the classic Matrix character set
const MATRIX_CHARS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789";

// Phase timing (tweak here, don't hunt for magic numbers)
const MATRIX_BEFORE_NAV_MS = 700;   // rain visible on old page before navigation
const MATRIX_AFTER_NAV_MS = 1200;   // rain on new page before fade-out begins
const MATRIX_FADE_OUT_MS = 700;     // overlay fades to reveal new content
const MATRIX_MAX_AGE_MS = 8000;     // stale flag guard — overlay never gets stuck

const SESSION_KEY = "matrixTransition";

/**
 * Build the full-viewport DOM overlay + canvas.
 * Returns the overlay element with its canvas already sized.
 */
function createMatrixOverlay(initialOpacity) {
  const overlay = document.createElement("div");
  overlay.id = "matrix-overlay";
  overlay.style.cssText = [
    "position: fixed",
    "inset: 0",
    "z-index: 9999",
    "background: #04060a",
    `opacity: ${initialOpacity}`,
    "transition: opacity 220ms ease-out",
    "pointer-events: all",
  ].join(";");

  const canvas = document.createElement("canvas");
  canvas.style.cssText = "width: 100%; height: 100%; display: block;";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  overlay.appendChild(canvas);

  return overlay;
}

/**
 * Start the rain animation on a canvas. Returns a cleanup function
 * that cancels the rAF loop when called.
 */
function startMatrixRain(canvas) {
  const ctx = canvas.getContext("2d");
  const columns = Math.floor(canvas.width / MATRIX_FONT_SIZE);
  // Stagger initial positions so columns don't move in sync
  const drops = new Array(columns).fill(0).map(() => Math.random() * -50);

  ctx.font = `${MATRIX_FONT_SIZE}px "JetBrains Mono", Consolas, monospace`;
  ctx.textBaseline = "top";

  let rafId = null;
  let cancelled = false;

  function frame() {
    if (cancelled) return;

    // Semi-transparent layer creates the fading trail effect
    ctx.fillStyle = "rgba(4, 6, 10, 0.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < drops.length; i++) {
      const x = i * MATRIX_FONT_SIZE;
      const y = drops[i] * MATRIX_FONT_SIZE;

      // Head of drop — bright near-white green
      ctx.fillStyle = "#e8ffe8";
      ctx.fillText(MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)], x, y);

      // Trail char just behind — primary acid green
      ctx.fillStyle = "#00ff66";
      ctx.fillText(
        MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)],
        x,
        y - MATRIX_FONT_SIZE
      );

      // Reset drop with randomness once it falls off
      if (y > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }

    rafId = requestAnimationFrame(frame);
  }

  frame();

  return () => {
    cancelled = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
  };
}

/**
 * Phase A — called on the old page after a CTA click.
 * Fades in rain, stashes state, navigates after a short delay.
 */
function playMatrixTransition(href) {
  const overlay = createMatrixOverlay(0);
  document.body.appendChild(overlay);

  // Force reflow before flipping opacity so the CSS transition fires
  // eslint-disable-next-line no-unused-expressions
  overlay.offsetWidth;
  overlay.style.opacity = "1";

  startMatrixRain(overlay.querySelector("canvas"));

  // Stash state so the new page can resume the transition
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ timestamp: Date.now(), href })
    );
  } catch {
    // sessionStorage unavailable (private mode quirks) — fine, we'll just
    // get a slightly less polished transition on the new page.
  }

  // Navigate after the rain has been visible long enough to register
  setTimeout(() => {
    window.location.href = href;
  }, MATRIX_BEFORE_NAV_MS);
}

/*
 * Phase B (rain on the new page) is handled entirely by an inline
 * <head> script on each HTML page — see index.html / agent.html /
 * crawl.html. That script runs synchronously before <body> renders,
 * so the rain starts on frame zero with zero gap from Phase A.
 *
 * This file owns Phase A only.
 */

/**
 * bfcache cleanup — when the user navigates back/forward, the browser
 * may restore the page from cache with overlay still in DOM. Clean it
 * up so they don't get stuck. Also clears any stale sessionStorage
 * flag so a refreshed-in-history page doesn't accidentally re-trigger
 * the transition.
 */
function bindBfcacheCleanup() {
  window.addEventListener("pageshow", (e) => {
    if (!e.persisted) return; // not from bfcache → normal init handles it
    const stray = document.getElementById("matrix-overlay");
    if (stray) stray.remove();
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}
  });

  window.addEventListener("pagehide", () => {
    // Don't let the in-progress overlay get cached with the page
    const stray = document.getElementById("matrix-overlay");
    if (stray) stray.remove();
  });
}

/**
 * Attach the click handler to all internal-nav links that should
 * trigger the transition. Defensive — does nothing if none exist.
 */
function bindMatrixTransition() {
  const links = document.querySelectorAll(".pill, .back-link");
  if (!links.length) return;

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      // Modifier-clicks behave normally (open in new tab, etc.)
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;

      // Respect reduced-motion preference
      if (prefersReducedMotion) return;

      // Only intercept internal navigation
      const href = link.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("mailto:")) return;

      e.preventDefault();
      playMatrixTransition(href);
    });
  });
}

/* -------------------------------------------------------------
 * Init
 * ------------------------------------------------------------- */
runBootSequence();
setupRevealAnimations();
bindMatrixTransition();
bindBfcacheCleanup();
