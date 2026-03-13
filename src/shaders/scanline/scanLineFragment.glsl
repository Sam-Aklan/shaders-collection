precision mediump float;

uniform float time;
uniform sampler2D map;

uniform float boundsMinY;
uniform float boundsMaxY;

uniform float scanSpeed;
uniform float scanThickness;
uniform float scanIntensity;
uniform float distortionStrength;

uniform vec3 scanColor;

varying vec3 vWorldPosition;
varying vec2 vUv;

void main() {

    float heightRange = boundsMaxY - boundsMinY;
float normalizedY = (vWorldPosition.y - boundsMinY) / heightRange;
normalizedY = clamp(normalizedY, 0.0, 1.0);

float paddedRange = 1.0 + scanThickness * 2.0;
float scanPos = 1.0 - mod(time * scanSpeed, paddedRange);

float d = abs(normalizedY - scanPos);

float core = 1.0 - smoothstep(0.0, scanThickness, d);
float glow = 1.0 - smoothstep(0.0, scanThickness * 4.0, d);

vec2 distortedUv = vUv;
distortedUv.x += glow * distortionStrength;

vec4 color = texture2D(map, distortedUv);

color.rgb += scanColor * core * scanIntensity;
color.rgb += scanColor * glow * scanIntensity * 0.3;

gl_FragColor = color;

}
