/*
 * TORO RANK 2126 — Signals + Oracle interactions.
 */

(function () {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initRadar() {
    const canvas = document.getElementById("signalRadar");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    let w = 0;
    let h = 0;
    let raf = null;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(now) {
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.42;
      const t = now * 0.001;

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

      const nodes = [
        [0.1, 0.25, "entity"],
        [0.72, 0.2, "schema"],
        [0.82, 0.68, "speed"],
        [0.3, 0.78, "proof"],
        [0.5, 0.48, "mcp"],
      ];
      nodes.forEach(([nx, ny, label], index) => {
        const x = nx * w;
        const y = ny * h;
        const pulse = 0.5 + Math.sin(t * 2 + index) * 0.5;
        ctx.fillStyle = `rgba(0, 255, 102, ${0.45 + pulse * 0.45})`;
        ctx.shadowColor = "#00ff66";
        ctx.shadowBlur = 12;
        ctx.fillRect(x - 3, y - 3, 6, 6);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(232, 255, 232, 0.78)";
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(label, x + 8, y - 8);
      });

      if (!prefersReducedMotion) raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
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
