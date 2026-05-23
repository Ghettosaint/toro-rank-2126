/*
 * TORO RANK 2126 — Hero 3D scene
 *
 * Loaded only on index.html. Renders an atmospheric WebGL scene:
 *   - Loads assets/hero-hands.glb (Draco-compressed GLBs supported)
 *   - Hover float animation on the model
 *   - Mouse drag rotation (OrbitControls)
 *   - Particle field for atmosphere
 *
 * If the GLB fails to load, the scene shows just the particle field.
 * No procedural fallback hands.
 *
 * Tech:
 *   - Three.js + GLTFLoader + DRACOLoader + OrbitControls
 *   - All via ES module import map (no build)
 *   - Respects prefers-reduced-motion
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const canvas = document.getElementById("hero-canvas");
if (canvas) {
  initHero3D();
}

function initHero3D() {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  camera.position.set(0, 0.4, 5.8);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch (err) {
    console.info("WebGL unavailable; hero scene skipped.");
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  // -------------------------------------------------------------
  // OrbitControls — drag to rotate the model
  // -------------------------------------------------------------
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, -0.2, 0);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.rotateSpeed = 0.7;
  controls.autoRotate = false;
  controls.minPolarAngle = Math.PI / 3.2;
  controls.maxPolarAngle = Math.PI - Math.PI / 3.2;
  controls.update();

  // -------------------------------------------------------------
  // Lights
  // -------------------------------------------------------------
  scene.add(new THREE.AmbientLight(0x0a1810, 0.4));

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.55);
  keyLight.position.set(-3, 5, 4);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x4ab8ff, 0.2);
  fillLight.position.set(4, -1, 2);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x00ff66, 0.3);
  rimLight.position.set(0, 1, -5);
  scene.add(rimLight);

  // -------------------------------------------------------------
  // handsContainer — empty until the GLB loads. The animation loop
  // floats whatever is inside, so motion code doesn't care if the
  // model has arrived yet.
  // -------------------------------------------------------------
  const handsContainer = new THREE.Group();
  const HANDS_BASE_Y = -0.3;
  handsContainer.position.y = HANDS_BASE_Y;
  scene.add(handsContainer);

  // -------------------------------------------------------------
  // Particle field — "data dust" for atmosphere
  // -------------------------------------------------------------
  const PARTICLE_COUNT = 600;
  const particleGeom = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 18;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 11;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 2;
  }
  particleGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0x00ff66,
    size: 0.018,
    transparent: true,
    opacity: 0.35,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeom, particleMat);
  scene.add(particles);

  // -------------------------------------------------------------
  // Load hands GLB
  //
  // DRACOLoader is wired up so Draco-compressed GLBs work.
  // Strongly recommend compressing the GLB at gltf.report.
  // -------------------------------------------------------------
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/"
  );

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  loader.load(
    "assets/hero-hands.glb",
    (gltf) => {
      const model = gltf.scene;

      // Center + scale to fit the scene composition
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);

      const targetSize = 3.4;
      model.scale.setScalar(targetSize / size);

      // Flip 180° to face camera
      model.rotation.y = Math.PI;

      // Prepare materials for fade-in + tone down brightness
      model.traverse((node) => {
        if (node.isMesh && node.material) {
          node.material.envMapIntensity = 0.6;
          node.material.transparent = true;
          node.material.opacity = 0;
        }
      });

      handsContainer.add(model);

      // Fade in over 500ms
      const fadeStart = performance.now();
      const fadeMs = 500;
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
      // GLB missing or failed — scene shows particles only. Silent.
    }
  );

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

    // Hover float — the container moves up/down gently
    handsContainer.position.y = HANDS_BASE_Y + Math.sin(t * 0.7) * 0.12;

    // Subtle breath scale on the container
    const breath = 1 + Math.sin(t * 0.6) * 0.012;
    handsContainer.scale.setScalar(breath);

    // Particle drift
    particles.rotation.y = t * 0.018;

    // OrbitControls damping needs an update each frame
    controls.update();

    renderFrame();
    rafId = requestAnimationFrame(animate);
  }

  if (prefersReducedMotion) {
    controls.update();
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

  // -------------------------------------------------------------
  // Pause animation when the tab is hidden (saves battery / CPU)
  // -------------------------------------------------------------
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

  document.body.classList.add("js-3d-ready");
}
