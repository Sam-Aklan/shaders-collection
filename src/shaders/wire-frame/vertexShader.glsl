// Vertex Shader
precision mediump float;

varying vec2 vUv;

attribute vec3 barycentric;

// Varyings
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vBarycentric;
varying vec3 vViewPosition;


void main() {
     // View-space position
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    // View direction (camera is at 0 in view space)
    vViewDir = normalize(-mvPosition.xyz);
    vViewPosition = -mvPosition.xyz;

    // Normal in view space
    vNormal = normalize(normalMatrix * normal);

    // Pass barycentric
    vBarycentric = barycentric;

    gl_Position = projectionMatrix * mvPosition;
}
