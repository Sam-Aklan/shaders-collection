// https://www.shadertoy.com/view/XsXGRS

// by nikos papadopoulos, 4rknova / 2013
// Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.

#define AA 4.

#define CI vec3(.3,.5,.6)
#define CO vec3(0.0745, 0.0862, 0.1058)
#define CM vec3(.0)
#define CE vec3(.8,.7,.5)

precision mediump float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uActive;

float metaball(vec2 p, float r)
{
	return r / dot(p, p);
}

float field(vec2 uv)
{
    float t0 = sin(uTime * 1.9) * .22;
    float t1 = sin(uTime * 2.4) * .24;
    float t2 = cos(uTime * 1.4) * .26;

    return
        metaball(uv + vec2(t0, t2), .45) +
        metaball(uv - vec2(t0, t1), .38) +
        metaball(uv + vec2(t1, t2), .72);
}

vec3 samplef(in vec2 uv)
{
    float t0 = sin(uTime * 1.9) * .22;
    float t1 = sin(uTime * 2.4) * .24;
    float t2 = cos(uTime * 1.4) * .26;

vec2 p1 = vec2( t0,  t2);
vec2 p2 = vec2(-t0, -t1);
vec2 p3 = vec2( t1,  t2);

// average center
vec2 center = (p1 + p2 + p3) / 3.0;

// recenter
p1 -= center;
p2 -= center;
p3 -= center;
    
   float r =
    metaball(uv - p1, mix(.45, .15, uActive)) *
    metaball(uv - p2, mix(.38, .08, uActive)) *
    metaball(uv - p3, mix(.72, .42, uActive));

    vec3 borderColor = vec3(0.2, 0.8, 1.0);
    vec3 fillColor   = vec3(0.02, 0.03, 0.05);

// boost glow when active
float glowBoost = mix(1.0, 2.2, uActive);

    // Blob masks
    float body   = smoothstep(0.78, 0.95, r);

    float borderWidth = mix(0.14, 0.08, uActive);

float border =
    smoothstep(0.58, 0.58 + borderWidth, r) -
    smoothstep(0.72, 0.72 + borderWidth, r);

    float shadow =
        smoothstep(0.18, 0.48, r) * (1.0 - body);

 // -------------------
// SYNCED SEA-SKIN GRID
// -------------------

vec2 warp = uv;

// skin mask
float skin = smoothstep(0.42, 0.95, r);

// stronger near outer body, weaker center
float tension =
    smoothstep(0.35, 0.72, r) -
    smoothstep(0.72, 0.98, r);

// traveling waves
float w1 = sin(uv.x * 3.0 + uTime * 0.8);
float w2 = cos(uv.y * 2.6 + uTime * 0.7);
float w3 = sin((uv.x + uv.y) * 2.1 + uTime * 0.6);

// synced displacement
warp.x += (w2 + w3) * 0.022 * skin;
warp.y += (w1 + w3) * 0.022 * skin;

// extra stretch on blob necks / bulges
warp += normalize(uv + 0.0001) * tension * 0.02;

// grid
vec2 gv = warp * 5.0;

vec2 grid = abs(fract(gv - 0.5) - 0.5) / fwidth(gv);

float line = min(grid.x, grid.y);

float gridMask = 1.0 - smoothstep(0.0, 1.2, line);

gridMask *= body;

    vec3 col = vec3(0.0);

    // border
col += borderColor * border * 1.8 * glowBoost;

// shadow (outer glow)
col += borderColor * shadow * 0.55 * glowBoost;

    // Fill
    col += fillColor * body;

    // Grid
    col += borderColor * gridMask * 0.55;

    // Border
    col += borderColor * border * 1.8;

    return col;
}

void main( )
{
	vec2 uv = (gl_FragCoord.xy / uResolution.xy * 2. - 1.)
			* vec2(uResolution.x / uResolution.y, 1) * 1.25;

    vec3 col = vec3(0);

#ifdef AA
    // Antialiasing via supersampling
    float e = 1. / min(uResolution.y , uResolution.x);    
    for (float i = -AA; i < AA; ++i) {
        for (float j = -AA; j < AA; ++j) {
    		col += samplef(uv + vec2(i, j) * (e/AA)) / (4.*AA*AA);
        }
    }
#else
    col += samplef(uv);
#endif /* AA */
    
    gl_FragColor = vec4(clamp(col, 0., 1.), 1);
}