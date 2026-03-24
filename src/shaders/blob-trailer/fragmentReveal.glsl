precision mediump float;

precision mediump float;
uniform vec2 uResolution;
uniform vec2 uImageResolution;
uniform sampler2D uTrail;    // output of PASS 1
uniform sampler2D uChannel1; // hidden image
varying vec2 vUv;

vec2 coverUV(vec2 uv, vec2 screenSize, vec2 imageSize)
{
    float screenRatio = screenSize.x / screenSize.y;
    float imageRatio  = imageSize.x / imageSize.y;

    vec2 ratio = vec2(
        min(screenRatio / imageRatio, 1.0),
        min(imageRatio / screenRatio, 1.0)
    );

    return uv * ratio + (1.0 - ratio) * 0.5;
}


void main() {

   float reveal = texture2D(uTrail, vUv).r;
//    vec4 img = texture2D(uChannel1, vUv);

vec2 imgUV = coverUV(vUv, uResolution, uImageResolution);
vec4 img = texture2D(uChannel1, imgUV);

    float boostedReveal = smoothstep(0.05, .3, reveal);

    // IMAGE
    float imageAlpha = img.a * boostedReveal;
    vec3 imageColor = img.rgb * boostedReveal;

    // GHOST (viscous lag preserved)
    float ghostStrength = smoothstep(0.0, 0.8, reveal);
    float ghostAlpha = ghostStrength * 0.35;

    vec3 ghostColor = vec3(0.7); // darker gray

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