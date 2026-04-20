import * as THREE from 'three'
import './style.css';
import vertexShader from './shaders/blob/vertexShader.glsl'
import fragmentBlob from './shaders/blob/fragmentShader.glsl'
import GUI from 'lil-gui';

const scene = new THREE.Scene();

const camera = new THREE.Camera()
camera.position.z = 1;


const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
const canvas = document.getElementById("threejs-canvas");

canvas?.appendChild(renderer.domElement);

const mouseProps = {
  x: 0.5,
  y: 0.5,
  px: 0.5,
  py: 0.5,
  vx: 0,
  vy: 0,
  pressure: 0
}

const targetMouse = { x: 0.5, y: 0.5 }; // for smoothing

const uniforms = {
  uTime: { value: 0 },
  uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  uBlobSize: {value:.5},
  // NEW INTERACTION UNIFORMS
  uMouse: { value: new THREE.Vector2(0.5, 0.5) },
  uMouseVelocity: { value: new THREE.Vector2(0, 0) },
  uMousePressure: { value: 0 },
  uMorph: {value:0.},
    // NEW
  uIdle: { value: 0 },     // seconds since last movement
  uActive: { value: 0 }  // 0 = idle, 1 = active (smoothed)
};

// let targetUActiveState = 1;

const geometry = new THREE.PlaneGeometry(2, 2);
const blobShader = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader:fragmentBlob,
  uniforms
});

const mesh = new THREE.Mesh(geometry, blobShader);
scene.add(mesh);

// GUI
const gui = new GUI();
gui.add(uniforms.uTime, 'value', 0, 10).name('Time');
gui.add(uniforms.uBlobSize, 'value', 0.1, 2.0).name('Blob Size');
gui.add(camera.position, 'z', 0, 10).name('camera-z');
gui.add(uniforms.uActive,'value',0,1,0.1).name("collapes")

const clock = new THREE.Clock();

let idleTime = 0;
// let lastMoveTime = performance.now();

// Handle resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  // camera.aspect = window.innerWidth / window.innerHeight;
  // camera.updateProjectionMatrix();
  // camera.lookAt(0,0,0)
  uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
});

// 🖱️ Pointer Events (better than mousemove)
renderer.domElement.addEventListener('pointermove', (e) => {
  const rect = renderer.domElement.getBoundingClientRect();

  // Normalize to 0–1 (VERY IMPORTANT)
  const nx = (e.clientX - rect.left) / rect.width;
  const ny = 1.0 - (e.clientY - rect.top) / rect.height;

  targetMouse.x = nx;
  targetMouse.y = ny;

  // console.log("time:",performance.now())

  // Real pressure (works on stylus/touch, fallback for mouse)
  mouseProps.pressure = e.pressure > 0 ? e.pressure : 0.5;
  // console.log("mouse values", mouseProps)
  // console.log("velocity", mouseProps.vx, mouseProps.vy)

});

renderer.domElement.addEventListener('pointerdown', (e) => {
  mouseProps.pressure = e.pressure > 0 ? e.pressure : 1.0;
});

renderer.domElement.addEventListener('pointerup', () => {
  mouseProps.pressure = 0.0;
});

function animate() {
// controls.update()
requestAnimationFrame(animate);

// === ACTIVITY DETECTION BASED ON REAL VELOCITY ===
const speed = Math.sqrt(
  mouseProps.vx * mouseProps.vx + 
  mouseProps.vy * mouseProps.vy
);

// Tiny threshold to ignore micro jitter
const movementThreshold = 0.002;

// If moving → reset idle timer
if (speed > movementThreshold) {
  idleTime = 0;
} else {
  idleTime += clock.getDelta(); // accumulate smoothly
}

// Clamp for safety
idleTime = Math.min(idleTime, 10.0);

// Send to shader
uniforms.uIdle.value = idleTime;

// Smooth activity (BUTTERY interpolation)
// const targetActivity = speed > movementThreshold ? 1.0 : 0.0;
// uniforms.uActive.value += (targetActivity - uniforms.uActive.value) * 0.06;

  uniforms.uTime.value = clock.getElapsedTime();
    // 🔥 Smooth mouse (inertia)
  const smoothFactor = 0.15;
  mouseProps.x += (targetMouse.x - mouseProps.x) * smoothFactor;
  mouseProps.y += (targetMouse.y - mouseProps.y) * smoothFactor;

  // 🧭 Compute velocity (CPU side — correct way)
  const vx = mouseProps.x - mouseProps.px;
  const vy = mouseProps.y - mouseProps.py;

  // Extra smoothing to avoid jittery blobs
  mouseProps.vx += (vx - mouseProps.vx) * 0.2;
  mouseProps.vy += (vy - mouseProps.vy) * 0.2;

  // Fake pressure from speed if using a mouse (optional but nice)
  const morphSpeed = Math.sqrt(mouseProps.vx * mouseProps.vx + mouseProps.vy * mouseProps.vy);
  if (mouseProps.pressure === 0.5) {
    mouseProps.pressure = Math.min(morphSpeed * 8.0, 1.0);
  }

  // const speed = Math.sqrt(mouseProps.vx * mouseProps.vx + mouseProps.vy * mouseProps.vy);
uniforms.uMorph.value = Math.min(morphSpeed * 5.0, 1.0);

  // Save previous position
  mouseProps.px = mouseProps.x;
  mouseProps.py = mouseProps.y;

  // 🎮 Send uniforms to shader
  uniforms.uMouse.value.set(mouseProps.x, mouseProps.y);
  uniforms.uMouseVelocity.value.set(mouseProps.vx * 5, mouseProps.vy * 5);
  uniforms.uMousePressure.value = mouseProps.pressure * 2 ;

  renderer.render(scene, camera);
}
animate();
