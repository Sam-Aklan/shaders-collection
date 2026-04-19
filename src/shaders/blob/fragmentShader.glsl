// https://www.shadertoy.com/view/XsXGRS

// by nikos papadopoulos, 4rknova / 2013
// Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.

#define AA 4.

#define CI vec3(.3,.5,.6)
#define CO vec3(0.0745, 0.0862, 0.1058)
#define CM vec3(.0)
#define CE vec3(.8,.7,.5)

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

    vec3 blobColor = vec3(0.02, 0.03, 0.05);
    vec3 borderColor = vec3(0.2, 0.8, 1.0);

    // Blob body
    float body = smoothstep(0.78, 0.95, r);

    // Thin border ring
    float border =
        smoothstep(0.58, 0.72, r) -
        smoothstep(0.72, 0.86, r);

    // Outer spread shadow (CSS style)
    float shadow =
        smoothstep(0.18, 0.58, r);

    shadow *= (1.0 - body);

    vec3 col = vec3(0.0);

    col += borderColor * shadow * 0.65;
    col += borderColor * border * 1.8;
    col += blobColor * body;

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