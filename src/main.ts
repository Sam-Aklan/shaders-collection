import './style.css'
import * as THREE from 'three'
import { GUI } from 'lil-gui';

import vertexShader from './shaders/blob-trailer/vertexShader.glsl';
import fragmenBlobTrailerShader from './shaders/blob-trailer/fragmentBlobTrailerShader.glsl';
import fragmenRevealShader from './shaders/blob-trailer/fragmentReveal.glsl';
import type { sharedUniformsType } from './types';

const camera = new THREE.Camera()
camera.position.z = 1;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha:true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const canvas = document.getElementById('threejs-canvas');
canvas?.appendChild(renderer.domElement);

const trailScene = new THREE.Scene();   // PASS 1 (paint simulation)
const mainScene = new THREE.Scene();    // PASS 2 (reveal + blob visual)

const rt1 = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  format:THREE.RGBAFormat,
  type: THREE.HalfFloatType,
  depthBuffer: false,
  stencilBuffer: false
});

const rt2 = rt1.clone();
let currentRT = rt1;
let nextRT = rt2;

renderer.setClearColor(0x000000, 0);
renderer.setRenderTarget(rt1);
renderer.clear();
renderer.setRenderTarget(rt2);
renderer.clear();
renderer.setRenderTarget(null);

// ======================
// TEXTURES
// ======================
const loader = new THREE.TextureLoader();

const revealTexture = loader.load('helmet.png');
revealTexture.wrapS = THREE.ClampToEdgeWrapping;
revealTexture.wrapT = THREE.ClampToEdgeWrapping;

const noiseTexture = loader.load('perlin.png');
noiseTexture.wrapS = THREE.RepeatWrapping;
noiseTexture.wrapT = THREE.RepeatWrapping;

// ======================
// SHARED INTERACTION SYSTEM (BLOB + PAINT)
// ======================
const mouse = {
  x: 0.5, y: 0.5,
  px: 0.5, py: 0.5,
  vx: 0, vy: 0,
  pressure: 0,
  idle: 0
};

const targetMouse = { x: 0.5, y: 0.5 };

// ======================
// UNIFORMS (ONE SOURCE OF TRUTH)
// ======================
const sharedUniforms:sharedUniformsType = {
  uTime: { value: 0 },
  uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },

  // Interaction
  uMouse: { value: new THREE.Vector2() },
  uPrevMouse: { value: new THREE.Vector2() },
  uMouseVelocity: { value: new THREE.Vector2(0, 0) },
  uMousePressure: { value: 0 },
  uIdle: { value: 0 },
  uActivity: { value: 1 },

  // Paint system
  uPrevTrail: { value: null },
  uTrail: { value: null },
  uNoise: { value: noiseTexture },

  // Reveal
  uChannel1: { value: revealTexture },

  // Blob visuals
  uBlobSize: { value: 0.07 }
};

// ======================
// GEOMETRY
// ======================
const quad = new THREE.PlaneGeometry(2, 2);

// ======================
// PASS 1: TRAIL SIMULATION MATERIAL
// (Use your NEW unified metaball trail shader here)
// ======================
const trailMaterial = new THREE.ShaderMaterial({
  vertexShader:vertexShader,
  fragmentShader: fragmenBlobTrailerShader, // <- unified shader I gave you
  uniforms: sharedUniforms
});

const trailMesh = new THREE.Mesh(quad, trailMaterial);
trailScene.add(trailMesh);

// ======================
// PASS 2: REVEAL + BLOB VISUAL
// (You can blend blob shader inside this later if desired)
// ======================
const mainMaterial = new THREE.ShaderMaterial({
  vertexShader:vertexShader,
  fragmentShader: fragmenRevealShader,
  uniforms: sharedUniforms,
  transparent: false
});

const mainMesh = new THREE.Mesh(quad, mainMaterial);
mainScene.add(mainMesh);

