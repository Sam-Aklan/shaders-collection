import * as THREE from 'three';
import { GUI } from 'lil-gui';

import vertexShader from './shaders/vertexShader.glsl';
import fragmentShader from './shaders/blob-trailer/test_fragment.glsl';
import './style.css';

const scene = new THREE.Scene();
const camera = new THREE.Camera();
camera.position.z = 1;


const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const canvas = document.getElementById('threejs-canvas');
canvas?.appendChild(renderer.domElement);

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
const sharedUniforms= {
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
//   uNoise: { value: noiseTexture },

  // Reveal
//   uChannel1: { value: revealTexture },

  // Blob visuals
  uBlobSize: { value: 0.07 }
};

const geometry = new THREE.PlaneGeometry(2, 2);
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader:fragmentShader,
  uniforms:sharedUniforms
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// GUI
const gui = new GUI();
// gui.add(sharedUniforms.uTime, 'value', 0, 10).name('Time');
gui.add(camera.position, 'z',0,10).name('camera-z')

// Handle resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
 console.log("set size")
  sharedUniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
});

//======================
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

const clock = new THREE.Clock();
function animate() {
requestAnimationFrame(animate);
  sharedUniforms.uTime.value += clock.getDelta();

  // === SMOOTH MOUSE (INERTIA) ===
  const smooth = 0.35;
  mouse.x += (targetMouse.x - mouse.x) * smooth;
  mouse.y += (targetMouse.y - mouse.y) * smooth;


  // Save prev mouse BEFORE update
  sharedUniforms.uPrevMouse.value.set(mouse.px, mouse.py);

  // Send uniforms
  sharedUniforms.uMouse.value.set(mouse.x, mouse.y);

  // Store previous for next frame
  mouse.px = mouse.x;
  mouse.py = mouse.y;

  renderer.render(scene, camera);
}
animate();
