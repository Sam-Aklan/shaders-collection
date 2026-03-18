import * as THREE from 'three'
import './style.css';
import vertexShader from './shaders/fake-3d-image/vertexShader.glsl'
import fragmentShader from './shaders/fake-3d-image/fragmentShader.glsl'
import GUI from 'lil-gui';

const scene = new THREE.Scene();

const camera = new THREE.Camera()
camera.position.z = 1;


const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
const canvas = document.getElementById("threejs-canvas");

canvas?.appendChild(renderer.domElement);

const loader = new THREE.TextureLoader();

let width:null|number = null;
let height:null|number = null;

const racer = loader.load('./shadow-racer-2.png',(img)=>{
width = img.width;
height = img.height;
});
racer.wrapS = THREE.ClampToEdgeWrapping;
racer.wrapT = THREE.ClampToEdgeWrapping;



const depthMap = loader.load('./depth-map-2.png');
depthMap.wrapS = THREE.ClampToEdgeWrapping;
depthMap.wrapT = THREE.ClampToEdgeWrapping;

const depthMapUniforms = {
      uImage: {value:racer},
    uDepth: {value:depthMap},
    uMouse: {value:new THREE.Vector2()},
    uStrength: {value:0.02},
    uResolution: {value : new THREE.Vector2(window.innerWidth, window.innerHeight)},
    uImageResolution: {value: new THREE.Vector2(racer.width,racer.height) }
}

depthMapUniforms.uImageResolution.value.set(racer.width,racer.height)

const geometry = new THREE.PlaneGeometry(2, 2);
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader:fragmentShader,
  uniforms:depthMapUniforms
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// GUI
const gui = new GUI();
gui.add(camera.position, 'z',0,10).name('camera-z')

// Handle resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
 
  depthMapUniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
});

renderer.domElement.addEventListener("pointermove",ev=>{
  const rect = renderer.domElement.getBoundingClientRect();

  const xCoardinate = (ev.clientX - rect.left) / rect.width;
  const yCoardinate = 1.0 - (ev.clientY - rect.top) / rect.height;

  depthMapUniforms.uMouse.value.set(xCoardinate,yCoardinate);
})

let hasLoaded = false;

function animate() {
requestAnimationFrame(animate);

if(!hasLoaded && width && height){
depthMapUniforms.uImageResolution.value.set(width,height);
hasLoaded =true;
}

  renderer.render(scene, camera);
}
animate();
