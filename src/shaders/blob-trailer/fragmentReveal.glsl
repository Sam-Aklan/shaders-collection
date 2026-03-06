precision mediump float;

uniform sampler2D uTrail;    // output of PASS 1
uniform sampler2D uChannel1; // hidden image
uniform vec2 uResolution;

varying vec2 vUv;

void main() {

    float reveal = texture2D(uTrail, vUv).r;
    vec4 img = texture2D(uChannel1, vUv);

    float boostedReveal = smoothstep(0.05, 0.9, reveal);

    // IMAGE
    float imageAlpha = img.a * boostedReveal;
    vec3 imageColor = img.rgb * boostedReveal;

    // GHOST (viscous lag preserved)
    float ghostStrength = smoothstep(0.0, 0.8, reveal);
    float ghostAlpha = ghostStrength * 0.35;

    vec3 ghostColor = vec3(0.5); // darker gray

    // Composite (straight math first)
    vec3 finalColor =
        ghostColor * ghostAlpha * (1.0 - imageAlpha) +
        imageColor;

    float finalAlpha =
        ghostAlpha * (1.0 - imageAlpha) +
        imageAlpha;

    // 🔥 PREMULTIPLY HERE
    gl_FragColor = vec4(finalColor * finalAlpha, finalAlpha);
}