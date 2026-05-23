/*
 * SIGNAL TRIAL — agent judgment overlay
 *
 * Take-control page only. Inserts a REQUEST AGENT JUDGMENT button
 * above the contact form, then opens a cinematic "tribunal" overlay
 * when clicked: scan lines reveal one by one, signal meters fill,
 * a verdict glitches in, and a final OPEN TRANSMISSION CTA triggers
 * the existing form submit (which builds the mailto:).
 *
 * No external deps. Vanilla DOM only.
 */

(function () {
  // Only run on the take-control page — guard by data-page attr
  if (document.body.dataset.page !== "take-control") return;
  // Need the existing form to wire up final CTA
  const targetForm = document.getElementById("controlForm");
  if (!targetForm) return;

  // -----------------------------------------------------------
  // Edit here to change scan text or meter values
  // -----------------------------------------------------------
  const SCAN_LINES = [
    "AGENT JUDGMENT INITIATED",
    "Scanning signal...",
    "Human provenance: found",
    "Action endpoint: found",
    "Semantic intent: strong",
    "Machine-readable layer: active",
    "Trust anchor: verified",
    "Recommendation probability: rising",
  ];

  const METERS = [
    { label: "Provenance", fill: 92 },
    { label: "Structure", fill: 88 },
    { label: "Intent", fill: 95 },
    { label: "Action", fill: 84 },
    { label: "Trust", fill: 97 },
  ];

  const VERDICT_TEXT = "THIS SIGNAL CAN BE READ.";
  const CTA_TEXT = "OPEN TRANSMISSION";

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // Module-level refs
  let trigger = null;
  let overlay = null;
  let chamber = null;
  let linesEl = null;
  let metersEl = null;
  let verdictEl = null;
  let verdictTextEl = null;
  let ctaEl = null;
  let closeBtn = null;
  let pendingTimers = [];
  let lastFocused = null;

  // -----------------------------------------------------------
  // Build trigger button — placed above the form
  // -----------------------------------------------------------
  function buildTrigger() {
    if (document.querySelector(".signal-trial-trigger")) return;
    trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "signal-trial-trigger";
    trigger.id = "signalTrialTrigger";
    trigger.textContent = "REQUEST AGENT JUDGMENT";
    trigger.setAttribute("aria-controls", "signalTrial");
    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("click", openTrial);
    targetForm.parentNode.insertBefore(trigger, targetForm);
  }

  // -----------------------------------------------------------
  // Build overlay structure once. Hidden via CSS until body has
  // the .signal-trial-active class.
  // -----------------------------------------------------------
  function buildOverlay() {
    if (document.getElementById("signalTrial")) return;

    overlay = document.createElement("div");
    overlay.className = "signal-trial";
    overlay.id = "signalTrial";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "signalTrialHead");

    chamber = document.createElement("div");
    chamber.className = "signal-trial__chamber";

    // Head — title + close
    const head = document.createElement("div");
    head.className = "signal-trial__head";
    const headTitle = document.createElement("span");
    headTitle.id = "signalTrialHead";
    headTitle.textContent = "// SIGNAL TRIAL :: ACTIVE";
    closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "signal-trial__close";
    closeBtn.setAttribute("aria-label", "Close signal trial");
    closeBtn.textContent = "× CLOSE";
    closeBtn.addEventListener("click", closeTrial);
    head.appendChild(headTitle);
    head.appendChild(closeBtn);

    // Scan lines
    linesEl = document.createElement("ul");
    linesEl.className = "signal-trial__lines";
    linesEl.setAttribute("aria-live", "polite");

    // Meters
    metersEl = document.createElement("div");
    metersEl.className = "signal-trial__meters";
    METERS.forEach(function (m) {
      const row = document.createElement("div");
      row.className = "signal-trial__meter";
      row.style.setProperty("--fill", m.fill + "%");
      const label = document.createElement("span");
      label.textContent = m.label;
      const track = document.createElement("div");
      track.className = "signal-trial__meter-track";
      const fill = document.createElement("div");
      fill.className = "signal-trial__meter-fill";
      track.appendChild(fill);
      const value = document.createElement("span");
      value.className = "signal-trial__meter-value";
      value.textContent = "0%";
      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(value);
      metersEl.appendChild(row);
    });

    // Verdict
    verdictEl = document.createElement("div");
    verdictEl.className = "signal-trial__verdict";
    const verdictLabel = document.createElement("p");
    verdictLabel.className = "signal-trial__verdict-label";
    verdictLabel.textContent = "// VERDICT";
    verdictTextEl = document.createElement("p");
    verdictTextEl.className = "signal-trial__verdict-text";
    verdictTextEl.textContent = VERDICT_TEXT;
    verdictEl.appendChild(verdictLabel);
    verdictEl.appendChild(verdictTextEl);

    // CTA — fires form submission
    ctaEl = document.createElement("button");
    ctaEl.type = "button";
    ctaEl.className = "signal-trial__cta";
    ctaEl.textContent = CTA_TEXT;
    ctaEl.addEventListener("click", function () {
      // Close overlay then trigger form submit via existing handler
      closeTrial();
      // requestSubmit() fires the form's submit event so existing
      // listeners (take-control.js / mailto: builder) run.
      try {
        if (typeof targetForm.requestSubmit === "function") {
          targetForm.requestSubmit();
        } else {
          // Fallback for older browsers
          targetForm.dispatchEvent(new Event("submit", { cancelable: true }));
        }
      } catch (e) {}
    });

    chamber.appendChild(head);
    chamber.appendChild(linesEl);
    chamber.appendChild(metersEl);
    chamber.appendChild(verdictEl);
    chamber.appendChild(ctaEl);
    overlay.appendChild(chamber);
    document.body.appendChild(overlay);
  }

  // -----------------------------------------------------------
  // Reset overlay state — clear lines, reset meters, hide verdict
  // -----------------------------------------------------------
  function resetState() {
    pendingTimers.forEach(function (t) { window.clearTimeout(t); });
    pendingTimers = [];
    if (linesEl) linesEl.innerHTML = "";
    if (verdictEl) {
      verdictEl.classList.remove("is-visible", "is-glitching");
    }
    if (ctaEl) ctaEl.classList.remove("is-ready");
    if (metersEl) {
      metersEl.querySelectorAll(".signal-trial__meter").forEach(function (row) {
        row.classList.remove("is-filling");
        const val = row.querySelector(".signal-trial__meter-value");
        if (val) val.textContent = "0%";
      });
    }
  }

  // -----------------------------------------------------------
  // Animate a meter's percentage counter alongside its CSS fill
  // -----------------------------------------------------------
  function tickMeter(row, target) {
    const value = row.querySelector(".signal-trial__meter-value");
    if (!value) return;
    if (prefersReducedMotion) {
      value.textContent = target + "%";
      return;
    }
    const duration = 1400;
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      value.textContent = Math.round(eased * target) + "%";
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // -----------------------------------------------------------
  // Run the trial sequence — lines, meters, verdict, CTA
  // -----------------------------------------------------------
  function runSequence() {
    const lineDelay = prefersReducedMotion ? 0 : 220;

    // 1. Reveal scan lines
    SCAN_LINES.forEach(function (text, i) {
      const li = document.createElement("li");
      li.textContent = "> " + text;
      linesEl.appendChild(li);
      const t = window.setTimeout(function () {
        li.classList.add("is-visible");
      }, 100 + i * lineDelay);
      pendingTimers.push(t);
    });

    const linesDoneAt = 100 + SCAN_LINES.length * lineDelay;

    // 2. Fill meters (slightly after lines finish)
    const metersStart = linesDoneAt + (prefersReducedMotion ? 0 : 300);
    const tMeters = window.setTimeout(function () {
      const rows = metersEl.querySelectorAll(".signal-trial__meter");
      rows.forEach(function (row, i) {
        const target = METERS[i].fill;
        const stagger = prefersReducedMotion ? 0 : i * 180;
        const tFill = window.setTimeout(function () {
          row.classList.add("is-filling");
          tickMeter(row, target);
        }, stagger);
        pendingTimers.push(tFill);
      });
    }, metersStart);
    pendingTimers.push(tMeters);

    // 3. Show verdict (after meters complete)
    const verdictAt = metersStart + (prefersReducedMotion ? 0 : 2000);
    const tVerdict = window.setTimeout(function () {
      verdictEl.classList.add("is-visible");
      if (!prefersReducedMotion) {
        verdictEl.classList.add("is-glitching");
        const tGlitchOff = window.setTimeout(function () {
          verdictEl.classList.remove("is-glitching");
        }, 650);
        pendingTimers.push(tGlitchOff);
      }
    }, verdictAt);
    pendingTimers.push(tVerdict);

    // 4. Reveal CTA + focus it
    const ctaAt = verdictAt + (prefersReducedMotion ? 0 : 700);
    const tCta = window.setTimeout(function () {
      ctaEl.classList.add("is-ready");
      ctaEl.focus();
    }, ctaAt);
    pendingTimers.push(tCta);
  }

  // -----------------------------------------------------------
  // Open / close
  // -----------------------------------------------------------
  function openTrial() {
    lastFocused = document.activeElement;
    document.body.classList.add("signal-trial-active");
    if (trigger) trigger.setAttribute("aria-expanded", "true");
    resetState();
    runSequence();
    // Focus close so Escape works immediately
    if (closeBtn) closeBtn.focus();
  }

  function closeTrial() {
    document.body.classList.remove("signal-trial-active");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    // Don't keep timers running for a closed dialog
    pendingTimers.forEach(function (t) { window.clearTimeout(t); });
    pendingTimers = [];
    // Restore focus to whatever was active before
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    } else if (trigger) {
      trigger.focus();
    }
  }

  // Escape key dismiss
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (document.body.classList.contains("signal-trial-active")) {
      closeTrial();
    }
  });

  // -----------------------------------------------------------
  // Init
  // -----------------------------------------------------------
  function init() {
    buildTrigger();
    buildOverlay();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
