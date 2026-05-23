/*
 * TORO RANK 2126 — /crawl
 *
 * You are an AI crawler navigating a 2026 webpage. Five horizontal
 * lanes = HTML5 semantic layers. Tokens and hazards stream right-to-
 * left past you. Switch lanes (↑/↓) to collect signal, avoid noise.
 *
 * 60 seconds. Vanilla canvas, no dependencies.
 *
 * Mechanics:
 *   - Tokens (green) = signal. Real agent-web vocabulary.
 *   - Hazards (red)  = noise. Things SEOs hate.
 *   - Power-ups (cyan) = special abilities. Boost / Freeze / Magnet.
 *   - Narrative beats fire at intervals — "robots.txt detected",
 *     "schema layer active" etc. Tells a story while you play.
 *   - Pickup spawns a particle burst. Hazard hits flash the screen.
 *   - Chain bonus rewards consecutive token pickups.
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
  const START_LANE = 2;

  const RUN_DURATION_S = 60;

  const TOKEN_LABELS = [
    "@id", "@type", "{schema}", "<jsonld>", "<canonical>", "<itemprop>",
    "<og>", "<h1>", "mcp://", "a2a:", "alt=", "hreflang",
    "<author>", "<article>", "sitemap",
  ];

  const HAZARD_LABELS = [
    "404", "5xx", "noindex", "null", "CORS!", "<script>",
    "infinite", "redirect→", "nofollow", "thin", "dupe", "blank",
  ];

  const POWERUP_TYPES = ["boost", "freeze", "magnet"];
  const POWERUP_LABELS = {
    boost: "+ BOOST",
    freeze: "+ FREEZE",
    magnet: "+ MAGNET",
  };
  const POWERUP_DURATION_MS = 5000;

  // Narrative beats — flash on screen at these elapsed seconds
  const NARRATIVE_BEATS = [
    { time: 4, text: "uplink established" },
    { time: 11, text: "robots.txt detected" },
    { time: 18, text: "schema layer active" },
    { time: 26, text: "crawl budget healthy" },
    { time: 34, text: "agent recommendation rising" },
    { time: 42, text: "structured data integrity :: 87%" },
    { time: 50, text: "final sector — push the signal" },
  ];

  const PLAYER_X = 90;
  const PLAYER_SIZE = 16;
  const ENTITY_W = 64;
  const ENTITY_H = 24;
  const COLLIDE_RADIUS = 24;

  const TOKEN_SCORE = 10;
  const HAZARD_PENALTY = 15;
  const CHAIN_BONUS_THRESHOLD = 3;
  const CHAIN_BONUS = 5;

  const SPAWN_INTERVAL_START_MS = 700;
  const SPAWN_INTERVAL_MIN_MS = 220;
  const SPEED_START = 220;
  const SPEED_MAX = 460;
  const HAZARD_RATIO_START = 0.22;
  const HAZARD_RATIO_MAX = 0.42;

  const POWERUP_SPAWN_INTERVAL_MS = 22000;

  // -----------------------------------------------------------
  // State
  // -----------------------------------------------------------
  let state = "idle";
  let score = 0;
  let chain = 0;
  let timeLeft = RUN_DURATION_S;
  let entities = [];
  let particles = [];
  let currentLane = START_LANE;
  let runStart = 0;
  let lastSpawn = 0;
  let lastPowerupSpawn = 0;
  let lastFrame = 0;
  let lastScore = null;
  let bestScore = parseInt(localStorage.getItem("crawl-best") || "0", 10);

  let activeBeat = null;
  const beatsTriggered = new Set();

  let activePowerup = null;
  let hazardFlashStart = 0;

  let viewW = 0;
  let viewH = 0;
  let laneH = 0;

  // -----------------------------------------------------------
  // Canvas sizing
  // -----------------------------------------------------------
  function resize() {
    const rect = canvas.getBoundingClientRect();
    viewW = rect.width;
    viewH = rect.height;
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    laneH = viewH / LANE_COUNT;
  }
  window.addEventListener("resize", resize);
  resize();

  // -----------------------------------------------------------
  // Input
  // -----------------------------------------------------------
  function handleUp() {
    if (state === "running") currentLane = Math.max(0, currentLane - 1);
  }
  function handleDown() {
    if (state === "running") currentLane = Math.min(LANE_COUNT - 1, currentLane + 1);
  }
  function handleStartOrRestart() {
    if (state === "idle" || state === "ended") startRun();
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
    particles = [];
    currentLane = START_LANE;
    runStart = performance.now();
    lastSpawn = runStart;
    lastPowerupSpawn = runStart;
    activeBeat = null;
    beatsTriggered.clear();
    activePowerup = null;
    hazardFlashStart = 0;
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
  // Difficulty curves
  // -----------------------------------------------------------
  function spawnInterval(elapsedS) {
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

  // -----------------------------------------------------------
  // Spawning
  // -----------------------------------------------------------
  function spawnEntity(elapsedS) {
    // Skip hazards while FREEZE is active
    const freezeActive = activePowerup && activePowerup.type === "freeze";
    const isHazard = !freezeActive && Math.random() < hazardRatio(elapsedS);
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

  function spawnPowerup() {
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    const lane = Math.floor(Math.random() * LANE_COUNT);
    entities.push({
      kind: "powerup",
      powerupType: type,
      lane,
      x: viewW + 30,
      label: POWERUP_LABELS[type],
      collected: false,
    });
  }

  // -----------------------------------------------------------
  // Particles
  // -----------------------------------------------------------
  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 140;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        color,
        life: 600,
        maxLife: 600,
      });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 220 * dt;
      p.life -= dt * 1000;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function drawParticles() {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
  }

  // -----------------------------------------------------------
  // Narrative beats
  // -----------------------------------------------------------
  function maybeSpawnBeat(elapsedS, now) {
    for (let i = 0; i < NARRATIVE_BEATS.length; i++) {
      const beat = NARRATIVE_BEATS[i];
      if (elapsedS >= beat.time && !beatsTriggered.has(beat.time)) {
        beatsTriggered.add(beat.time);
        activeBeat = { text: beat.text, startTime: now };
        return;
      }
    }
  }

  function drawBeat(now) {
    if (!activeBeat) return;
    const elapsed = now - activeBeat.startTime;
    const duration = 2500;
    if (elapsed > duration) {
      activeBeat = null;
      return;
    }
    let alpha;
    if (elapsed < 400) alpha = elapsed / 400;
    else if (elapsed > duration - 600) alpha = (duration - elapsed) / 600;
    else alpha = 1;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#e8ffe8";
    ctx.shadowColor = "#00ff66";
    ctx.shadowBlur = 12;
    ctx.font = 'bold 13px "JetBrains Mono", Consolas, monospace';
    ctx.textAlign = "center";
    ctx.fillText(`>> ${activeBeat.text.toUpperCase()}`, viewW / 2, 56);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // -----------------------------------------------------------
  // Power-ups
  // -----------------------------------------------------------
  function activatePowerup(type, now) {
    activePowerup = { type, until: now + POWERUP_DURATION_MS };
    activeBeat = { text: `${type} engaged`, startTime: now };
  }

  function updatePowerup(now) {
    if (activePowerup && now > activePowerup.until) activePowerup = null;
  }

  function drawPowerupHud() {
    if (!activePowerup) return;
    const remaining = Math.max(0, activePowerup.until - performance.now());
    const remainingS = (remaining / 1000).toFixed(1);
    ctx.font = 'bold 12px "JetBrains Mono", Consolas, monospace';
    ctx.fillStyle = "#6dff8e";
    ctx.shadowColor = "#00ff66";
    ctx.shadowBlur = 8;
    ctx.textAlign = "center";
    ctx.fillText(
      `[ ${activePowerup.type.toUpperCase()} :: ${remainingS}s ]`,
      viewW / 2,
      viewH - 16
    );
    ctx.shadowBlur = 0;
  }

  // -----------------------------------------------------------
  // Hazard hit flash
  // -----------------------------------------------------------
  function drawHazardFlash(now) {
    const elapsed = now - hazardFlashStart;
    const duration = 300;
    if (elapsed > duration) return;
    const alpha = (1 - elapsed / duration) * 0.35;
    ctx.fillStyle = `rgba(255, 48, 85, ${alpha})`;
    ctx.fillRect(0, 0, viewW, viewH);
  }

  // -----------------------------------------------------------
  // Update / collision
  // -----------------------------------------------------------
  function update(dt, elapsedS, now) {
    const speed = entitySpeed(elapsedS);
    const magnetActive = activePowerup && activePowerup.type === "magnet";

    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      e.x -= speed * dt;

      // Magnet pulls tokens toward the player lane
      if (magnetActive && e.kind === "token" && e.lane !== currentLane) {
        if (Math.random() < dt * 1.5) {
          e.lane += e.lane < currentLane ? 1 : -1;
        }
      }
    }

    // Collisions
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (e.collected) continue;
      if (e.lane !== currentLane) continue;
      const dx = Math.abs(e.x - PLAYER_X);
      if (dx < COLLIDE_RADIUS) {
        e.collected = true;
        const y = (e.lane + 0.5) * laneH;

        if (e.kind === "token") {
          const boostMult = activePowerup && activePowerup.type === "boost" ? 2 : 1;
          chain += 1;
          score += TOKEN_SCORE * boostMult;
          if (chain >= CHAIN_BONUS_THRESHOLD) score += CHAIN_BONUS * boostMult;
          spawnParticles(e.x, y, "#00ff66", 8);
        } else if (e.kind === "hazard") {
          score = Math.max(0, score - HAZARD_PENALTY);
          chain = 0;
          spawnParticles(e.x, y, "#ff3055", 12);
          hazardFlashStart = now;
        } else if (e.kind === "powerup") {
          activatePowerup(e.powerupType, now);
          spawnParticles(e.x, y, "#6dff8e", 16);
        }
      }
    }

    entities = entities.filter((e) => e.x > -ENTITY_W && !e.collected);

    updateParticles(dt);
    updatePowerup(now);
    maybeSpawnBeat(elapsedS, now);
  }

  // -----------------------------------------------------------
  // Draw
  // -----------------------------------------------------------
  function drawBackground() {
    ctx.fillStyle = "#010c05";
    ctx.fillRect(0, 0, viewW, viewH);

    ctx.strokeStyle = "#0a2210";
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

      // Highlight current lane subtly
      if (i === currentLane) {
        ctx.fillStyle = "rgba(0, 255, 102, 0.04)";
        ctx.fillRect(0, i * laneH, viewW, laneH);
      }

      ctx.fillStyle = "#2d5a3a";
      ctx.fillText(`<${LANES[i]}>`, 10, y);
    }
  }

  function drawEntity(e) {
    const y = (e.lane + 0.5) * laneH;
    let bgColor, borderColor, textColor, glowColor;
    let shadowBlur = 8;
    let lineWidth = 1.5;

    if (e.kind === "token") {
      bgColor = "rgba(0, 255, 102, 0.15)";
      borderColor = "#00ff66";
      textColor = "#e8ffe8";
      glowColor = "#00ff66";
    } else if (e.kind === "hazard") {
      bgColor = "rgba(255, 48, 85, 0.15)";
      borderColor = "#ff3055";
      textColor = "#ffcad4";
      glowColor = "#ff3055";
    } else {
      bgColor = "rgba(109, 255, 142, 0.25)";
      borderColor = "#6dff8e";
      textColor = "#e8ffe8";
      glowColor = "#6dff8e";
      shadowBlur = 14;
      lineWidth = 2;
    }

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = lineWidth;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = shadowBlur;
    ctx.fillRect(e.x - ENTITY_W / 2, y - ENTITY_H / 2, ENTITY_W, ENTITY_H);
    ctx.strokeRect(e.x - ENTITY_W / 2, y - ENTITY_H / 2, ENTITY_W, ENTITY_H);
    ctx.shadowBlur = 0;

    ctx.fillStyle = textColor;
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
    ctx.fillText("/ crawl", viewW / 2, viewH / 2 - 100);
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#4a8a5e";
    ctx.font = '13px "JetBrains Mono", Consolas, monospace';
    ctx.fillText("Sixty seconds. Collect signal. Avoid noise.", viewW / 2, viewH / 2 - 50);
    ctx.fillText("Catch power-ups in cyan when they appear.", viewW / 2, viewH / 2 - 30);

    ctx.fillStyle = "#00ff66";
    ctx.fillText("↑ ↓   shift layers", viewW / 2, viewH / 2 + 10);
    ctx.fillText("SPACE   initiate", viewW / 2, viewH / 2 + 32);

    if (bestScore > 0) {
      ctx.fillStyle = "#2d5a3a";
      ctx.font = '12px "JetBrains Mono", Consolas, monospace';
      ctx.fillText(`strongest signal :: ${bestScore}`, viewW / 2, viewH / 2 + 88);
    }
  }

  function drawEndScreen() {
    drawBackground();
    drawLanes();

    ctx.fillStyle = "rgba(1, 12, 5, 0.88)";
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

      if (now - lastSpawn > spawnInterval(elapsedS)) {
        spawnEntity(elapsedS);
        lastSpawn = now;
      }

      if (now - lastPowerupSpawn > POWERUP_SPAWN_INTERVAL_MS) {
        spawnPowerup();
        lastPowerupSpawn = now;
      }

      update(dt, elapsedS, now);

      drawBackground();
      drawLanes();
      for (let i = 0; i < entities.length; i++) drawEntity(entities[i]);
      drawPlayer();
      drawParticles();
      drawBeat(now);
      drawHud();
      drawPowerupHud();
      drawHazardFlash(now);

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
