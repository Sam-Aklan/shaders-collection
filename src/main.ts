import './style.css'
import * as THREE from 'three'
import { GUI } from 'lil-gui';

import vertexShader from './shaders/thincloud/vertex.glsl';
import fragmentCircleShader from './shaders/thincloud/fragment.glsl';

const scene = new THREE.Scene();
const camera = new THREE.Camera()
camera.position.z = 1;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha:true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const canvas = document.getElementById('threejs-canvas');
canvas?.appendChild(renderer.domElement);

const uniforms = {
  uTime: { value: 0 },
  uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  uWindDirection: { value: new THREE.Vector2(Math.cos(0.8), Math.sin(0.8)) },
  uWindSpeed: { value: 0.08 },
  uCloudScale: { value: 15},
  uCloudOpacity: { value: 1.},
  uCloudCutoff: { value: 0.3 },
  uCloudFeather: { value: 0.4 },
  uHazeAmount: { value: 0.05 },
  uCloudStretch: { value: 1.0 },
  uCloudCoverage: { value: 0.8 },
  uCurlStrength: { value: 0.2 },
};


const geometry = new THREE.PlaneGeometry(2, 2);
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader:fragmentCircleShader,
  uniforms:uniforms,
  transparent: true,
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// GUI
const gui = new GUI();
const guiParams = {
  windAngle: 0.3,
};

gui.add(uniforms.uWindSpeed, 'value', 0.0, 0.2, 0.001).name('Wind Speed');
gui.add(guiParams, 'windAngle', 0, Math.PI * 2, 0.01).name('Wind Angle').onChange((val: number) => {
  uniforms.uWindDirection.value.set(Math.cos(val), Math.sin(val));
});
gui.add(uniforms.uCloudScale, 'value', 1.0, 20.0, 0.1).name('Cloud Scale');
gui.add(uniforms.uCloudStretch, 'value', 1.0, 10.0, 0.1).name('Cloud Stretch');
gui.add(uniforms.uCloudCoverage, 'value', 0.0, 1.0, 0.01).name('Cloud Coverage');
gui.add(uniforms.uCurlStrength, 'value', 0.0, 5.0, 0.1).name('Curl Strength');
gui.add(uniforms.uCloudOpacity, 'value', 0.0, 1.0, 0.01).name('Cloud Opacity');
gui.add(uniforms.uCloudCutoff, 'value', 0.0, 1.0, 0.01).name('Cloud Cutoff');
gui.add(uniforms.uCloudFeather, 'value', 0.01, 1.0, 0.01).name('Cloud Feather');
gui.add(uniforms.uHazeAmount, 'value', 0.0, 0.5, 0.01).name('Haze Amount');
gui.add(camera.position, 'z', 0, 10).name('camera-z');

// Handle resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
 
  uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
function animate() {
// controls.update()
requestAnimationFrame(animate);
  uniforms.uTime.value = clock.getElapsedTime();
  renderer.render(scene, camera);
}
animate();
