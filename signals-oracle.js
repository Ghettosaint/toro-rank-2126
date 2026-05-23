/*
 * TORO RANK 2126 — Signals + Oracle interactions.
 */

(function () {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initRadar() {
    const canvas = document.getElementById("signalRadar");
    if (!canvas) return;

    const host = canvas.closest(".signal-radar");
    const ctx = canvas.getContext("2d");
    const tooltip = document.createElement("div");
    tooltip.className = "signal-radar__tooltip";
    tooltip.setAttribute("role", "status");
    tooltip.setAttribute("aria-live", "polite");
    if (host) host.appendChild(tooltip);

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;
    let raf = null;
    let pointer = { x: 0, y: 0, active: false };
    let hovered = null;
    let locked = null;

    const signals = [
      { a: -1.2, d: 0.26, label: "ENTITY", score: 92, detail: "Brand identity resolves without guessing." },
      { a: -0.84, d: 0.54, label: "SCHEMA", score: 86, detail: "Structured data describes actual business logic." },
      { a: -0.46, d: 0.72, label: "HREFLANG", score: 79, detail: "Locale graph survives translation drift." },
      { a: -0.08, d: 0.44, label: "CANONICAL", score: 83, detail: "Duplicate surfaces collapse into one answer." },
      { a: 0.28, d: 0.82, label: "CRAWL", score: 78, detail: "Crawler paths stay readable under pressure." },
      { a: 0.62, d: 0.36, label: "MCP", score: 74, detail: "Machine endpoint can answer instead of being scraped." },
      { a: 0.94, d: 0.68, label: "SPEED", score: 81, detail: "Render cost stays below agent patience limits." },
      { a: 1.28, d: 0.51, label: "PROOF", score: 88, detail: "Claims connect to defendable source memory." },
      { a: 1.65, d: 0.76, label: "AUTHOR", score: 84, detail: "Human operator signal is visible and stable." },
      { a: 1.98, d: 0.31, label: "FEEDS", score: 69, detail: "Structured feeds create alternate machine paths." },
      { a: 2.32, d: 0.58, label: "LINKS", score: 77, detail: "Internal graph tells agents what matters most." },
      { a: 2.68, d: 0.84, label: "LOGS", score: 72, detail: "Server traces reveal where attention leaks." },
      { a: 3.02, d: 0.45, label: "TOPICS", score: 89, detail: "Semantic clusters reinforce recommendation context." },
      { a: 3.38, d: 0.7, label: "REDIRECT", score: 82, detail: "Migration memory survives path changes." },
      { a: 3.76, d: 0.38, label: "A2A", score: 71, detail: "Agent-to-agent handoff vocabulary is present." },
      { a: 4.08, d: 0.62, label: "MEDIA", score: 67, detail: "Visual assets carry readable semantic context." },
      { a: 4.48, d: 0.8, label: "TRUST", score: 91, detail: "Reputation anchors reduce answer risk." },
      { a: 4.88, d: 0.49, label: "INTENT", score: 85, detail: "Page purpose is explicit enough to route." },
    ];

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function nodePosition(node, t) {
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.42;
      const drift = Math.sin(t * 0.55 + node.score) * 0.018;
      const dist = Math.min(0.96, node.d + drift) * r;
      return {
        x: cx + Math.cos(node.a) * dist,
        y: cy + Math.sin(node.a) * dist,
      };
    }

    function showTooltip(node, pos) {
      if (!tooltip || !host) return;
      tooltip.innerHTML =
        "<strong>" + node.label + "</strong>" +
        "<span>signal strength :: " + node.score + "%</span>" +
        "<p>" + node.detail + "</p>";
      const pad = 18;
      const tx = Math.max(pad + 115, Math.min(w - pad - 115, pos.x));
      const ty = Math.max(88, Math.min(h - 16, pos.y));
      tooltip.style.left = tx + "px";
      tooltip.style.top = ty + "px";
      tooltip.classList.add("is-visible");
    }

    function hideTooltip() {
      if (!locked && tooltip) tooltip.classList.remove("is-visible");
    }

    function findHit(t) {
      if (!pointer.active && !locked) return null;
      let best = null;
      let bestDist = Infinity;
      signals.forEach((node) => {
        const pos = nodePosition(node, t);
        const dx = pointer.x - pos.x;
        const dy = pointer.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 18 && dist < bestDist) {
          best = { node, pos };
          bestDist = dist;
        }
      });
      return best;
    }

    function draw(now) {
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.42;
      const t = now * 0.001;
      const hit = locked || findHit(t);
      hovered = hit;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(1, 12, 5, 0.78)";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(0, 255, 102, 0.22)";
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (r / 4) * i, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        ctx.stroke();
      }

      if (pointer.active) {
        ctx.strokeStyle = "rgba(232, 255, 232, 0.22)";
        ctx.beginPath();
        ctx.moveTo(pointer.x, 0);
        ctx.lineTo(pointer.x, h);
        ctx.moveTo(0, pointer.y);
        ctx.lineTo(w, pointer.y);
        ctx.stroke();
      }

      const sweep = t * 1.4;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      gradient.addColorStop(0, "rgba(0, 255, 102, 0.42)");
      gradient.addColorStop(1, "rgba(0, 255, 102, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, sweep, sweep + 0.55);
      ctx.closePath();
      ctx.fill();

      signals.forEach((node, index) => {
        const pos = nodePosition(node, t);
        const x = pos.x;
        const y = pos.y;
        const pulse = 0.5 + Math.sin(t * 2 + index) * 0.5;
        const isHot = hit && hit.node === node;
        ctx.strokeStyle = isHot ? "rgba(232, 255, 232, 0.78)" : "rgba(0, 255, 102, 0.16)";
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = `rgba(${isHot ? "232, 255, 232" : "0, 255, 102"}, ${0.42 + pulse * 0.45})`;
        ctx.shadowColor = "#00ff66";
        ctx.shadowBlur = isHot ? 24 : 12;
        const size = isHot ? 11 : 6;
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
        ctx.shadowBlur = 0;
        if (index % 2 === 0 || isHot) {
          ctx.fillStyle = isHot ? "rgba(232, 255, 232, 0.94)" : "rgba(232, 255, 232, 0.62)";
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.fillText(node.label.toLowerCase(), x + 8, y - 8);
        }
      });

      if (hit) showTooltip(hit.node, hit.pos);
      else hideTooltip();

      if (!prefersReducedMotion) raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointermove", (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    });
    canvas.addEventListener("pointerleave", () => {
      pointer.active = false;
      if (!locked) {
        hovered = null;
        hideTooltip();
      }
    });
    canvas.addEventListener("click", () => {
      locked = hovered && (!locked || locked.node !== hovered.node) ? hovered : null;
      if (!locked) hideTooltip();
    });
    draw(0);
  }

  function initOracle() {
    const form = document.getElementById("oracleForm");
    const input = document.getElementById("oracleInput");
    const lines = document.getElementById("oracleLines");
    if (!form || !input || !lines) return;

    const verdicts = [
      ["ENTITY", "ambiguous but recoverable"],
      ["SCHEMA", "partial dialect detected"],
      ["CRAWL", "surface readable, intent fragmented"],
      ["PROVENANCE", "weak proof chain"],
      ["RECOMMENDATION", "withheld until entity lock"],
    ];

    function writeLine(text, delay) {
      window.setTimeout(() => {
        const p = document.createElement("p");
        p.textContent = text;
        lines.appendChild(p);
        p.scrollIntoView({ block: "nearest" });
      }, delay);
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const target = input.value.trim() || "unknown surface";
      lines.innerHTML = "";
      writeLine(`> target accepted :: ${target}`, 0);
      writeLine("> opening local inference chamber...", 220);
      writeLine("> reading visible claims...", 460);
      writeLine("> comparing claims against machine proof...", 700);
      verdicts.forEach(([key, value], index) => {
        writeLine(`> ${key} :: ${value}`, 980 + index * 180);
      });
      writeLine("> prescription :: bind entity, expose proof, reduce render cost.", 1980);
      writeLine("> next action :: open transmission desk.", 2240);
    });
  }

  function initOracleRain() {
    const canvas = document.getElementById("oracleRain");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const chars = "アイウエオカキクケコ0123456789<>/{}";
    const dpr = window.devicePixelRatio || 1;
    const fontSize = 16;
    let w = 0;
    let h = 0;
    let drops = [];
    let raf = null;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const columns = Math.max(1, Math.floor(w / fontSize));
      drops = new Array(columns).fill(0).map(() => Math.random() * -40);
      ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
      ctx.textBaseline = "top";
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const phase = (performance.now() % 8000) / 8000;
      const rainActive = (phase > 0.34 && phase < 0.46) || (phase > 0.78 && phase < 0.9);
      if (!rainActive) {
        if (!prefersReducedMotion) raf = requestAnimationFrame(draw);
        return;
      }

      ctx.fillStyle = "rgba(1, 12, 5, 0.08)";
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < drops.length; i++) {
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillStyle = "#e8ffe8";
        ctx.fillText(char, x, y);
        ctx.fillStyle = "#00ff66";
        ctx.fillText(char, x, y - fontSize);
        if (y > h && Math.random() > 0.972) drops[i] = 0;
        drops[i]++;
      }

      if (!prefersReducedMotion) raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    draw();
  }

  initRadar();
  initOracle();
  initOracleRain();
})();
