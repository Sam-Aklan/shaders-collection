precision mediump float;

// Attributes
attribute vec3 barycentric;

// Varyings
varying vec2 vUv;
varying vec3 vBarycentric;
varying vec3 vWorldPosition;
varying vec3 vViewPosition;
varying vec3 vNormal;

void main() {

    // World position (for scan line)
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;

    // View-space position
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;

    // View-space normal
    vNormal = normalize(normalMatrix * normal);

    // Pass through
    vUv = uv;
    vBarycentric = barycentric;

    gl_Position = projectionMatrix * mvPosition;
}
