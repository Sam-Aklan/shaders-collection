import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'lil-gui';

import vertexShader from './shaders/vertexShader.glsl';
import fragmentBlobShader from './shaders/blobShader.glsl';
import fragmentHeightMapShader from './shaders/heightMapShader.glsl';

// 1. Scene & Renderer Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.up.set(0, 0, 1);
camera.position.set(0, -2.2, 1.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const canvas = document.getElementById('threejs-canvas');
canvas?.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// 2. Texture Loading
const textureLoader = new THREE.TextureLoader();
const heightMapTexture = textureLoader.load('/Mountain By Sea Heightmap.png');
const colorMapTexture = textureLoader.load('/Mountain By Sea Heightmap Diffuse.jpg');

heightMapTexture.wrapS = THREE.ClampToEdgeWrapping;
heightMapTexture.wrapT = THREE.ClampToEdgeWrapping;
colorMapTexture.wrapS = THREE.ClampToEdgeWrapping;
colorMapTexture.wrapT = THREE.ClampToEdgeWrapping;
colorMapTexture.colorSpace = THREE.SRGBColorSpace;

// 3. FBO Setup (Single Render Target, no ping-pong feedback)
const fboSize = 1024;
const rtActive = new THREE.WebGLRenderTarget(fboSize, fboSize, {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  format: THREE.RGBAFormat,
  type: THREE.HalfFloatType,
  depthBuffer: false,
  stencilBuffer: false,
});

// 1x1 black texture to prevent trail accumulation
const emptyTexture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat);
emptyTexture.needsUpdate = true;

// 4. FBO Simulation Setup (Screen Quad)
const simScene = new THREE.Scene();
const simCamera = new THREE.Camera(); // Identity projection for 2x2 plane
const simGeometry = new THREE.PlaneGeometry(2, 2);

const blobUniforms = {
  uResolution: { value: new THREE.Vector2(fboSize, fboSize) },
  uMouse: { value: new THREE.Vector2(0.5, 0.5) },
  uPrevMouse: { value: new THREE.Vector2(0.5, 0.5) },
  uMouseVelocity: { value: new THREE.Vector2(0, 0) },
  uMousePressure: { value: 0.0 },
  uPrevTrail: { value: emptyTexture },
  uTime: { value: 0 },
  uBlobSize: { value: 0.07 },
  uHeightMap: { value: heightMapTexture },
  uAspect: { value: 1.0 },
  uPinHover: { value: 0.0 },
};

const simMaterial = new THREE.ShaderMaterial({
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: fragmentBlobShader,
  uniforms: blobUniforms,
  depthWrite: false,
  depthTest: false,
});

const simMesh = new THREE.Mesh(simGeometry, simMaterial);
simScene.add(simMesh);

// 5. Main Terrain Mesh Setup
const terrainGeometry = new THREE.PlaneGeometry(2, 2, 512, 512);

const terrainUniforms = {
  uHeightMap: { value: heightMapTexture },
  uStrength: { value: 0.35 },
  uColorMap: { value: colorMapTexture },
  uLightDir: { value: new THREE.Vector3(1.0, 1.0, 1.0).normalize() },
  uBlobTexture: { value: null as THREE.Texture | null },
};

const terrainMaterial = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader: fragmentHeightMapShader,
  uniforms: terrainUniforms,
  side: THREE.DoubleSide,
});

const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
scene.add(terrainMesh);

// 6. Interaction Setup (Raycasting)
const raycaster = new THREE.Raycaster();
const ndcMouse = new THREE.Vector2(0.5, 0.5);

const mouseState = {
  x: 0.5,
  y: 0.5,
  px: 0.5,
  py: 0.5,
  pressure: 0.0,
};

const targetMouseState = {
  x: 0.5,
  y: 0.5,
  pressure: 0.0,
};

let hasPointerMoved = false;
let isPointerDown = false;

const updateMouseNDC = (clientX: number, clientY: number) => {
  const rect = renderer.domElement.getBoundingClientRect();
  ndcMouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  ndcMouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  hasPointerMoved = true;
};

