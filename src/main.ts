import * as THREE from "three";
import { GUI } from "lil-gui";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import scanWireFrame from "./shaders/scanline/scanLineFragment.glsl";
import scanLineVertex from "./shaders/scanline/vertexScanLine.glsl";
import "./style.css";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(2, 2, 2);
scene.background = new THREE.Color(0x000);


const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

const scanLineMatrial = new THREE.ShaderMaterial({
  vertexShader: scanLineVertex,
  fragmentShader: scanWireFrame,
  uniforms: scanLineUniforms,
});


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

          // Handle maps and replace material with scanLineMatrial
          if ('map' in material && material.map) {
            scanLineMatrial.uniforms.map.value = material.map;
            scanLineMatrial.uniforms.useMap.value = true;
          } else {
            scanLineMatrial.uniforms.useMap.value = false;
            
            // Handle color property (could be Color, string, or number)
            if ('color' in material) {
              const color = material.color;
              if (color && typeof color === 'object' && 'r' in color) {
                scanLineMatrial.uniforms.scanColor.value = new THREE.Vector3(1.,1.,1.);
              }
            }
          }
        });

        // Replace the material(s) with scanLineMatrial
        mesh.material = Array.isArray(mesh.material) 
          ? new Array(mesh.material.length).fill(scanLineMatrial)
          : scanLineMatrial;

        // Compute geometry bounding box if needed
        if (mesh.geometry) {
          mesh.geometry.computeBoundingBox();
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

scanLineMatrial.uniforms.boundsMinY.value = finalBox.min.y;
scanLineMatrial.uniforms.boundsMaxY.value = finalBox.max.y;

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

// Add a ground plane for shadows
const groundGeometry = new THREE.PlaneGeometry(20, 20);
const groundMaterial = new THREE.ShadowMaterial({
  color: 0x000000,
  opacity: 0.2,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.5;
ground.receiveShadow = true;
// scene.add(ground);

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

const scanLineFolder = gui.addFolder("scan line");
scanLineFolder.add(scanLineUniforms.scanIntensity,"value",0,10,1.).name("intensity");
scanLineFolder.add(scanLineUniforms.scanThickness,"value",0,.1,.01).name("thickness");
scanLineFolder.add(scanLineUniforms.distortionStrength,"value",0,.05,.005).name("distortion");
scanLineFolder.add(scanLineUniforms.scanSpeed,"value",0.1,.9,.1).name("speed");

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
