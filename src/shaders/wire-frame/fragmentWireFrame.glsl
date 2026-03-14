// Fragment Shader

precision mediump float;

// Varyings
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vBarycentric;
varying vec3 vViewPosition;

// Uniforms
uniform float uLineWidth;          // e.g. 1.0 - 3.0
uniform float uEdgeThreshold;      // silhouette sensitivity
uniform float uCreaseThreshold;    // dot(normalA, normalB)
uniform vec4  uLineColor;          // usually black
uniform vec4  uBackgroundColor;    // white or transparent

uniform bool uShowSilhouette;
uniform bool uShowCrease;
uniform bool uShowBorder;

uniform float uNoiseAmount;        // 0.0 = clean, ~0.2 sketchy
uniform float uTime;

// ------------------------------------------------------------
// Utility: smooth wireframe from barycentric coordinates
// ------------------------------------------------------------
float edgeFactor(vec3 bary) {
    vec3 d = fwidth(bary);
    vec3 a3 = smoothstep(vec3(0.0), d * uLineWidth, bary);
    return min(min(a3.x, a3.y), a3.z);
}

// ------------------------------------------------------------
// Simple hash-based noise (cheap & stable)
// ------------------------------------------------------------
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// ------------------------------------------------------------
// Main
// ------------------------------------------------------------
void main() {

    float edgeAlpha = 0.0;

    // --------------------------------------------------------
    // 1. Border edges (triangle boundaries)
    // --------------------------------------------------------
    if (uShowBorder) {
        float wire = 1.0 - edgeFactor(vBarycentric);
        edgeAlpha = max(edgeAlpha, wire);
    }

    // --------------------------------------------------------
    // 2. Silhouette edges
    // dot(normal, viewDir) ≈ 0 at silhouette
    // --------------------------------------------------------
    if (uShowSilhouette) {
        vec3 viewDir = normalize(vViewPosition);
float ndv = abs(dot(normalize(vNormal), viewDir));


        float fw = fwidth(ndv);
        float silhouette = smoothstep(
            uEdgeThreshold + fw,
            uEdgeThreshold - fw,
            ndv
        );

        edgeAlpha = max(edgeAlpha, silhouette);
    }

    // --------------------------------------------------------
    // 3. Crease edges (approximation)
    // High normal variation across screen-space
    // --------------------------------------------------------
    if (uShowCrease) {
        vec3 dx = dFdx(vNormal);
        vec3 dy = dFdy(vNormal);

        float normalVariation = length(dx) + length(dy);

        float fw = fwidth(normalVariation);
        float crease = smoothstep(
            uCreaseThreshold + fw,
            uCreaseThreshold - fw,
            normalVariation
        );

        edgeAlpha = max(edgeAlpha, crease);
    }

    // --------------------------------------------------------
    // Hand-drawn jitter (optional)
    // --------------------------------------------------------
    if (uNoiseAmount > 0.0) {
        float n = hash(gl_FragCoord.xy + uTime);
        edgeAlpha *= mix(1.0, n, uNoiseAmount);
    }

    // --------------------------------------------------------
    // Final output
    // --------------------------------------------------------
    // float wire = 1.0 - edgeFactor(vBarycentric);
    // edgeAlpha = wire;

    if (edgeAlpha <= 0.001) {
        // Transparent background (recommended)
        discard;
        // Or use:
        // gl_FragColor = uBackgroundColor;
    }
    gl_FragColor = vec4(uLineColor.rgb, uLineColor.a * edgeAlpha);
    // gl_FragColor = vec4(vBarycentric,1.);
    // gl_FragColor = vec4(vec3(wire),1.);
    // gl_FragColor = vec4(vec3(0.),1.);

}

