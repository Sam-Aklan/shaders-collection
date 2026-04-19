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

    float r =
        metaball(uv + vec2(t0, t2), .45) *
        metaball(uv - vec2(t0, t1), .38) *
        metaball(uv + vec2(t1, t2), .72);

    vec3 borderColor = vec3(0.2, 0.8, 1.0);
    vec3 fillColor   = vec3(0.02, 0.03, 0.05);

    // Blob masks
    float body   = smoothstep(0.78, 0.95, r);

    float border =
        smoothstep(0.58, 0.72, r) -
        smoothstep(0.72, 0.86, r);

    float shadow =
        smoothstep(0.18, 0.58, r) * (1.0 - body);

  // -------------------
// SKIN-ATTACHED GRID
// -------------------

// derive distortion from metaball field
vec2 warp = uv * (1.0 + r * 0.12);

// grid scale
vec2 gv = warp * 7.0;

// clean lines
vec2 grid = abs(fract(gv - 0.5) - 0.5) / fwidth(gv);

float line = min(grid.x, grid.y);

float gridMask = 1.0 - smoothstep(0.0, 1.5, line);

// only inside blob
gridMask *= body;

    vec3 col = vec3(0.0);

    // Shadow
    col += borderColor * shadow * 0.55;

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