// ======================
// POINTER EVENTS (HIGH PRECISION)
// ======================
let hasMoved = false;
renderer.domElement.addEventListener('pointermove', (e) => {
  const rect = renderer.domElement.getBoundingClientRect();

  const nx = (e.clientX - rect.left) / rect.width;
  const ny = 1.0 - (e.clientY - rect.top) / rect.height;

  targetMouse.x = nx;
  targetMouse.y = ny;

  if (!hasMoved) {
    mouse.x = nx;
    mouse.y = ny;
    mouse.px = nx;
    mouse.py = ny;
    hasMoved = true;
  }


  mouse.pressure = e.buttons > 0 ? 1.0 : 0.0;
});

renderer.domElement.addEventListener('pointerdown', (e) => {
  mouse.pressure = e.pressure > 0 ? .05 : 1.0;
});

renderer.domElement.addEventListener('pointerup', () => {
  mouse.pressure = 0.0;
});

// ======================
// RESIZE
// ======================
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  renderer.setSize(w, h);
  sharedUniforms.uResolution.value.set(w, h);

  rt1.setSize(w, h);
  rt2.setSize(w, h);
});

// GUI
const gui = new GUI();
// gui.add(sharedUniforms.uTime, 'value', 0, 10).name('Time');
gui.add(camera.position, 'z',0,10).name('camera-z')

// ======================
// RESIZE
// ======================
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  renderer.setSize(w, h);
  sharedUniforms.uResolution.value.set(w, h);

  rt1.setSize(w, h);
  rt2.setSize(w, h);
});

// ======================
// CLOCK
// ======================
const clock = new THREE.Clock();

// ======================
// MAIN LOOP (UNIFIED BRAIN)
// ======================
function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();
  sharedUniforms.uTime.value += dt;

  // === SMOOTH MOUSE (INERTIA) ===
  const smooth = 0.35;
  mouse.x += (targetMouse.x - mouse.x) * smooth;
  mouse.y += (targetMouse.y - mouse.y) * smooth;

  // === VELOCITY (CPU - STABLE) ===
  const vx = mouse.x - mouse.px;
  const vy = mouse.y - mouse.py;

  mouse.vx += (vx - mouse.vx) * 0.2;
  mouse.vy += (vy - mouse.vy) * 0.2;

  const speed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);

  // === IDLE DETECTION (CRITICAL FOR DISSOLVE) ===
  const threshold = 0.0008;
  if (speed > threshold) {
    mouse.idle = 0;
  } else {
    mouse.idle += dt;
  }
  mouse.idle = Math.min(mouse.idle, 10.0);

  // Smooth activity
  const targetActivity = speed > threshold ? 1.0 : 0.0;
  sharedUniforms.uActivity.value += (targetActivity - sharedUniforms.uActivity.value) * 0.08;

  // Save prev mouse BEFORE update
  sharedUniforms.uPrevMouse.value.set(mouse.px, mouse.py);

  // Send uniforms
  sharedUniforms.uMouse.value.set(mouse.x, mouse.y);
  sharedUniforms.uMouseVelocity.value.set(THREE.MathUtils.clamp(mouse.vx * 12.0,-0.15,0.15), THREE.MathUtils.clamp(mouse.vy * 12.0,-0.15,0.15));

  sharedUniforms.uMousePressure.value = mouse.pressure * 5.;
  sharedUniforms.uIdle.value = mouse.idle;

  // Store previous for next frame
  mouse.px = mouse.x;
  mouse.py = mouse.y;

  // ======================
  // PASS 1: UPDATE PAINT BUFFER
  // ======================
  sharedUniforms.uPrevTrail.value = currentRT.texture;

  renderer.setRenderTarget(nextRT);
  renderer.render(trailScene, camera);
  renderer.setRenderTarget(null);

  // Swap FBOs
  const temp = currentRT;
  currentRT = nextRT;
  nextRT = temp;

  // Feed trail into reveal pass
  sharedUniforms.uTrail.value = currentRT.texture;

  // ======================
  // PASS 2: FINAL RENDER (REVEAL)
  // ======================
  renderer.render(mainScene, camera);
}

animate();
