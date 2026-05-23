/*
 * TORO RANK 2126 — Hero 3D scene
 *
 * Loaded only on index.html. Renders an atmospheric WebGL scene:
 *   - Procedural low-poly hands (fallback if no GLB present)
 *   - GLB model auto-loads from assets/hero-hands.glb and replaces
 *     the procedural fallback
 *   - Mouse drag rotates the model (OrbitControls)
 *   - Gentle auto-rotation when idle, hover float animation
 *   - Particle field for atmosphere
 *
 * Pills are intentionally NOT rendered here — they'll come back
 * once the hands composition is dialled in.
 *
 * Tech:
 *   - Three.js + OrbitControls via ES module import map (no build)
 *   - Respects prefers-reduced-motion
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
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
  // OrbitControls — user can drag to rotate the model
  // -------------------------------------------------------------
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, -0.2, 0);
  controls.enableZoom = false;       // don't let users zoom in/out
  controls.enablePan = false;        // no panning
  controls.enableDamping = true;     // smooth release
  controls.dampingFactor = 0.07;
  controls.rotateSpeed = 0.7;
  controls.autoRotate = false;       // hands only hover; user drags to rotate
  controls.autoRotateSpeed = 0.35;
  // Lock the vertical angle so users can't flip the model upside down
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
  // handsContainer — wraps whatever hand representation is active
  // (procedural fallback OR loaded GLB). The animation loop floats
  // the container, so motion code doesn't care which is inside.
  // -------------------------------------------------------------
  const handsContainer = new THREE.Group();
  const HANDS_BASE_Y = -0.3;
  handsContainer.position.y = HANDS_BASE_Y;
  scene.add(handsContainer);

  // -------------------------------------------------------------
  // Procedural hand factory (fallback if no GLB)
  // -------------------------------------------------------------
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a2515,
    emissive: 0x002a14,
    emissiveIntensity: 0.35,
    roughness: 0.6,
    metalness: 0.35,
    flatShading: true,
  });

  const jointMaterial = new THREE.MeshStandardMaterial({
    color: 0x0d3a20,
    emissive: 0x00ff66,
    emissiveIntensity: 0.55,
    roughness: 0.4,
    metalness: 0.5,
    flatShading: true,
  });

  const wristMaterial = new THREE.MeshStandardMaterial({
    color: 0x051208,
    emissive: 0x001a08,
    emissiveIntensity: 0.2,
    roughness: 0.7,
    metalness: 0.4,
    flatShading: true,
    transparent: true,
    opacity: 0.65,
  });

  function makeFingerSegment(radius, length) {
    return new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 8), skinMaterial);
  }

  function makeJoint(radius) {
    return new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 6), jointMaterial);
  }

  function makeFinger({ proximalLen, distalLen, radius, curl = 0.5 }) {
    const finger = new THREE.Group();

    const prox = makeFingerSegment(radius, proximalLen);
    prox.position.y = proximalLen / 2;
    finger.add(prox);

    const midJoint = makeJoint(radius * 1.05);
    midJoint.position.y = proximalLen;
    finger.add(midJoint);

    const distalGroup = new THREE.Group();
    distalGroup.position.y = proximalLen;
    distalGroup.rotation.x = curl;

    const distal = makeFingerSegment(radius * 0.88, distalLen);
    distal.position.y = distalLen / 2;
    distalGroup.add(distal);

    const tip = makeJoint(radius * 0.8);
    tip.position.y = distalLen;
    distalGroup.add(tip);

    finger.add(distalGroup);
    return finger;
  }

  function makeHand() {
    const hand = new THREE.Group();

    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.95, 0.22), skinMaterial);
    hand.add(palm);

    const fingerTopY = 0.475;
    const fingers = [
      { xOff: 0.3,  proximalLen: 0.32, distalLen: 0.22, radius: 0.075, curl: 0.55 },
      { xOff: 0.1,  proximalLen: 0.36, distalLen: 0.26, radius: 0.075, curl: 0.55 },
      { xOff: -0.1, proximalLen: 0.32, distalLen: 0.24, radius: 0.075, curl: 0.55 },
      { xOff: -0.3, proximalLen: 0.26, distalLen: 0.20, radius: 0.07,  curl: 0.55 },
    ];

    fingers.forEach((f) => {
      const finger = makeFinger(f);
      finger.position.set(f.xOff, fingerTopY, 0);
      hand.add(finger);

      const baseJoint = makeJoint(f.radius * 1.15);
      baseJoint.position.set(f.xOff, fingerTopY, 0);
      hand.add(baseJoint);
    });

    const thumbGroup = new THREE.Group();
    thumbGroup.position.set(0.48, 0.1, 0);
    thumbGroup.rotation.z = -Math.PI / 2.6;
    thumbGroup.add(makeFinger({ proximalLen: 0.28, distalLen: 0.2, radius: 0.085, curl: 0.45 }));
    hand.add(thumbGroup);

    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.7, 8), wristMaterial);
    wrist.position.y = -0.7;
    hand.add(wrist);

    hand.rotation.x = -Math.PI / 7;
    return hand;
  }

  // Procedural fallback — built in memory but only added to the
  // scene if the GLB load fails. Prevents a flash of procedural hands
  // before the real model arrives.
  const proceduralHands = new THREE.Group();
  const leftHand = makeHand();
  leftHand.position.set(-1.3, -0.25, -0.2);
  leftHand.rotation.y = 0.25;
  proceduralHands.add(leftHand);

  const rightHand = makeHand();
  rightHand.position.set(1.3, -0.25, -0.2);
  rightHand.rotation.y = -0.25;
  proceduralHands.add(rightHand);

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
  // Load hands GLB if present (replaces procedural fallback)
  // -------------------------------------------------------------
  const loader = new GLTFLoader();
  loader.load(
    "assets/hero-hands.glb",
    (gltf) => {
      const model = gltf.scene;

      // Center on origin, scale to scene
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);

      const targetSize = 3.4;
      model.scale.setScalar(targetSize / size);

      // The model came in facing away — flip 180° on Y to face camera.
      // If the GLB was already correctly oriented, change to 0.
      model.rotation.y = Math.PI;

      // Cool the model down so it doesn't overpower the palette
      model.traverse((node) => {
        if (node.isMesh && node.material) {
          node.material.envMapIntensity = 0.6;
        }
      });

      // Add the model into the animated container
      handsContainer.add(model);
    },
    undefined,
    () => {
      // GLB missing or failed to load — show procedural fallback.
      handsContainer.add(proceduralHands);
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
  // Pause animation when the tab is hidden
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
