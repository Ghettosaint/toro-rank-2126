/*
 * TORO RANK 2126 — /crawl
 *
 * The game. You are an AI crawler navigating a 2026 webpage.
 * Five horizontal lanes = HTML5 semantic layers (head, nav, main,
 * aside, footer). Tokens and hazards stream right-to-left past you.
 * Switch lanes (↑/↓) to collect signal and avoid noise.
 *
 * 60 seconds. Vanilla canvas, no dependencies.
 *
 * Brand depth:
 *   - Lane names are real HTML5 semantic elements
 *   - Token labels are real agent-web vocabulary (Schema, MCP, A2A)
 *   - Hazard labels are real things SEOs hate (404, noindex, CORS, etc.)
 *
 * Loads only on crawl.html (canvas with id="crawl-canvas").
 */

(function () {
  const canvas = document.getElementById("crawl-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;

  // -----------------------------------------------------------
  // Constants
  // -----------------------------------------------------------
  const LANES = ["head", "nav", "main", "aside", "footer"];
  const LANE_COUNT = LANES.length;
  const START_LANE = 2; // "main"

  const RUN_DURATION_S = 60;

  // Token vocabulary — real agent-web / Schema.org / MCP-A2A signals
  const TOKEN_LABELS = [
    "@id",
    "@type",
    "{schema}",
    "<jsonld>",
    "<canonical>",
    "<itemprop>",
    "<og>",
    "<h1>",
    "mcp://",
    "a2a:",
    "alt=",
    "hreflang",
    "<author>",
    "<article>",
    "sitemap",
  ];

  // Hazard vocabulary — things SEOs hate
  const HAZARD_LABELS = [
    "404",
    "5xx",
    "noindex",
    "null",
    "CORS!",
    "<script>",
    "infinite",
    "redirect→",
    "nofollow",
    "thin",
    "dupe",
    "blank",
  ];

  // Visual constants
  const PLAYER_X = 90;
  const PLAYER_SIZE = 16;
  const ENTITY_W = 64;
  const ENTITY_H = 24;
  const COLLIDE_RADIUS = 24;

  // Scoring
  const TOKEN_SCORE = 10;
  const HAZARD_PENALTY = 15;
  const CHAIN_BONUS_THRESHOLD = 3;
  const CHAIN_BONUS = 5;

  // Difficulty curve
  const SPAWN_INTERVAL_START_MS = 700;
  const SPAWN_INTERVAL_MIN_MS = 220;
  const SPEED_START = 220; // px/sec
  const SPEED_MAX = 460;
  const HAZARD_RATIO_START = 0.22;
  const HAZARD_RATIO_MAX = 0.42;

  // -----------------------------------------------------------
  // State
  // -----------------------------------------------------------
  let state = "idle"; // 'idle' | 'running' | 'ended'
  let score = 0;
  let chain = 0;
  let timeLeft = RUN_DURATION_S;
  let entities = [];
  let currentLane = START_LANE;
  let runStart = 0;
  let lastSpawn = 0;
  let lastFrame = 0;
  let lastScore = null;
  let bestScore = parseInt(localStorage.getItem("crawl-best") || "0", 10);

  // Layout (recomputed on resize)
  let viewW = 0;
  let viewH = 0;
  let laneH = 0;

  // -----------------------------------------------------------
  // Canvas sizing — DPR-aware
  // -----------------------------------------------------------
  function resize() {
    const rect = canvas.getBoundingClientRect();
    viewW = rect.width;
    viewH = rect.height;
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // reset + scale
    laneH = viewH / LANE_COUNT;
  }
  window.addEventListener("resize", resize);
  resize();

  // -----------------------------------------------------------
  // Input
  // -----------------------------------------------------------
  function handleUp() {
    if (state === "running") {
      currentLane = Math.max(0, currentLane - 1);
    }
  }
  function handleDown() {
    if (state === "running") {
      currentLane = Math.min(LANE_COUNT - 1, currentLane + 1);
    }
  }
  function handleStartOrRestart() {
    if (state === "idle" || state === "ended") {
      startRun();
    }
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      handleUp();
    } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
      e.preventDefault();
      handleDown();
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleStartOrRestart();
    }
  });

  // Touch — tap upper/lower half during run; tap anywhere to start/restart
  canvas.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      if (state !== "running") {
        handleStartOrRestart();
        return;
      }
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const y = touch.clientY - rect.top;
      if (y < rect.height / 2) handleUp();
      else handleDown();
    },
    { passive: false }
  );

  // Mouse click — also starts/restarts
  canvas.addEventListener("click", () => {
    if (state !== "running") handleStartOrRestart();
  });

  // -----------------------------------------------------------
  // Game flow
  // -----------------------------------------------------------
  function startRun() {
    state = "running";
    score = 0;
    chain = 0;
    timeLeft = RUN_DURATION_S;
    entities = [];
    currentLane = START_LANE;
    runStart = performance.now();
    lastSpawn = runStart;
  }

  function endRun() {
    state = "ended";
    lastScore = score;
    if (score > bestScore) {
      bestScore = score;
      try {
        localStorage.setItem("crawl-best", String(bestScore));
      } catch {}
    }
  }

  // -----------------------------------------------------------
  // Spawning + difficulty curve
  // -----------------------------------------------------------
  function spawnInterval(elapsedS) {
    // Linear interpolation between start and min over the run duration
    const t = Math.min(1, elapsedS / RUN_DURATION_S);
    return SPAWN_INTERVAL_START_MS - (SPAWN_INTERVAL_START_MS - SPAWN_INTERVAL_MIN_MS) * t;
  }

  function entitySpeed(elapsedS) {
    const t = Math.min(1, elapsedS / RUN_DURATION_S);
    return SPEED_START + (SPEED_MAX - SPEED_START) * t;
  }

  function hazardRatio(elapsedS) {
    const t = Math.min(1, elapsedS / RUN_DURATION_S);
    return HAZARD_RATIO_START + (HAZARD_RATIO_MAX - HAZARD_RATIO_START) * t;
  }

  function spawnEntity(elapsedS) {
    const isHazard = Math.random() < hazardRatio(elapsedS);
    const labels = isHazard ? HAZARD_LABELS : TOKEN_LABELS;
    const lane = Math.floor(Math.random() * LANE_COUNT);
    entities.push({
      kind: isHazard ? "hazard" : "token",
      lane,
      x: viewW + 30,
      label: labels[Math.floor(Math.random() * labels.length)],
      collected: false,
    });
  }

  // -----------------------------------------------------------
  // Update / collision
  // -----------------------------------------------------------
  function update(dt, elapsedS) {
    const speed = entitySpeed(elapsedS);

    // Move entities
    for (let i = 0; i < entities.length; i++) {
      entities[i].x -= speed * dt;
    }

    // Collisions — player is at fixed PLAYER_X in currentLane
    const playerCenterY = (currentLane + 0.5) * laneH;
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (e.collected) continue;
      if (e.lane !== currentLane) continue;
      const dx = Math.abs(e.x - PLAYER_X);
      if (dx < COLLIDE_RADIUS) {
        e.collected = true;
        if (e.kind === "token") {
          chain += 1;
          score += TOKEN_SCORE;
          if (chain >= CHAIN_BONUS_THRESHOLD) score += CHAIN_BONUS;
        } else {
          score = Math.max(0, score - HAZARD_PENALTY);
          chain = 0;
        }
      }
    }

    // Cull offscreen / collected
    entities = entities.filter((e) => e.x > -ENTITY_W && !e.collected);
  }

  // -----------------------------------------------------------
  // Draw — lanes + entities + player + HUD
  // -----------------------------------------------------------
  function drawBackground() {
    ctx.fillStyle = "#021a0c";
    ctx.fillRect(0, 0, viewW, viewH);

    // Subtle vertical scroll grid (gives a sense of motion)
    ctx.strokeStyle = "#0d2014";
    ctx.lineWidth = 1;
    const gridSpacing = 40;
    const offset = (performance.now() / 30) % gridSpacing;
    for (let x = -offset; x < viewW; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, viewH);
      ctx.stroke();
    }
  }

  function drawLanes() {
    ctx.strokeStyle = "#1a3a22";
    ctx.lineWidth = 1;
    ctx.font = '10px "JetBrains Mono", Consolas, monospace';
    ctx.fillStyle = "#2d5a3a";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    for (let i = 0; i < LANE_COUNT; i++) {
      const y = (i + 0.5) * laneH;

      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(0, i * laneH);
        ctx.lineTo(viewW, i * laneH);
        ctx.stroke();
      }

      ctx.fillText(`<${LANES[i]}>`, 10, y);
    }
  }

  function drawEntity(e) {
    const y = (e.lane + 0.5) * laneH;
    const isToken = e.kind === "token";

    // Block
    ctx.fillStyle = isToken ? "rgba(0, 255, 102, 0.15)" : "rgba(255, 48, 85, 0.15)";
    ctx.strokeStyle = isToken ? "#00ff66" : "#ff3055";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = isToken ? "#00ff66" : "#ff3055";
    ctx.shadowBlur = isToken ? 8 : 6;
    ctx.fillRect(e.x - ENTITY_W / 2, y - ENTITY_H / 2, ENTITY_W, ENTITY_H);
    ctx.strokeRect(e.x - ENTITY_W / 2, y - ENTITY_H / 2, ENTITY_W, ENTITY_H);
    ctx.shadowBlur = 0;

    // Label
    ctx.fillStyle = isToken ? "#e8ffe8" : "#ffcad4";
    ctx.font = 'bold 11px "JetBrains Mono", Consolas, monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(e.label, e.x, y);
  }

  function drawPlayer() {
    const y = (currentLane + 0.5) * laneH;
    ctx.fillStyle = "#e8ffe8";
    ctx.shadowColor = "#00ff66";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(PLAYER_X - PLAYER_SIZE, y - PLAYER_SIZE);
    ctx.lineTo(PLAYER_X + PLAYER_SIZE, y);
    ctx.lineTo(PLAYER_X - PLAYER_SIZE, y + PLAYER_SIZE);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Small trailing tick to make it look like it's moving
    ctx.fillStyle = "rgba(0, 255, 102, 0.4)";
    ctx.fillRect(PLAYER_X - PLAYER_SIZE - 12, y - 1, 8, 2);
  }

  function drawHud() {
    ctx.font = 'bold 13px "JetBrains Mono", Consolas, monospace';
    ctx.fillStyle = "#00ff66";
    ctx.textBaseline = "top";

    ctx.textAlign = "left";
    ctx.fillText(`TIME ${timeLeft.toFixed(1)}s`, 14, 12);

    ctx.textAlign = "right";
    ctx.fillText(`SIGNAL ${score}`, viewW - 14, 12);

    if (chain >= CHAIN_BONUS_THRESHOLD) {
      ctx.textAlign = "center";
      ctx.fillStyle = "#e8ffe8";
      ctx.fillText(`x${chain} chain`, viewW / 2, 12);
    }
  }

  function drawIdleScreen() {
    drawBackground();

    ctx.textAlign = "center";
    ctx.fillStyle = "#e8ffe8";
    ctx.font = 'bold 32px "JetBrains Mono", Consolas, monospace';
    ctx.shadowColor = "#00ff66";
    ctx.shadowBlur = 12;
    ctx.fillText("/ crawl", viewW / 2, viewH / 2 - 80);
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#4a8a5e";
    ctx.font = '13px "JetBrains Mono", Consolas, monospace';
    ctx.fillText("Sixty seconds. Collect signal. Avoid noise.", viewW / 2, viewH / 2 - 30);

    ctx.fillStyle = "#00ff66";
    ctx.fillText("↑ ↓   shift layers", viewW / 2, viewH / 2 + 10);
    ctx.fillText("SPACE   initiate", viewW / 2, viewH / 2 + 32);

    if (bestScore > 0) {
      ctx.fillStyle = "#2d5a3a";
      ctx.font = '12px "JetBrains Mono", Consolas, monospace';
      ctx.fillText(`strongest signal :: ${bestScore}`, viewW / 2, viewH / 2 + 80);
    }
  }

  function drawEndScreen() {
    // Draw current frame underneath, then dim overlay
    drawBackground();
    drawLanes();

    ctx.fillStyle = "rgba(2, 26, 12, 0.85)";
    ctx.fillRect(0, 0, viewW, viewH);

    ctx.textAlign = "center";
    ctx.fillStyle = "#4a8a5e";
    ctx.font = 'bold 13px "JetBrains Mono", Consolas, monospace';
    ctx.fillText("channel closed.", viewW / 2, viewH / 2 - 70);

    ctx.fillStyle = "#e8ffe8";
    ctx.shadowColor = "#00ff66";
    ctx.shadowBlur = 14;
    ctx.font = 'bold 48px "JetBrains Mono", Consolas, monospace';
    ctx.fillText(String(lastScore ?? 0), viewW / 2, viewH / 2 - 20);
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#4a8a5e";
    ctx.font = '12px "JetBrains Mono", Consolas, monospace';
    ctx.fillText("signal collected", viewW / 2, viewH / 2 + 10);

    if (lastScore === bestScore && lastScore > 0) {
      ctx.fillStyle = "#00ff66";
      ctx.font = 'bold 12px "JetBrains Mono", Consolas, monospace';
      ctx.fillText("// new strongest signal", viewW / 2, viewH / 2 + 40);
    } else if (bestScore > 0) {
      ctx.fillStyle = "#2d5a3a";
      ctx.font = '12px "JetBrains Mono", Consolas, monospace';
      ctx.fillText(`best :: ${bestScore}`, viewW / 2, viewH / 2 + 40);
    }

    ctx.fillStyle = "#00ff66";
    ctx.font = '13px "JetBrains Mono", Consolas, monospace';
    ctx.fillText("SPACE   re-run", viewW / 2, viewH / 2 + 90);
  }

  // -----------------------------------------------------------
  // Main loop
  // -----------------------------------------------------------
  function loop(now) {
    if (!lastFrame) lastFrame = now;
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;

    if (state === "running") {
      const elapsedS = (now - runStart) / 1000;
      timeLeft = Math.max(0, RUN_DURATION_S - elapsedS);

      // Spawn
      if (now - lastSpawn > spawnInterval(elapsedS)) {
        spawnEntity(elapsedS);
        lastSpawn = now;
      }

      update(dt, elapsedS);

      drawBackground();
      drawLanes();
      for (let i = 0; i < entities.length; i++) drawEntity(entities[i]);
      drawPlayer();
      drawHud();

      if (timeLeft <= 0) endRun();
    } else if (state === "ended") {
      drawEndScreen();
    } else {
      drawIdleScreen();
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
