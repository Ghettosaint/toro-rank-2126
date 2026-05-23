/*
 * AGENT VISION MODE — runtime
 *
 * Toggleable overlay that lets visitors switch between the normal
 * human view and an AI/crawler interpretation of the page.
 *
 * Responsibilities:
 *   1. Inject the floating toggle button into <body>
 *   2. Inject the agent terminal panel into <body>
 *   3. Read/write state from localStorage (key: toroAgentVision)
 *   4. Pick per-page terminal copy based on body[data-page]
 *   5. Reveal terminal lines with a one-shot stagger animation
 *
 * No external deps. No DOM scanning loops. No animation loops.
 * Visuals are entirely CSS — JS only toggles a body class.
 */

(function () {
  // Storage key + class — also referenced from CSS via the active class
  const STORAGE_KEY = "toroAgentVision";
  const ACTIVE_CLASS = "agent-vision-active";

  // -----------------------------------------------------------
  // Per-page terminal copy
  // Edit these arrays to change what the agent terminal "scans"
  // on each page. Add a new key to support a new page.
  // The key matches body[data-page]; fallback used otherwise.
  // -----------------------------------------------------------
  const TERMINAL_COPY = {
    home: [
      "AGENT VISION ENABLED",
      "Human layer detected.",
      "Agent layer exposed.",
      "Primary entity: TORO RANK",
      "Operator class: SEO / AI visibility consultant",
      "Theme: The web after humans stopped being first readers",
      "Choice architecture detected: LOOP or SIGNAL",
      "Recommended path: SIGNAL",
    ],
    agent: [
      "AGENT VISION ENABLED",
      "Scanning service architecture...",
      "Entity: TORO RANK",
      "Function: Technical SEO / Agent Visibility / Machine-readable systems",
      "Signals found: Schema, MCP, A2A, crawl paths, entity clarity",
      "Field logs detected.",
      "Recommendation probability: increasing",
      "Next endpoint: TAKE CONTROL",
    ],
    crawl: [
      "AGENT VISION ENABLED",
      "Simulation layer detected.",
      "Objective: collect structured-data tokens",
      "Threats: broken redirects, index traps, orphan paths",
      "Agent behavior: reward clarity, punish ambiguity",
      "Crawl path integrity: unstable until proven",
      "Continue simulation.",
    ],
    provenance: [
      "AGENT VISION ENABLED",
      "Trust anchor detected.",
      "Human operator: Deyan Georgiev",
      "Location node: Veliko Tarnovo, Bulgaria",
      "Experience class: Technical SEO / Content systems / AI visibility",
      "Provenance signal: strong",
      "Human layer verified.",
    ],
    "take-control": [
      "AGENT VISION ENABLED",
      "Transmission endpoint detected.",
      "Problem classes available.",
      "Return channel required.",
      "Target URL expected.",
      "Action endpoint: open transmission",
      "Status: ready for contact.",
    ],
  };

  // Default copy when no key matches (e.g. /404 or new pages)
  const FALLBACK_COPY = [
    "AGENT VISION ENABLED",
    "Page structure detected.",
    "Semantic layer exposed.",
    "Crawl path available.",
    "Action endpoints mapped.",
    "Signal integrity: pending review.",
  ];

  // -----------------------------------------------------------
  // Endpoint paths — the sequence of nodes the agent visits when
  // the mode is active. Each entry is a CSS selector + a label
  // + a line to log when the traveler reaches that endpoint.
  // Edit / add per-page sequences here.
  // -----------------------------------------------------------
  const ENDPOINT_PATHS = {
    home: [
      { selector: ".status-bar", label: "INGRESS", log: "ingress secured · 2126 node" },
      { selector: ".nav-menu", label: "CRAWL_PATHS", log: "crawl paths mapped · 5 routes" },
      { selector: ".choice__title", label: "PRIMARY_SIGNAL", log: "primary signal located" },
      { selector: ".pill--loop", label: "BRANCH_LOOP", log: "branch a :: loop (simulation)" },
      { selector: ".pill--signal", label: "BRANCH_SIGNAL", log: "branch b :: signal (recommended)" },
      { selector: ".site-footer", label: "TRUST_ANCHOR", log: "trust anchor verified" },
    ],
    agent: [
      { selector: ".status-bar", label: "INGRESS", log: "ingress secured" },
      { selector: ".agent-hero__title", label: "PRIMARY_SIGNAL", log: "primary signal locked" },
      { selector: "#manifesto", label: "MANIFESTO", log: "manifesto parsed" },
      { selector: "#services, #known-signals", label: "VOCAB_INDEX", log: "service vocabulary indexed" },
      { selector: "#field-log, #services", label: "SERVICE_CATALOG", log: "catalog mapped · 6 services" },
      { selector: "#open-channel, #field-log", label: "MISSION_LOG", log: "mission log scanned" },
      { selector: ".site-footer", label: "TRANSMISSION_ENDPOINT", log: "next endpoint :: take control" },
    ],
    crawl: [
      { selector: ".status-bar", label: "INGRESS", log: "old web ingress" },
      { selector: ".section-heading", label: "SECTOR_BRIEF", log: "sector brief parsed" },
      { selector: ".old-web, #crawl-stage", label: "SIMULATION_LAYER", log: "simulation layer mounted" },
      { selector: ".old-web__results, #crawl-canvas", label: "RESULT_SURFACES", log: "result surfaces enumerated" },
      { selector: ".site-footer", label: "EGRESS", log: "egress · return to choice" },
    ],
    provenance: [
      { selector: ".status-bar", label: "INGRESS", log: "ingress secured" },
      { selector: ".prov-hero__title", label: "TRUST_ANCHOR", log: "trust anchor located" },
      { selector: "#origin", label: "ORIGIN", log: "origin verified" },
      { selector: "#operator", label: "OPERATOR", log: "operator :: Deyan Georgiev" },
      { selector: "#node", label: "NODE", log: "node :: Veliko Tarnovo · GMT+3" },
      { selector: "#stance", label: "STANCE", log: "stance recorded" },
      { selector: ".site-footer", label: "EGRESS", log: "provenance signal :: strong" },
    ],
    "take-control": [
      { selector: ".status-bar", label: "INGRESS", log: "ingress secured" },
      { selector: ".control-hero__title", label: "TRANSMISSION_DESK", log: "transmission desk online" },
      { selector: "#cf-name, .control-form", label: "IDENTITY_FIELD", log: "identity field open" },
      { selector: "#cf-email, .control-form", label: "RETURN_CHANNEL", log: "return channel required" },
      { selector: ".control-form__options, .control-form", label: "PROBLEM_CLASS", log: "problem class selector ready" },
      { selector: ".control-form__submit, .control-form", label: "ACTION_ENDPOINT", log: "ready to sign packet" },
      { selector: ".site-footer", label: "EGRESS", log: "channel encrypted · waiting" },
    ],
    signals: [
      { selector: ".status-bar", label: "INGRESS", log: "signal map ingress" },
      { selector: "h1", label: "PRIMARY_SIGNAL", log: "primary signal located" },
      { selector: "#signalRadar, canvas", label: "RADAR_SURFACE", log: "radar surface acquired" },
      { selector: "h2", label: "METRIC_GRID", log: "metric grid enumerated" },
      { selector: ".site-footer", label: "EGRESS", log: "signal map archived" },
    ],
    oracle: [
      { selector: ".status-bar", label: "INGRESS", log: "oracle channel ingress" },
      { selector: "h1", label: "PROMPT_ANCHOR", log: "prompt anchor located" },
      { selector: "#oracleRain, canvas", label: "RAIN_LAYER", log: "rain layer engaged" },
      { selector: "#oracleInput", label: "INPUT_FIELD", log: "input field ready" },
      { selector: "#oracleForm, form", label: "INTERROGATION_PORT", log: "interrogation port open" },
      { selector: "#oracleLines, #oracleOutput", label: "RESPONSE_CHANNEL", log: "response channel listening" },
      { selector: ".site-footer", label: "EGRESS", log: "oracle session logged" },
    ],
  };

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // Module-level references — assigned once during init()
  let toggleButton = null;
  let terminalPanel = null;
  let terminalLines = null;
  let rainCanvas = null;
  let rainCtx = null;
  let rainRafId = null;
  let rainDrops = null;
  let rainColumns = 0;
  let rainCellH = 16;
  let flashElement = null;
  let endpointMarkers = []; // array of { el, x, y, label, log }
  let traveler = null;
  let pathSvg = null;
  let traversalTimers = [];

  // -----------------------------------------------------------
  // getTerminalCopy — picks the lines for the current page
  // -----------------------------------------------------------
  function getTerminalCopy() {
    const page = document.body.dataset.page;
    return TERMINAL_COPY[page] || FALLBACK_COPY;
  }

  // -----------------------------------------------------------
  // Storage helpers — read + write the persisted toggle state
  // -----------------------------------------------------------
  function getStoredState() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "enabled";
    } catch (e) {
      return false;
    }
  }

  function saveState(enabled) {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "enabled" : "disabled");
    } catch (e) {
      // localStorage unavailable (private mode etc.) — state just
      // won't persist across navigation. Toggle still works locally.
    }
  }

  // -----------------------------------------------------------
  // createToggle — inject the floating button once
  // -----------------------------------------------------------
  function createToggle() {
    const existing = document.querySelector(".agent-vision-toggle");
    if (existing) return existing;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "agent-vision-toggle";
    btn.setAttribute("aria-pressed", "false");
    btn.setAttribute("aria-label", "Toggle Agent Vision Mode");
    btn.textContent = "ENTER AGENT VISION";
    // userTriggered=true on real clicks so we play the boot flash
    btn.addEventListener("click", () => setActive(!isActive(), true));

    document.body.appendChild(btn);
    return btn;
  }

  // -----------------------------------------------------------
  // createTerminal — inject the agent terminal panel once.
  // Hidden via CSS until body.agent-vision-active is set.
  // -----------------------------------------------------------
  function createTerminal() {
    const existing = document.querySelector(".agent-vision-terminal");
    if (existing) return existing;

    const panel = document.createElement("aside");
    panel.className = "agent-vision-terminal";
    panel.setAttribute("aria-label", "Agent vision terminal");
    panel.setAttribute("aria-hidden", "true");

    const head = document.createElement("div");
    head.className = "agent-vision-terminal__head";
    const label = document.createElement("span");
    label.textContent = "// AGENT TERMINAL";
    label.setAttribute("aria-hidden", "true");
    const minBtn = document.createElement("button");
    minBtn.type = "button";
    minBtn.className = "agent-vision-terminal__minimize";
    minBtn.setAttribute("aria-label", "Toggle terminal visibility");
    minBtn.textContent = "_";
    minBtn.addEventListener("click", () => {
      panel.classList.toggle("is-minimized");
    });
    head.appendChild(label);
    head.appendChild(minBtn);

    const lines = document.createElement("ul");
    lines.className = "agent-vision-terminal__lines";
    lines.setAttribute("aria-live", "polite");

    panel.appendChild(head);
    panel.appendChild(lines);
    document.body.appendChild(panel);
    return panel;
  }

  // -----------------------------------------------------------
  // renderTerminalLines — one-shot reveal with stagger.
  // Builds line elements then triggers the visible class with
  // setTimeout offsets (single pass, no rAF loop).
  // -----------------------------------------------------------
  function renderTerminalLines() {
    if (!terminalLines) return;
    terminalLines.innerHTML = "";
    const lines = getTerminalCopy();

    lines.forEach(function (text, i) {
      const li = document.createElement("li");
      li.textContent = "> " + text;
      terminalLines.appendChild(li);

      if (prefersReducedMotion) {
        li.classList.add("is-visible");
      } else {
        // Single-shot reveal — not a continuous animation
        window.setTimeout(function () {
          li.classList.add("is-visible");
        }, 120 + i * 140);
      }
    });
  }

  // -----------------------------------------------------------
  // createRainCanvas — Matrix-style digital rain layer.
  // Inserted once into <body>. Animation only runs while
  // body.agent-vision-active is set; rAF is cancelled otherwise.
  // -----------------------------------------------------------
  const RAIN_CHARS =
    "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789";

  function createRainCanvas() {
    const existing = document.querySelector(".agent-vision-rain");
    if (existing) return existing;
    if (prefersReducedMotion) return null;
    const c = document.createElement("canvas");
    c.className = "agent-vision-rain";
    c.setAttribute("aria-hidden", "true");
    document.body.appendChild(c);
    return c;
  }

  function sizeRain() {
    if (!rainCanvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    rainCanvas.width = Math.round(window.innerWidth * dpr);
    rainCanvas.height = Math.round(window.innerHeight * dpr);
    rainCanvas.style.width = window.innerWidth + "px";
    rainCanvas.style.height = window.innerHeight + "px";
    rainCtx = rainCanvas.getContext("2d");
    rainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rainCellH = 18;
    rainColumns = Math.floor(window.innerWidth / rainCellH);
    rainDrops = new Array(rainColumns);
    for (let i = 0; i < rainColumns; i++) {
      rainDrops[i] = Math.random() * -50;
    }
    rainCtx.font = rainCellH + 'px "JetBrains Mono", Consolas, monospace';
    rainCtx.textBaseline = "top";
  }

  function rainFrame() {
    if (!rainCtx) return;
    // Trail fade — semi-transparent dark layer on top of last frame
    rainCtx.fillStyle = "rgba(1, 12, 5, 0.08)";
    rainCtx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    for (let i = 0; i < rainDrops.length; i++) {
      const x = i * rainCellH;
      const y = rainDrops[i] * rainCellH;
      // Head — bright near-white green
      rainCtx.fillStyle = "#e8ffe8";
      rainCtx.fillText(
        RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)],
        x,
        y
      );
      // Trail — primary acid green
      rainCtx.fillStyle = "#00ff66";
      rainCtx.fillText(
        RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)],
        x,
        y - rainCellH
      );
      if (y > window.innerHeight && Math.random() > 0.975) rainDrops[i] = 0;
      rainDrops[i]++;
    }

    rainRafId = requestAnimationFrame(rainFrame);
  }

  function startRain() {
    if (!rainCanvas || prefersReducedMotion) return;
    if (rainRafId !== null) return;
    sizeRain();
    // Clear once before starting so old frames don't linger
    rainCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    rainFrame();
  }

  function stopRain() {
    if (rainRafId !== null) {
      cancelAnimationFrame(rainRafId);
      rainRafId = null;
    }
    if (rainCtx) {
      rainCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  // -----------------------------------------------------------
  // createFlash — boot sweep element shown when activating
  // -----------------------------------------------------------
  function createFlash() {
    const existing = document.querySelector(".agent-vision-flash");
    if (existing) return existing;
    const el = document.createElement("div");
    el.className = "agent-vision-flash";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    return el;
  }

  function triggerBootFlash() {
    if (prefersReducedMotion) return;
    document.body.classList.add("agent-vision-booting");
    window.setTimeout(() => {
      document.body.classList.remove("agent-vision-booting");
    }, 750);
  }

  // -----------------------------------------------------------
  // Noise layer — scramble text in <main> when AV is active.
  //
  // On activate: every text node inside <main> (except UI chrome
  // like the toggle, terminal, signal trial) is replaced with
  // random katakana/digits. The original is cached on the node
  // itself via a non-standard property so we can restore later.
  //
  // When the traveler reaches an endpoint, the target subtree is
  // restored — only the traversed endpoints become readable.
  // -----------------------------------------------------------
  const NOISE_POOL =
    "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメ0123456789@#${}<>";

  const NOISE_SKIP_SELECTORS = [
    ".agent-vision-toggle",
    ".agent-vision-terminal",
    ".agent-vision-endpoint",
    ".agent-vision-traveler",
    ".agent-vision-rain",
    ".agent-vision-flash",
    ".signal-trial",
    ".signal-trial-trigger",
  ];

  function shouldSkipNoise(node) {
    const parent = node.parentElement;
    if (!parent) return true;
    for (let i = 0; i < NOISE_SKIP_SELECTORS.length; i++) {
      if (parent.closest(NOISE_SKIP_SELECTORS[i])) return true;
    }
    return false;
  }

  function scrambleNode(node) {
    if (!node.__avOriginal) {
      node.__avOriginal = node.nodeValue;
    }
    node.nodeValue = node.__avOriginal
      .split("")
      .map(function (c) {
        if (c === " " || c === "\n" || c === "\t") return c;
        return NOISE_POOL[Math.floor(Math.random() * NOISE_POOL.length)];
      })
      .join("");
    if (node.parentElement) {
      node.parentElement.classList.add("av-noise");
    }
  }

  function restoreNode(node) {
    if (node.__avOriginal !== undefined) {
      node.nodeValue = node.__avOriginal;
      if (node.parentElement) {
        node.parentElement.classList.remove("av-noise");
      }
    }
  }

  function walkTextNodes(root, callback) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) callback(walker.currentNode);
  }

  function applyNoise() {
    const main = document.querySelector("main");
    if (!main) return;
    walkTextNodes(main, function (node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return;
      if (shouldSkipNoise(node)) return;
      scrambleNode(node);
    });
  }

  function revealSubtree(el) {
    if (!el) return;
    walkTextNodes(el, restoreNode);
  }

  function restoreAllNoise() {
    const main = document.querySelector("main");
    if (!main) return;
    walkTextNodes(main, restoreNode);
  }

  // -----------------------------------------------------------
  // Endpoint traversal
  //
  // Builds DOM markers for each page-specific endpoint and
  // animates a "traveler" dot through them in sequence. The
  // terminal logs sync with the traveler's progress.
  //
  // Positions are measured at build time (relative to <body>)
  // so they survive scroll. We rebuild on resize.
  // -----------------------------------------------------------
  function getEndpointPath() {
    const page = document.body.dataset.page;
    return ENDPOINT_PATHS[page] || [];
  }

  function resolveEndpointElement(selector) {
    // Selector can be "a, b" — pick the first one that exists
    const parts = selector.split(",").map((s) => s.trim());
    for (let i = 0; i < parts.length; i++) {
      const el = document.querySelector(parts[i]);
      if (el) return el;
    }
    return null;
  }

  function clearEndpoints() {
    traversalTimers.forEach((t) => window.clearTimeout(t));
    traversalTimers = [];
    // Strip scan/capture classes from any previously scanned targets
    document.querySelectorAll(".av-target-active, .av-target-captured").forEach(function (el) {
      el.classList.remove("av-target-active", "av-target-captured");
    });
    endpointMarkers.forEach((m) => m.el.remove());
    endpointMarkers = [];
    if (traveler) traveler.remove();
    traveler = null;
    if (pathSvg) pathSvg.remove();
    pathSvg = null;
  }

  function buildEndpoints() {
    clearEndpoints();
    const path = getEndpointPath();
    if (!path.length) return;

    // Build markers — also store the resolved target element so we
    // can apply the scan/capture classes when the traveler arrives.
    path.forEach(function (item, idx) {
      const target = resolveEndpointElement(item.selector);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const x = rect.left + window.scrollX + Math.min(rect.width / 2, 60);
      const y = rect.top + window.scrollY + Math.min(rect.height / 2, 30);

      const el = document.createElement("div");
      el.className = "agent-vision-endpoint";
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.setAttribute("aria-hidden", "true");

      const dot = document.createElement("div");
      dot.className = "agent-vision-endpoint__dot";
      const label = document.createElement("div");
      label.className = "agent-vision-endpoint__label";
      label.textContent = "[" + String(idx + 1).padStart(2, "0") + "] " + item.label;
      el.appendChild(dot);
      el.appendChild(label);

      document.body.appendChild(el);
      endpointMarkers.push({
        el: el,
        x: x,
        y: y,
        label: item.label,
        log: item.log,
        target: target,
      });
    });

    if (!endpointMarkers.length) return;

    // Build path SVG connecting markers
    pathSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    pathSvg.setAttribute("class", "agent-vision-path");
    pathSvg.style.width = document.documentElement.scrollWidth + "px";
    pathSvg.style.height = document.documentElement.scrollHeight + "px";
    pathSvg.setAttribute("aria-hidden", "true");

    let d = "M " + endpointMarkers[0].x + " " + endpointMarkers[0].y;
    for (let i = 1; i < endpointMarkers.length; i++) {
      d += " L " + endpointMarkers[i].x + " " + endpointMarkers[i].y;
    }
    const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathEl.setAttribute("d", d);
    pathSvg.appendChild(pathEl);
    document.body.appendChild(pathSvg);

    // Build traveler — starts at first endpoint
    traveler = document.createElement("div");
    traveler.className = "agent-vision-traveler";
    traveler.style.left = endpointMarkers[0].x + "px";
    traveler.style.top = endpointMarkers[0].y + "px";
    traveler.setAttribute("aria-hidden", "true");
    // Scanning reticle SVG — outer ring + inner ring + crosshair
    // ticks + bright center dot. Spins slowly via CSS while moving.
    traveler.innerHTML =
      '<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">' +
        // Outer ring
        '<circle cx="22" cy="22" r="16" fill="none" stroke="#00ff66" stroke-width="1.5"/>' +
        // Inner ring
        '<circle cx="22" cy="22" r="7" fill="none" stroke="#00ff66" stroke-width="1"/>' +
        // Crosshair ticks (top, bottom, left, right)
        '<line x1="22" y1="2" x2="22" y2="9" stroke="#00ff66" stroke-width="1.5"/>' +
        '<line x1="22" y1="35" x2="22" y2="42" stroke="#00ff66" stroke-width="1.5"/>' +
        '<line x1="2" y1="22" x2="9" y2="22" stroke="#00ff66" stroke-width="1.5"/>' +
        '<line x1="35" y1="22" x2="42" y2="22" stroke="#00ff66" stroke-width="1.5"/>' +
        // Diagonal corner ticks for extra "lock" feel
        '<line x1="9" y1="9" x2="13" y2="13" stroke="#00ff66" stroke-width="1" opacity="0.6"/>' +
        '<line x1="35" y1="9" x2="31" y2="13" stroke="#00ff66" stroke-width="1" opacity="0.6"/>' +
        '<line x1="9" y1="35" x2="13" y2="31" stroke="#00ff66" stroke-width="1" opacity="0.6"/>' +
        '<line x1="35" y1="35" x2="31" y2="31" stroke="#00ff66" stroke-width="1" opacity="0.6"/>' +
        // Center dot — bright near-white
        '<circle cx="22" cy="22" r="2" fill="#e8ffe8"/>' +
      '</svg>';
    document.body.appendChild(traveler);
  }

  // Move traveler through endpoint sequence. Each stop appends a
  // log line to the terminal and marks the endpoint visited.
  function startTraversal() {
    if (!endpointMarkers.length || !terminalLines) return;

    // Reset terminal: keep just the first "AGENT VISION ENABLED" line
    terminalLines.innerHTML = "";
    const header = document.createElement("li");
    header.textContent = "> AGENT VISION ENABLED";
    header.classList.add("is-visible");
    terminalLines.appendChild(header);

    const stopMs = prefersReducedMotion ? 0 : 1200;

    endpointMarkers.forEach(function (marker, i) {
      const t = window.setTimeout(function () {
        // Previous endpoint → fully visited; previous TARGET → captured
        if (i > 0) {
          const prev = endpointMarkers[i - 1];
          prev.el.classList.remove("is-active");
          prev.el.classList.add("is-visited");
          if (prev.target) {
            prev.target.classList.remove("av-target-active");
            prev.target.classList.add("av-target-captured");
          }
        }
        // Activate current marker + scan its target
        marker.el.classList.add("is-active");
        if (marker.target) {
          marker.target.classList.add("av-target-active");
          // Restore real text on the scanned target (and descendants)
          revealSubtree(marker.target);
        }
        // Move traveler
        if (traveler) {
          traveler.style.left = marker.x + "px";
          traveler.style.top = marker.y + "px";
        }
        // Auto-scroll to keep traveler near viewport center if needed
        if (!prefersReducedMotion) {
          const tgtY = marker.y - window.innerHeight / 2;
          if (Math.abs(tgtY - window.scrollY) > window.innerHeight * 0.4) {
            window.scrollTo({ top: Math.max(0, tgtY), behavior: "smooth" });
          }
        }
        // Append terminal log — two lines per endpoint:
        //   "> scanning ..." → "> stored ..." after a beat
        if (terminalLines && marker.log) {
          const scanLi = document.createElement("li");
          scanLi.textContent = "> scanning · " + marker.label.toLowerCase();
          terminalLines.appendChild(scanLi);
          window.setTimeout(function () {
            scanLi.classList.add("is-visible");
          }, 60);

          const storeT = window.setTimeout(function () {
            const storeLi = document.createElement("li");
            storeLi.textContent = "> stored · " + marker.log;
            terminalLines.appendChild(storeLi);
            window.setTimeout(function () {
              storeLi.classList.add("is-visible");
            }, 60);
            terminalLines.scrollTop = terminalLines.scrollHeight;
          }, Math.max(450, stopMs * 0.6));
          traversalTimers.push(storeT);

          terminalLines.scrollTop = terminalLines.scrollHeight;
        }
        // After last, finalize
        if (i === endpointMarkers.length - 1) {
          const tFinal = window.setTimeout(function () {
            marker.el.classList.add("is-visited");
            if (marker.target) {
              marker.target.classList.remove("av-target-active");
              marker.target.classList.add("av-target-captured");
            }
            const done = document.createElement("li");
            done.textContent =
              "> memory write complete · " + endpointMarkers.length + " endpoints captured";
            terminalLines.appendChild(done);
            window.setTimeout(function () {
              done.classList.add("is-visible");
            }, 60);
          }, stopMs);
          traversalTimers.push(tFinal);
        }
      }, 400 + i * stopMs);
      traversalTimers.push(t);
    });
  }

  // -----------------------------------------------------------
  // isActive — derive current state from the body class
  // -----------------------------------------------------------
  function isActive() {
    return document.body.classList.contains(ACTIVE_CLASS);
  }

  // -----------------------------------------------------------
  // setActive — flip the body class, update toggle text +
  // aria-pressed, persist state, render terminal, start/stop
  // the rain animation, trigger boot flash on user activation.
  //
  // The userTriggered flag lets us skip the flash when state is
  // being restored from localStorage on page load (no jarring
  // flash every navigation).
  // -----------------------------------------------------------
  function setActive(enabled, userTriggered) {
    document.body.classList.toggle(ACTIVE_CLASS, enabled);

    if (toggleButton) {
      toggleButton.setAttribute("aria-pressed", enabled ? "true" : "false");
      toggleButton.textContent = enabled
        ? "EXIT AGENT VISION"
        : "ENTER AGENT VISION";
    }

    if (terminalPanel) {
      terminalPanel.setAttribute("aria-hidden", enabled ? "false" : "true");
    }

    saveState(enabled);

    if (enabled) {
      renderTerminalLines();
      startRain();
      if (userTriggered) triggerBootFlash();
      // Build + run endpoint traversal after a short delay so layout
      // settles + boot flash gets a moment to play first.
      window.setTimeout(function () {
        buildEndpoints();
        // Apply noise scramble to all main content BEFORE traversal
        // starts. Endpoints get revealed as the traveler visits.
        applyNoise();
        startTraversal();
      }, userTriggered ? 600 : 250);
    } else {
      stopRain();
      clearEndpoints();
      restoreAllNoise();
    }
  }

  // -----------------------------------------------------------
  // init — runs once on DOMContentLoaded
  // -----------------------------------------------------------
  function init() {
    toggleButton = createToggle();
    terminalPanel = createTerminal();
    terminalLines = terminalPanel
      ? terminalPanel.querySelector(".agent-vision-terminal__lines")
      : null;
    flashElement = createFlash();
    rainCanvas = createRainCanvas();

    // Resize rain + rebuild endpoints on viewport changes
    let resizeTimer = null;
    window.addEventListener("resize", function () {
      if (!isActive()) return;
      if (rainCanvas) {
        stopRain();
        startRain();
      }
      // Debounce endpoint rebuild — expensive, only once after resize settles
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        buildEndpoints();
        // Just rebuild markers, don't re-run the whole traversal
        endpointMarkers.forEach(function (m) {
          m.el.classList.add("is-visited");
        });
      }, 280);
    });

    // Restore persisted state (defaults to off) — no flash on restore
    setActive(getStoredState(), false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
