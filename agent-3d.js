/*
 * TORO RANK 2126 — Agent page 3D scene
 *
 * Loaded only on agent.html. Renders a bull head model (half-robot
 * half-bull, on-brand to TORO RANK) that tracks the mouse position
 * and watches the user move across the page.
 *
 * Drop assets/bull-head.glb in place to swap the placeholder for
 * the real model. Without the GLB, the scene shows a minimal
 * geometric placeholder so the layout still works.
 *
 * Tech:
 *   - Three.js + GLTFLoader + DRACOLoader via ES module import map
 *   - Mouse follow via smooth lerp (no raycasting needed)
 *   - Respects prefers-reduced-motion (model stays static)
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

// =============================================================
// BULL HEAD INITIAL ORIENTATION
//
// Tweak these three values in radians if the head loads facing
// the wrong way. Most common useful values:
//
//   0          = no rotation on that axis
//   Math.PI    = 180° flip
//   Math.PI/2  = 90° turn (clockwise looking down +axis)
//   -Math.PI/2 = 90° turn the other way
//
// Y = yaw (turn left/right), X = pitch (tilt up/down), Z = roll.
// =============================================================
const BULL_HEAD_ROT_X = -Math.PI / 2;
const BULL_HEAD_ROT_Y = 0;
const BULL_HEAD_ROT_Z = 0;

const canvas = document.getElementById("agent-canvas");
if (canvas) {
  initAgentScene();
}

function initAgentScene() {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // -------------------------------------------------------------
  // Scene + Camera + Renderer
  // -------------------------------------------------------------
  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(
    35,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 5.5);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch (err) {
    console.info("WebGL unavailable; agent scene skipped.");
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // -------------------------------------------------------------
  // Lights — cinematic, lean into green rim
  // -------------------------------------------------------------
  scene.add(new THREE.AmbientLight(0x0a1810, 0.3));

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.6);
  keyLight.position.set(-2, 4, 3);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x00ff66, 0.7);
  rimLight.position.set(3, 0, -4);
  scene.add(rimLight);

  const fillLight = new THREE.DirectionalLight(0x4ab8ff, 0.15);
  fillLight.position.set(2, -2, 3);
  scene.add(fillLight);

  // -------------------------------------------------------------
  // headContainer — wraps the loaded model so we can lerp its
  // rotation independently of any animations applied to the model.
  // -------------------------------------------------------------
  const headContainer = new THREE.Group();
  scene.add(headContainer);

  // -------------------------------------------------------------
  // Particle field — fewer particles than the landing for cleaner feel
  // -------------------------------------------------------------
  const PARTICLE_COUNT = 350;
  const particleGeom = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 14;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 9;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
  }
  particleGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0x00ff66,
    size: 0.014,
    transparent: true,
    opacity: 0.3,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeom, particleMat);
  scene.add(particles);

  // -------------------------------------------------------------
  // Load bull head GLB
  // -------------------------------------------------------------
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/"
  );

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  loader.load(
    "assets/bull-head.glb",
    (gltf) => {
      const model = gltf.scene;

      // Center + scale
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);

      const targetSize = 3.4;
      model.scale.setScalar(targetSize / size);

      // Apply initial orientation (tweak constants at top of file if wrong)
      model.rotation.set(BULL_HEAD_ROT_X, BULL_HEAD_ROT_Y, BULL_HEAD_ROT_Z);

      // Prepare materials for fade-in
      model.traverse((node) => {
        if (node.isMesh && node.material) {
          node.material.envMapIntensity = 0.7;
          node.material.transparent = true;
          node.material.opacity = 0;
        }
      });

      headContainer.add(model);

      // Fade in
      const fadeStart = performance.now();
      const fadeMs = 600;
      function fadeIn() {
        const t = Math.min(1, (performance.now() - fadeStart) / fadeMs);
        model.traverse((node) => {
          if (node.isMesh && node.material) node.material.opacity = t;
        });
        if (t < 1) requestAnimationFrame(fadeIn);
      }
      fadeIn();
    },
    undefined,
    () => {
      // GLB missing — show nothing, particles carry the scene.
    }
  );

  // -------------------------------------------------------------
  // Mouse follow
  //
  // Mouse position is normalized to [-1, 1] across the viewport;
  // the head rotates toward that point with smooth lerp damping.
  // -------------------------------------------------------------
  let targetRotY = 0;
  let targetRotX = 0;
  let currentRotY = 0;
  let currentRotX = 0;
  let mouseActive = false;
  let lastMouseMove = 0;

  const MAX_ROT_Y = 0.55; // ±0.55 rad horizontal (about ±31°)
  const MAX_ROT_X = 0.32; // ±0.32 rad vertical (about ±18°)
  const LERP_FACTOR = 0.05;

  if (!prefersReducedMotion) {
    window.addEventListener("mousemove", (e) => {
      // Normalize to [-1, 1] across viewport
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetRotY = nx * MAX_ROT_Y;
      targetRotX = -ny * MAX_ROT_X; // invert Y so looking up = up
      mouseActive = true;
      lastMouseMove = performance.now();
    });
  }

  // -------------------------------------------------------------
  // Animation loop
  // -------------------------------------------------------------
  const clock = new THREE.Clock();
  let rafId = null;

  function renderFrame() {
    renderer.render(scene, camera);
  }

  function animate() {
    const t = clock.getElapsedTime();
    const now = performance.now();

    // If the mouse hasn't moved for 2.5s, drift back to a slow idle sway
    if (mouseActive && now - lastMouseMove > 2500) {
      mouseActive = false;
    }

    if (!mouseActive) {
      // Idle behavior — slow horizontal sway
      targetRotY = Math.sin(t * 0.3) * 0.25;
      targetRotX = Math.sin(t * 0.4) * 0.08;
    }

    // Smooth lerp toward target
    currentRotY += (targetRotY - currentRotY) * LERP_FACTOR;
    currentRotX += (targetRotX - currentRotX) * LERP_FACTOR;

    headContainer.rotation.y = currentRotY;
    headContainer.rotation.x = currentRotX;

    // Particle drift
    particles.rotation.y = t * 0.015;

    renderFrame();
    rafId = requestAnimationFrame(animate);
  }

  if (prefersReducedMotion) {
    renderFrame();
  } else {
    animate();
  }

  // -------------------------------------------------------------
  // Resize
  // -------------------------------------------------------------
  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const ratio = renderer.getPixelRatio();
    if (canvas.width !== w * ratio || canvas.height !== h * ratio) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
  }
  window.addEventListener("resize", resize);
  resize();

  // Pause animation when tab is hidden
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    } else if (!prefersReducedMotion && rafId === null) {
      animate();
    }
  });
}
