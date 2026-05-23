/*
 * TORO RANK 2126 — Agent Handshake
 *
 * The contact page behaves like a future protocol negotiation while
 * still using a simple mailto: transport. The visitor classifies the
 * distortion, binds an operator, watches a live packet assemble, then
 * signs it.
 */

(function () {
  const form = document.getElementById("controlForm");
  if (!form) return;

  const successOverlay = document.getElementById("controlSuccess");
  const successHeadline = successOverlay?.querySelector(".control-success__headline");
  const successClose = document.getElementById("controlSuccessClose");
  const scanButton = document.getElementById("scanButton");
  const scanLines = document.getElementById("scanLines");
  const packetFields = {
    node: document.querySelector('[data-packet-field="node"]'),
    target: document.querySelector('[data-packet-field="target"]'),
    failure: document.querySelector('[data-packet-field="failure"]'),
    urgency: document.querySelector('[data-packet-field="urgency"]'),
    request: document.querySelector('[data-packet-field="request"]'),
  };

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const ANOMALIES = {
    "agent-invisibility": {
      label: "agent cannot explain us",
      urgency: "rising",
      request: "make this surface readable to machines",
    },
    "entity-mismatch": {
      label: "entity mismatch",
      urgency: "unstable",
      request: "reconcile brand, schema, and search memory",
    },
    "crawler-loop": {
      label: "crawler loop",
      urgency: "recursive",
      request: "break the loop and expose the canonical path",
    },
    "index-collapse": {
      label: "index collapse",
      urgency: "critical",
      request: "restore crawl signal and index continuity",
    },
    "latency-decay": {
      label: "latency decay",
      urgency: "degrading",
      request: "reduce render cost before agents abandon the page",
    },
    "provenance-gap": {
      label: "provenance gap",
      urgency: "untrusted",
      request: "attach source, authorship, and entity proof",
    },
  };

  const SCRAMBLE_POOL = "アイウエオカキクケコ0123456789@#${}<>";

  function field(selector) {
    return form.querySelector(selector);
  }

  function selectedAnomaly() {
    const input = field('input[name="subject"]:checked');
    return ANOMALIES[input?.value] || ANOMALIES["agent-invisibility"];
  }

  function normalizeTarget(value) {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return trimmed.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }

  function setPacketText(key, value) {
    const target = packetFields[key];
    if (!target) return;
    target.textContent = value;
    target.classList.remove("is-updating");
    void target.offsetWidth;
    target.classList.add("is-updating");
  }

  function updatePacket() {
    const anomaly = selectedAnomaly();
    const name = field("#cf-name")?.value.trim();
    const url = field("#cf-url")?.value.trim();

    setPacketText("node", name ? `${name.toLowerCase().replace(/\s+/g, ".")}.signed` : "operator.pending");
    setPacketText("target", url ? normalizeTarget(url) : "surface.unbound");
    setPacketText("failure", anomaly.label);
    setPacketText("urgency", anomaly.urgency);
    setPacketText("request", anomaly.request);
  }

  function decodeText(element, finalText, durationMs = 900) {
    if (!element) return;
    if (prefersReducedMotion) {
      element.textContent = finalText;
      return;
    }

    const chars = Array.from(finalText);
    const start = performance.now();

    function frame() {
      const t = Math.min(1, (performance.now() - start) / durationMs);
      const locked = Math.floor(t * chars.length);
      element.textContent = chars
        .map((target, i) => {
          if (i < locked) return target;
          if (target === " " || target === "\n") return target;
          return SCRAMBLE_POOL[Math.floor(Math.random() * SCRAMBLE_POOL.length)];
        })
        .join("");

      if (t < 1) requestAnimationFrame(frame);
      else element.textContent = finalText;
    }

    frame();
  }

  function setScanState(lines, mode) {
    if (!scanLines) return;
    scanLines.dataset.state = mode;
    scanLines.innerHTML = "";
    lines.forEach((line) => {
      const span = document.createElement("span");
      span.textContent = line;
      scanLines.appendChild(span);
    });
  }

  function runScan() {
    const target = normalizeTarget(field("#cf-url")?.value || "");
    const anomaly = selectedAnomaly();

    if (!target) {
      const row = field("#cf-url")?.closest(".control-form__row");
      row?.classList.add("is-invalid");
      field("#cf-url")?.focus();
      return;
    }

    scanButton.disabled = true;
    scanButton.textContent = "scanning";
    setScanState(
      [
        `parsing ${target}`,
        "checking schema dialect",
        "estimating recommendation probability",
      ],
      "running"
    );

    const finish = () => {
      setScanState(
        [
          `surface bound :: ${target}`,
          `primary distortion :: ${anomaly.label}`,
          "recommendation probability :: intervention advised",
        ],
        "complete"
      );
      scanButton.disabled = false;
      scanButton.textContent = "rescan";
      updatePacket();
    };

    window.setTimeout(finish, prefersReducedMotion ? 0 : 950);
  }

  function buildMailto(data) {
    const anomaly = ANOMALIES[data.subject] || ANOMALIES["agent-invisibility"];
    const target = normalizeTarget(data.url) || "(none)";
    const node = data.name || "(unknown operator)";

    const lines = [
      "[TORO RANK 2126 :: AGENT HANDSHAKE]",
      "",
      "NODE: " + node,
      "RETURN_CHANNEL: " + data.email,
      "TARGET_SURFACE: " + target,
      "FAILURE_CLASS: " + anomaly.label,
      "URGENCY: " + anomaly.urgency,
      "REQUEST: " + anomaly.request,
      "",
      "[HUMAN RESIDUE]",
      data.message || "",
      "",
      "-- packet signed from /take-control",
    ];

    return (
      "mailto:deyan@tororank.com" +
      "?subject=" +
      encodeURIComponent(`[TORO RANK :: ${anomaly.label}]`) +
      "&body=" +
      encodeURIComponent(lines.join("\n"))
    );
  }

  function validate() {
    const requiredFields = form.querySelectorAll("[required]");
    let firstInvalid = null;

    requiredFields.forEach((input) => {
      const row = input.closest(".control-form__row");
      const invalid = !input.value.trim() || (input.type === "email" && !input.checkValidity());
      row?.classList.toggle("is-invalid", invalid);
      if (invalid && !firstInvalid) firstInvalid = input;
    });

    if (firstInvalid) {
      firstInvalid.focus();
      return false;
    }

    return true;
  }

  function addRowTick(row) {
    if (row.querySelector(".control-form__tick")) return;
    const tick = document.createElement("span");
    tick.className = "control-form__tick";
    tick.textContent = " OK";
    tick.setAttribute("aria-hidden", "true");
    row.querySelector(".control-form__label")?.appendChild(tick);
  }

  form.addEventListener("input", (event) => {
    const row = event.target.closest?.(".control-form__row");
    row?.classList.remove("is-invalid");
    updatePacket();
  });

  form.addEventListener("change", updatePacket);
  scanButton?.addEventListener("click", runScan);

  function closeSuccessOverlay() {
    if (!successOverlay) return;
    successOverlay.classList.remove("is-visible");
    window.setTimeout(() => {
      successOverlay.hidden = true;
    }, prefersReducedMotion ? 0 : 500);
  }

  successClose?.addEventListener("click", closeSuccessOverlay);
  successOverlay?.addEventListener("click", (event) => {
    if (event.target === successOverlay) closeSuccessOverlay();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && successOverlay?.classList.contains("is-visible")) {
      closeSuccessOverlay();
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validate()) return;

    const data = {
      name: field("#cf-name").value.trim(),
      email: field("#cf-email").value.trim(),
      subject: field('input[name="subject"]:checked')?.value || "agent-invisibility",
      url: field("#cf-url").value.trim(),
      message: field("#cf-message").value.trim(),
    };

    form.querySelectorAll("input, textarea, button").forEach((el) => {
      el.disabled = true;
    });
    form.classList.add("is-transmitting");
    form.querySelector(".control-form__submit-label").textContent = "Opening relay";

    const rows = form.querySelectorAll(".control-form__row");
    const tickDelay = prefersReducedMotion ? 0 : 120;
    rows.forEach((row, index) => {
      window.setTimeout(() => addRowTick(row), index * tickDelay);
    });

    window.setTimeout(() => {
      if (successOverlay) {
        successOverlay.hidden = false;
        successOverlay.classList.add("is-visible");
      }
      decodeText(successHeadline, successHeadline?.dataset.final || "CHANNEL ESTABLISHED.", 1000);

      const a = document.createElement("a");
      a.href = buildMailto(data);
      a.target = "_blank";
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, prefersReducedMotion ? 0 : rows.length * tickDelay + 300);
  });

  updatePacket();
})();
