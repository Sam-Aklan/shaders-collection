import * as THREE from "three";
import { GUI } from "lil-gui";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import fragmentWireFrame from "./shaders/wire-frame/fragmentWireFrame.glsl";
import vertexWireFrame from "./shaders/wire-frame/vertexShader.glsl";
import "./style.css";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

camera.position.set(2, 2, 2);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

const canvas = document.getElementById('threejs-canvas');
canvas?.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Loaders
const gltfLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(
  "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
);
gltfLoader.setDRACOLoader(dracoLoader);



// wireframe shaders

const scanLineUniforms = {
 time: { value: 0 },
    map: { value: null },              // optional texture
    useMap: { value: false },

    boundsMinY: { value: 0 },
    boundsMaxY: { value: 1 },

    scanSpeed: { value: .2 },         // animation speed
    scanThickness: { value: .03},     // band thickness
    scanIntensity: { value: 10. },     // glow strength
    distortionStrength: { value: 0.014},

    scanColor: { value: new THREE.Color(0x4beeee) }
};

const wireUniforms = {
  uLineWidth: { value: .5 },
  uEdgeThreshold: { value: 0.1 },
  uCreaseThreshold: { value: 0.3 },

  uLineColor: { value: new THREE.Vector4(.02, 0.5, .8, .5) },
  uBackgroundColor: { value: new THREE.Vector4(0, 0, 0, 0) },

  uShowSilhouette: { value: true },
  uShowCrease: { value: true },
  uShowBorder: { value: true },

  uNoiseAmount: { value: 0.1 },
  uTime: { value: 0.0 },
};

const wireMaterial = new THREE.ShaderMaterial({
  vertexShader: vertexWireFrame,
  fragmentShader: fragmentWireFrame,
  uniforms: wireUniforms,
  transparent: true,
  depthTest: true,
  depthWrite: false,
});

// const scanLineMatrial = new THREE.ShaderMaterial({
//   vertexShader: scanLineVertex,
//   fragmentShader: scanWireFrame,
//   uniforms: scanLineUniforms,
// });

function addBarycentricCoordinates(geometry:THREE.BufferGeometry<THREE.NormalBufferAttributes, THREE.BufferGeometryEventMap>) {
  const count = geometry.attributes.position.count;
  const barycentric = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 3) {
    // Triangle vertex A
    barycentric[(i + 0) * 3 + 0] = 1;
    barycentric[(i + 0) * 3 + 1] = 0;
    barycentric[(i + 0) * 3 + 2] = 0;

    // Triangle vertex B
    barycentric[(i + 1) * 3 + 0] = 0;
    barycentric[(i + 1) * 3 + 1] = 1;
    barycentric[(i + 1) * 3 + 2] = 0;

    // Triangle vertex C
    barycentric[(i + 2) * 3 + 0] = 0;
    barycentric[(i + 2) * 3 + 1] = 0;
    barycentric[(i + 2) * 3 + 2] = 1;
  }

  geometry.setAttribute(
    "barycentric",
    new THREE.BufferAttribute(barycentric, 3),
  );
}


// Load your 3D model

let model;

gltfLoader.load(
  "./model/racing_helmet.glb",
  (gltf) => {
    model = gltf.scene;
    model.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Handle materials (could be single or array)
        const materials = Array.isArray(mesh.material) 
          ? mesh.material 
          : [mesh.material];

        // Process each material
        materials.forEach((material) => {
          if (!material) return;
          // Improve material quality
          if ('envMapIntensity' in material) {
            material.envMapIntensity = 1;
          }

          // Handle metalness (if material supports it)
          if ('metalness' in material && material.metalness !== undefined) {
            material.metalness = Math.min(
              (material.metalness as number) * 1.2,
              1
            );
          }

          // Handle roughness (if material supports it)
          if ('roughness' in material && material.roughness !== undefined) {
            material.roughness = Math.max(
              (material.roughness as number) * 0.8,
              0.1
            );
          }

          
        });

        // Compute geometry bounding box if needed
        if (mesh.geometry) {
           let geometry = mesh.geometry;
          if (geometry.index) {
            geometry = geometry.toNonIndexed();
          }
          addBarycentricCoordinates(geometry);
          mesh.geometry = geometry;
          mesh.material = wireMaterial;

        }
      }
    });

    // Center and scale the model
    const box = new THREE.Box3().setFromObject(model);


    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());


    model.position.sub(center);
    

    // Calculate appropriate scale
    const scaleMultiplayer = 270.;
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = scaleMultiplayer / maxDim;
    model.scale.setScalar(scale);

    model.position.y = -400;
    model.position.x = -100;

   // 🔥 FORCE matrix update
