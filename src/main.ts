import './style.css'
import * as THREE from 'three'
import { GUI } from 'lil-gui';

import vertexShader from './shaders/vertexShader.glsl';
import fragmentCircleShader from './shaders/fragmentShader.glsl';

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
  uCamera: {value: 2},
};


const geometry = new THREE.PlaneGeometry(2, 2);
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader:fragmentCircleShader,
  uniforms:uniforms
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// GUI
const gui = new GUI();
gui.add(uniforms.uTime, 'value', 0, 10).name('Time');
gui.add(camera.position, 'z',0,10).name('camera-z')

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
