precision mediump float;

// Wireframe uniforms
uniform float uLineWidth;
uniform float uEdgeThreshold;
uniform float uCreaseThreshold;
uniform vec4  uLineColor;

uniform bool uShowSilhouette;
uniform bool uShowCrease;
uniform bool uShowBorder;

uniform float uNoiseAmount;

// Scan uniforms
uniform float time;
uniform float boundsMinY;
uniform float boundsMaxY;
uniform float scanSpeed;
uniform float scanThickness;
uniform float scanIntensity;

// Varyings
varying vec3 vBarycentric;
varying vec3 vWorldPosition;
varying vec3 vViewPosition;
varying vec3 vNormal;


// ------------------------------------------------------------
// Wireframe edge detection
// ------------------------------------------------------------
float edgeFactor(vec3 bary) {
    vec3 d = fwidth(bary);
    vec3 a3 = smoothstep(vec3(0.0), d * uLineWidth, bary);
    return min(min(a3.x, a3.y), a3.z);
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {

    // =========================================================
    // 1. Compute scanline region FIRST
    // =========================================================

    float heightRange = boundsMaxY - boundsMinY;
    float normalizedY = (vWorldPosition.y - boundsMinY) / heightRange;
    normalizedY = clamp(normalizedY, 0.0, 1.0);

    float paddedRange = 1.0 + scanThickness * 2.0;
    float scanPos = 1.0 - mod(time * scanSpeed, paddedRange);

    float d = abs(normalizedY - scanPos);

    float core = 1.0 - smoothstep(0.0, scanThickness, d);
    float glow = 1.0 - smoothstep(0.0, scanThickness * 4.0, d);

    float scanMask = max(core, glow);

    // 🔥 HARD DISCARD outside scan region
    if (scanMask <= 0.001) {
        discard;
    }

    // =========================================================
    // 2. Compute wireframe edges
    // =========================================================

    float edgeAlpha = 0.0;

    if (uShowBorder) {
        float wire = 1.0 - edgeFactor(vBarycentric);
        edgeAlpha = max(edgeAlpha, wire);
    }

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

    if (uNoiseAmount > 0.0) {
        float n = hash(gl_FragCoord.xy + time);
        edgeAlpha *= mix(1.0, n, uNoiseAmount);
    }

    // If not an edge, discard
    if (edgeAlpha <= 0.001) {
        discard;
    }

    // =========================================================
    // 3. Visibility controlled ONLY by scan
    // =========================================================

    float visibility = scanMask * scanIntensity;

    // =========================================================
    // 4. Color (uniform respected)
    // =========================================================

    vec3 color = uLineColor.rgb;

    // Optional tint inside scan
    // color = mix(color, scanColor, core);

    // gl_FragColor = vec4(color, edgeAlpha * visibility);
    float finalAlpha = edgeAlpha * visibility * uLineColor.a;
gl_FragColor = vec4(color, finalAlpha);

}