model.updateMatrixWorld(true);

// 🔥 Now compute FINAL world bounds
const finalBox = new THREE.Box3().setFromObject(model);

// scanLineMatrial.uniforms.boundsMinY.value = finalBox.min.y;
// scanLineMatrial.uniforms.boundsMaxY.value = finalBox.max.y;

console.log("minY",finalBox.min.y,"maxY",finalBox.max.y)

    scene.add(model);

    // Focus camera on the model
    
    camera.position.set(-85.72, 252.941, 854.295);
    // camera.position.set(0,0,0);
    controls.target.copy(new THREE.Vector3());
    controls.update();
  },
  (progress) => {
    console.log(
      `Loading: ${((progress.loaded / progress.total) * 100).toFixed(2)}%`,
    );
  },
  (error) => {
    console.error("Error loading model:", error);
  },
);

// Balanced Lighting Setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Soft overall light
scene.add(ambientLight);

// Main directional light (simulating sun)
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -10;
directionalLight.shadow.camera.right = 10;
directionalLight.shadow.camera.top = 10;
directionalLight.shadow.camera.bottom = -10;
scene.add(directionalLight);

// Fill light from opposite side
const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
fillLight.position.set(-5, 2, -5);
scene.add(fillLight);

// Rim/back light for edge definition
const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
rimLight.position.set(0, 5, -5);
scene.add(rimLight);

// Soft top light
const topLight = new THREE.DirectionalLight(0xffffff, 0.15);
topLight.position.set(0, 10, 0);
scene.add(topLight);

// Optional: Hemisphere light for natural outdoor-like lighting
const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.2);
scene.add(hemisphereLight);

// GUI
const gui = new GUI();
const lightingFolder = gui.addFolder("Lighting");
lightingFolder.add(ambientLight, "intensity", 0, 1, 0.01).name("Ambient Light");
lightingFolder
  .add(directionalLight, "intensity", 0, 2, 0.01)
  .name("Main Light");
lightingFolder.add(fillLight, "intensity", 0, 1, 0.01).name("Fill Light");
lightingFolder.add(rimLight, "intensity", 0, 1, 0.01).name("Rim Light");
lightingFolder
  .add(renderer, "toneMappingExposure", 0.5, 2, 0.01)
  .name("Exposure");

const cameraFolder = gui.addFolder("Camera");
cameraFolder.add(camera.position, "x", -10, 10, 0.1).name("Camera X");
cameraFolder.add(camera.position, "y", -10, 10, 0.1).name("Camera Y");
cameraFolder.add(camera.position, "z", -10, 10, 0.1).name("Camera Z");

const wireframeFolder = gui.addFolder("wire-freme");
wireframeFolder.add(wireUniforms.uLineWidth,"value",0,3.,.25).name("line-width");
wireframeFolder.add(wireUniforms.uEdgeThreshold,"value",0,1,.01).name("edge-threshold");
wireframeFolder.add(wireUniforms.uCreaseThreshold,"value",0,.5,.01).name("crease-threshold");
wireframeFolder.add(wireUniforms.uNoiseAmount,"value",0,1.,.1).name("noise");

// Handle resize
window.addEventListener("resize", () => {
  renderer.setSize(renderer.domElement.width, renderer.domElement.height);
  camera.aspect = renderer.domElement.width / renderer.domElement.height;
  camera.updateProjectionMatrix();
  controls.update();
});

const clock = new THREE.Clock()
// controls.addEventListener("change",()=>{
//   console.log("coaridinates", camera.position)
// })

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  camera.lookAt(0,0,0);
  scanLineUniforms.time.value = clock.getElapsedTime()

  renderer.render(scene, camera);
}
animate();
