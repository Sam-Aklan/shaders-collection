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
scene.fog = new THREE.FogExp2('#0b0c10', 0.015);

// Camera
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 8, 12);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

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
// TEXTURE LOADING & LOADING INDICATOR
// ==========================================
const textureLoader = new THREE.TextureLoader();

// Dynamic DOM loading indicator
const loaderOverlay = document.createElement('div');
Object.assign(loaderOverlay.style, {
  position: 'absolute',
  bottom: '24px',
  left: '24px',
  zIndex: '100',
  color: '#e2e8f0',
  fontFamily: "'Outfit', sans-serif",
  fontSize: '0.85rem',
  background: 'rgba(15, 23, 42, 0.85)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  padding: '12px 18px',
  pointerEvents: 'none',
  transition: 'opacity 0.5s ease, transform 0.5s ease',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
});

loaderOverlay.innerHTML = `
  <div style="width: 14px; height: 14px; border: 2px solid #60a5fa; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
  <span>Loading High-Res Textures (35MB)...</span>
`;

// Add spin animation to document head
const styleSheet = document.createElement('style');
styleSheet.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
document.head.appendChild(styleSheet);
document.body.appendChild(loaderOverlay);

let loadedCount = 0;
const checkLoadingComplete = () => {
  loadedCount++;
  if (loadedCount === 2) {
    loaderOverlay.innerHTML = '✨ Textures loaded successfully!';
    setTimeout(() => {
      loaderOverlay.style.opacity = '0';
      loaderOverlay.style.transform = 'translateY(10px)';
      setTimeout(() => loaderOverlay.remove(), 500);
    }, 2000);
  }
};

// Heightmap texture (No color conversion needed as it represents data)
const heightMap = textureLoader.load('/Mountain By Sea Heightmap.png', checkLoadingComplete);
heightMap.colorSpace = THREE.NoColorSpace;
heightMap.wrapS = THREE.ClampToEdgeWrapping;
heightMap.wrapT = THREE.ClampToEdgeWrapping;
heightMap.minFilter = THREE.LinearFilter;
heightMap.magFilter = THREE.LinearFilter;

// Color (diffuse) map (sRGB)
const colorMap = textureLoader.load('/Mountain By Sea Heightmap Diffuse.jpg', checkLoadingComplete);
colorMap.colorSpace = THREE.SRGBColorSpace;
colorMap.wrapS = THREE.ClampToEdgeWrapping;
colorMap.wrapT = THREE.ClampToEdgeWrapping;
colorMap.minFilter = THREE.LinearMipmapLinearFilter;
colorMap.magFilter = THREE.LinearFilter;
colorMap.generateMipmaps = true;

// ==========================================
// SCENE LIGHTS (for Water Reflections)
// ==========================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
scene.add(dirLight);

// ==========================================
// SHADER TERRAIN MESH
// ==========================================
const terrainParams = {
  size: 10,
  segments: 512,
  strength: 1.5,
  wireframe: false,
};

const uniforms = {
  uHeightMap: { value: heightMap },
  uColorMap: { value: colorMap },
  uStrength: { value: terrainParams.strength },
  uLightDir: { value: new THREE.Vector3(0.5, 0.5, 1.0).normalize() }
};

const terrainGeometry = new THREE.PlaneGeometry(
  terrainParams.size,
  terrainParams.size,
  terrainParams.segments,
  terrainParams.segments
);

const terrainMaterial = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
  side: THREE.DoubleSide,
  wireframe: terrainParams.wireframe,
});

const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
// Rotate plane horizontally (Z points upwards in local space, becoming World Y)
terrainMesh.rotation.x = -Math.PI / 2;
scene.add(terrainMesh);

// ==========================================
// DECORATIVE WATER PLANE
// ==========================================
const waterParams = {
  enabled: true,
  height: 0.1,
  color: '#0f3263',
  opacity: 0.75,
  roughness: 0.1,
};

const waterGeometry = new THREE.PlaneGeometry(terrainParams.size, terrainParams.size);
const waterMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(waterParams.color),
  roughness: waterParams.roughness,
  metalness: 0.8,
  transparent: true,
  opacity: waterParams.opacity,
  side: THREE.DoubleSide,
});

const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
waterMesh.rotation.x = -Math.PI / 2;
waterMesh.position.y = waterParams.height;
if (waterParams.enabled) {
  scene.add(waterMesh);
}

// ==========================================
// LIGHTING SYNC & SHADER PARAMETERS
// ==========================================
const lightParams = {
  x: uniforms.uLightDir.value.x,
  y: uniforms.uLightDir.value.y,
  z: uniforms.uLightDir.value.z,
};

function updateLight() {
  const dir = new THREE.Vector3(lightParams.x, lightParams.y, lightParams.z);
  if (dir.lengthSq() > 0.0001) {
    dir.normalize();
  } else {
    dir.set(0, 0, 1);
  }
  uniforms.uLightDir.value.copy(dir);

  // Synchronize DirectionalLight in world space
  // Terrain local space coordinates are rotated: local Z is world Y, etc.
  const worldLightDir = dir.clone().applyQuaternion(terrainMesh.quaternion);
  dirLight.position.copy(worldLightDir).multiplyScalar(8);
}
// Run once to initialize positions
updateLight();

// ==========================================
// GUI CONTROL PANEL
// ==========================================
const gui = new GUI({ title: 'Shader Customization' });

// Terrain Folder
const terrainFolder = gui.addFolder('Terrain Mesh');

terrainFolder.add(terrainParams, 'strength', 0.0, 3.0).name('Height Strength').onChange((val: number) => {
  uniforms.uStrength.value = val;
});

terrainFolder.add(terrainParams, 'segments', [128, 256, 512, 1024]).name('Grid Resolution').onChange((val: number) => {
  terrainMesh.geometry.dispose();
  terrainMesh.geometry = new THREE.PlaneGeometry(
    terrainParams.size,
    terrainParams.size,
    val,
    val
  );
});

terrainFolder.add(terrainParams, 'wireframe').name('Wireframe Mode').onChange((val: boolean) => {
  terrainMaterial.wireframe = val;
});

// Light Folder
const lightFolder = gui.addFolder('Shader Light Uniforms');

lightFolder.add(lightParams, 'x', -1.0, 1.0).step(0.01).name('Light Dir X').onChange(updateLight);
lightFolder.add(lightParams, 'y', -1.0, 1.0).step(0.01).name('Light Dir Y').onChange(updateLight);
lightFolder.add(lightParams, 'z', -1.0, 1.0).step(0.01).name('Light Dir Z').onChange(updateLight);

// Water Folder
const waterFolder = gui.addFolder('Sea Level Simulation');

waterFolder.add(waterParams, 'enabled').name('Enable Ocean').onChange((val: boolean) => {
  if (val) {
    scene.add(waterMesh);
  } else {
    scene.remove(waterMesh);
  }
});

waterFolder.add(waterParams, 'height', 0.0, 1.0).step(0.01).name('Sea Level').onChange((val: number) => {
  waterMesh.position.y = val;
});

waterFolder.add(waterParams, 'opacity', 0.0, 1.0).step(0.01).name('Water Transparency').onChange((val: number) => {
  waterMaterial.opacity = val;
});

waterFolder.addColor(waterParams, 'color').name('Water Color').onChange((val: string) => {
  waterMaterial.color.set(val);
});

gui.open();

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
  
  // Damping controls update
  controls.update();
  
  renderer.render(scene, camera);
}

// Start loop
animate();