renderer.domElement.addEventListener('pointermove', (e) => {
  updateMouseNDC(e.clientX, e.clientY);
});

renderer.domElement.addEventListener('pointerdown', (e) => {
  isPointerDown = true;
  updateMouseNDC(e.clientX, e.clientY);
});

renderer.domElement.addEventListener('pointerup', () => {
  isPointerDown = false;
});

renderer.domElement.addEventListener('pointerleave', () => {
  isPointerDown = false;
  targetMouseState.pressure = 0.0;
});

const interactionSettings = {
  lerpFactor: 0.3,
};

// 7. GUI Controls Setup
const gui = new GUI();
const terrainFolder = gui.addFolder('Terrain');
terrainFolder.add(terrainUniforms.uStrength, 'value', 0, 1.0).name('Displacement');

const lightingFolder = gui.addFolder('Lighting');
const updateLight = () => terrainUniforms.uLightDir.value.normalize();
lightingFolder.add(terrainUniforms.uLightDir.value, 'x', -1, 1).name('Light X').onChange(updateLight);
lightingFolder.add(terrainUniforms.uLightDir.value, 'y', -1, 1).name('Light Y').onChange(updateLight);
lightingFolder.add(terrainUniforms.uLightDir.value, 'z', -1, 1).name('Light Z').onChange(updateLight);

const blobFolder = gui.addFolder('Neon Blob');
blobFolder.add(blobUniforms.uBlobSize, 'value', 0.01, 0.3).name('Blob Size');
blobFolder.add(blobUniforms.uPinHover, 'value', 0.0, 1.0).name('Pin Hover');
blobFolder.add(interactionSettings, 'lerpFactor', 0.05, 1.0).name('Follow Delay');

// 8. Resize Handler
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// 9. Animation Loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const time = clock.getElapsedTime();

  // Raycast to find terrain UV intersection
  if (hasPointerMoved) {
    raycaster.setFromCamera(ndcMouse, camera);
    const intersects = raycaster.intersectObject(terrainMesh);
    if (intersects.length > 0) {
      const intersect = intersects[0];
      if (intersect.uv) {
        targetMouseState.x = intersect.uv.x;
        targetMouseState.y = intersect.uv.y;
        targetMouseState.pressure = isPointerDown ? 1.0 : 0.2; // light pressure on hover, full on click
      }
    } else {
      targetMouseState.pressure = 0.0;
    }
  }

  // Smooth mouse coordinates and pressure (lerp)
  const lerp = interactionSettings.lerpFactor;
  
  // Set uPrevMouse to the old value
  blobUniforms.uPrevMouse.value.set(mouseState.px, mouseState.py);

  // Update current mouse state
  mouseState.x += (targetMouseState.x - mouseState.x) * lerp;
  mouseState.y += (targetMouseState.y - mouseState.y) * lerp;
  mouseState.pressure += (targetMouseState.pressure - mouseState.pressure) * lerp;

  // Set uMouse to the new value
  blobUniforms.uMouse.value.set(mouseState.x, mouseState.y);

  // Calculate mouse velocity in UV space
  const vx = mouseState.x - mouseState.px;
  const vy = mouseState.y - mouseState.py;
  blobUniforms.uMouseVelocity.value.set(vx, vy);
  blobUniforms.uMousePressure.value = mouseState.pressure;

  // Store current for next frame
  mouseState.px = mouseState.x;
  mouseState.py = mouseState.y;

  // Update general simulation uniforms
  blobUniforms.uTime.value = time;

  // Step 1: Render blob simulation pass to active FBO
  renderer.setRenderTarget(rtActive);
  renderer.render(simScene, simCamera);

  // Step 2: Render main scene pass to canvas
  renderer.setRenderTarget(null);
  terrainUniforms.uBlobTexture.value = rtActive.texture;
  
  controls.update();
  renderer.render(scene, camera);
}

animate();
