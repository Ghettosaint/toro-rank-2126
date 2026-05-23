/*
 * TORO RANK 2126 — Take control page
 *
 * The contact form is a static-only experience. There's no backend on
 * the A3 / ICP deploy, so the "transmission" is actually a mailto:
 * link that opens the visitor's email client pre-filled with their
 * form data. The cinematic part is the on-screen success animation
 * that plays regardless of whether the mailto opens.
 *
 * Flow:
 *   1. User submits form
 *   2. We validate required fields, show error states if missing
 *   3. Inputs lock
 *   4. Submit button transforms to "transmitting..." state
 *   5. Each field shows a small green tick beside its label (sequential)
 *   6. After all ticks, the success overlay appears with decoded headline
 *   7. mailto: link opens (or is offered as a click-to-open fallback)
 */

(function () {
  const form = document.getElementById("controlForm");
  if (!form) return;

  const successOverlay = document.getElementById("controlSuccess");
  const successHeadline = successOverlay?.querySelector(".control-success__headline");

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // -------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------

  /** Decode/scramble effect on a string. Used for the success headline. */
  function decodeText(element, finalText, durationMs = 900) {
    const POOL = "アイウエオカキクケコサシスセソ0123456789@#${}<>";
    const chars = finalText.split("");
    const start = performance.now();

    function frame() {
      const t = Math.min(1, (performance.now() - start) / durationMs);
      const locked = Math.floor(t * chars.length);
      const display = chars
        .map((target, i) => {
          if (i < locked) return target;
          if (target === " " || target === "\n") return target;
          return POOL[Math.floor(Math.random() * POOL.length)];
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

  /**
   * Add a visible tick mark next to a row's label. Used during the
   * sequential "field validated" animation after submit.
   */
  function addRowTick(row) {
    const existing = row.querySelector(".control-form__tick");
    if (existing) return;
    const tick = document.createElement("span");
    tick.className = "control-form__tick";
    tick.textContent = "·OK";
    tick.setAttribute("aria-hidden", "true");
    const label = row.querySelector(".control-form__label");
    if (label) label.appendChild(tick);
  }

  /** Build the mailto: URL from form data. */
  function buildMailto(data) {
    const lines = [
      "[IDENTITY] " + (data.name || ""),
      "[RETURN CHANNEL] " + (data.email || ""),
      "[PROBLEM CLASS] " + (data.subject || "(unspecified)"),
      "[TARGET URL] " + (data.url || "(none)"),
      "",
      "[TRANSMISSION]",
      data.message || "",
      "",
      "—",
      "Sent via TORO RANK 2126 // Take control",
    ];
    const subject = "[TORO RANK :: " + (data.subject || "transmission") + "]";
    const body = lines.join("\n");
    return (
      "mailto:deyan@tororank.com" +
      "?subject=" +
      encodeURIComponent(subject) +
      "&body=" +
      encodeURIComponent(body)
    );
  }

  // -------------------------------------------------------------
  // Form submit handler
  // -------------------------------------------------------------
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Validate required fields
    const requiredFields = form.querySelectorAll("[required]");
    let firstInvalid = null;
    requiredFields.forEach((field) => {
      const row = field.closest(".control-form__row");
      if (!field.value.trim()) {
        row?.classList.add("is-invalid");
        if (!firstInvalid) firstInvalid = field;
      } else {
        row?.classList.remove("is-invalid");
      }
    });

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    // Collect form data
    const data = {
      name: form.querySelector("#cf-name").value.trim(),
      email: form.querySelector("#cf-email").value.trim(),
      subject: (form.querySelector('input[name="subject"]:checked') || {}).value || "",
      url: form.querySelector("#cf-url").value.trim(),
      message: form.querySelector("#cf-message").value.trim(),
    };

    // Lock inputs
    form.querySelectorAll("input, textarea, button").forEach((el) => {
      el.disabled = true;
    });
    form.classList.add("is-transmitting");

    // Sequential field ticks
    const rows = form.querySelectorAll(".control-form__row");
    const tickDelay = prefersReducedMotion ? 0 : 140;

    rows.forEach((row, i) => {
      setTimeout(() => addRowTick(row), i * tickDelay);
    });

    // After ticks finish, show success overlay
    const overlayDelay = prefersReducedMotion ? 0 : rows.length * tickDelay + 300;

    setTimeout(() => {
      if (successOverlay) {
        successOverlay.hidden = false;
        successOverlay.classList.add("is-visible");

        // Decode the headline
        if (successHeadline && !prefersReducedMotion) {
          const finalText = successHeadline.dataset.final || successHeadline.textContent;
          decodeText(successHeadline, finalText, 1100);
        }
      }

      // Open mailto in a new tab/window. Browsers may block this if not
      // triggered by a direct user gesture — that's fine, the visitor
      // can still see the success state and copy the email manually.
      const mailto = buildMailto(data);
      // Use a temporary link to be more robust than window.location
      const a = document.createElement("a");
      a.href = mailto;
      a.target = "_blank";
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, overlayDelay);
  });

  // -------------------------------------------------------------
  // Clear .is-invalid on input
  // -------------------------------------------------------------
  form.querySelectorAll("input, textarea").forEach((field) => {
    field.addEventListener("input", () => {
      const row = field.closest(".control-form__row");
      if (row && field.value.trim()) row.classList.remove("is-invalid");
    });
  });
})();
