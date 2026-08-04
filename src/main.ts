import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'lil-gui';

import vertexShader from './shaders/vertexShader.glsl';
import fragmentShader from './shaders/fragmentShader.glsl';

// ==========================================
// SCENE SETUP
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b0c10');

// Camera
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 8, 10);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const canvasContainer = document.getElementById('threejs-canvas');
if (canvasContainer) {
  canvasContainer.appendChild(renderer.domElement);
}

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent camera from going below ground level
controls.minDistance = 2;
controls.maxDistance = 30;

// ==========================================
// TEXTURE LOADING
// ==========================================
const textureLoader = new THREE.TextureLoader();

// Heightmap texture (No color conversion needed as it represents data)
const heightMap = textureLoader.load('/Mountain By Sea Heightmap.png');
heightMap.colorSpace = THREE.NoColorSpace;
heightMap.wrapS = THREE.ClampToEdgeWrapping;
heightMap.wrapT = THREE.ClampToEdgeWrapping;

// Color (diffuse) map (sRGB)
const colorMap = textureLoader.load('/Mountain By Sea Heightmap Diffuse.jpg');
colorMap.colorSpace = THREE.SRGBColorSpace;
colorMap.wrapS = THREE.ClampToEdgeWrapping;
colorMap.wrapT = THREE.ClampToEdgeWrapping;

// ==========================================
// SHADER TERRAIN MESH
// ==========================================
const uniforms = {
  uHeightMap: { value: heightMap },
  uColorMap: { value: colorMap },
  uStrength: { value: 1.5 },
  uLightDir: { value: new THREE.Vector3(0.5, 0.5, 1.0).normalize() }
};

const terrainGeometry = new THREE.PlaneGeometry(10, 10, 512, 512);

const terrainMaterial = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
  side: THREE.DoubleSide,
});

const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
// Rotate plane horizontally (local Z points upwards, becoming World Y)
terrainMesh.rotation.x = -Math.PI / 2;
scene.add(terrainMesh);

// ==========================================
// GUI CONTROL PANEL
// ==========================================
const gui = new GUI({ title: 'Shader Uniforms' });

// Height Strength Control
gui.add(uniforms.uStrength, 'value', 0.0, 3.0).name('Height Strength');

// Light Direction Control
const lightFolder = gui.addFolder('Light Direction');
const lightDir = uniforms.uLightDir.value;

function updateLight() {
  if (lightDir.lengthSq() > 0.0001) {
    lightDir.normalize();
  } else {
    lightDir.set(0, 0, 1);
  }
}

lightFolder.add(lightDir, 'x', -1.0, 1.0, 0.01).name('X').onChange(updateLight);
lightFolder.add(lightDir, 'y', -1.0, 1.0, 0.01).name('Y').onChange(updateLight);
lightFolder.add(lightDir, 'z', -1.0, 1.0, 0.01).name('Z').onChange(updateLight);
lightFolder.open();

// ==========================================
// RESIZE & RENDER LOOP
// ==========================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// Start loop
animate();
