precision mediump float;

uniform vec2 uResolution;
uniform vec2 uMouse;
uniform vec2 uPrevMouse;
uniform vec2 uMouseVelocity;
uniform float uMousePressure;
uniform float uIdle;

uniform sampler2D uPrevTrail;
uniform sampler2D uNoise;
uniform sampler2D uTrail;
uniform float uTime;
uniform float uBlobSize;

varying vec2 vUv;

// ===== METABALL FUNCTION (from blob shader) =====
float metaball(vec2 p, float r)
{
    return r / dot(p, p);
}

float blobShape(vec2 frag)
{
    vec2 uv = (frag / uResolution * 2.0 - 1.0);
    uv.x *= uResolution.x / uResolution.y;

   
  const int STEPS = 5;

float shape = 0.0;

for(int i = 0; i < STEPS; i++)
{
    float t = float(i) / float(STEPS - 1);

    vec2 interpMouse = mix(uPrevMouse, uMouse, t);

    vec2 mouse = interpMouse * 2.0 - 1.0;
    mouse.x *= uResolution.x / uResolution.y;

    vec2 localUV = uv - mouse;

    vec2 vel = uMouseVelocity;
    float speed = length(vel);
    vec2 dir = normalize(vel + 1e-5);

    vec2 offset1 = dir * speed * 2.5;
    vec2 offset2 = vec2(-dir.y, dir.x) * speed * 1.8;
    vec2 offset3 = -dir * speed * 2.0;
    vec2 offset4 = vec2(dir.y, -dir.x) * speed * 1.5;

    float baseMass = mix(0.6, 2.2, uMousePressure);
    float mass = baseMass * uBlobSize;

    float r = 0.0;

    r += metaball(localUV, 0.9 * mass);
    r += metaball(localUV - offset1, 0.45 * mass);
    r += metaball(localUV - offset2, 0.35 * mass);
    r += metaball(localUV - offset3, 0.4 * mass);
    r += metaball(localUV - offset4, 0.3 * mass);

    float turbulence = sin(dot(localUV, dir * 6.0) + speed * 8.0) * 0.08;
    r += turbulence;

    float threshold = mix(1.25, 0.7, clamp(speed * 2.0, 0.0, 1.0));

    float blob = smoothstep(threshold, threshold + 0.25, r);

    shape = max(shape, blob);
}

return shape;
}

void main()
{
    vec2 frag = gl_FragCoord.xy;

    vec4 prev = texture2D(uPrevTrail, vUv);
    float pigment = prev.r;
    float wetness = prev.g;

    // ===== DRYING =====
    float dryingRate = 0.001;
    wetness = max(prev.g - dryingRate, 0.0);
    pigment *= 0.965;

    // ===== MOTION =====
    vec2 mousePx = uMouse * uResolution;
vec2 prevMousePx = uPrevMouse * uResolution;

vec2 motion = mousePx - prevMousePx;

    float speed = length(motion);

    // ===== IDLE DISSOLVE (from blob shader) =====

    float dissolveSpeed = length(uMouseVelocity);
    float motionFade = smoothstep(0.002, 0.0002, dissolveSpeed);
float activeFactor = 1.0 - motionFade;

    // Only paint when blob exists (CRITICAL)
    if (uMousePressure > 0.01 || activeFactor > 0.05)
    {
        // Sample metaball shape at this fragment
        float shape = blobShape(frag);
        
        // Velocity thinning (faster = thinner paint)
        float speedNorm = clamp(speed / 120.0, 0.0, 1.0);
        float velocityThin = mix(1.0, 0.55, speedNorm);

        // Pressure widening & wetness boost
        float pressureGain = mix(0.7, 1.8, .1);

        shape *= velocityThin * pressureGain;

        // Bristle breakup texture
        float bristle = texture2D(uNoise, frag / 180.0).r;
        shape *= mix(0.65, 1.25, bristle);

        // Wet bloom (watercolor bleed)
        float noiseLarge = texture2D(uNoise, frag / 260.0).r;
        float noiseSmall = texture2D(uNoise, frag / 90.0).r;
        float cellular = noiseLarge * 0.7 + noiseSmall * 0.3;

        float bloom = smoothstep(0.2, 1.1, shape) * cellular;
        // bloom *= wetness * uMousePressure * 0.6;
        bloom *= wetness * .1 * 0.6;

        float stroke = max(shape, bloom);

        // Deposit pigment (PERMANENT MEMORY)
        pigment = max(pigment, stroke);

        // Deposit wetness (fluid behavior)
        float wetDeposit = stroke * (1.5 + uMousePressure * 1.5);
        wetness = max(wetness, wetDeposit);
    }

    // ===== CAPILLARY SPREAD (unchanged watercolor physics) =====
    if (wetness > 0.2)
    {
        vec2 px = 1.0 / uResolution;

        float spread =
            texture2D(uPrevTrail, vUv + vec2(px.x,0)).r +
            texture2D(uPrevTrail, vUv - vec2(px.x,0)).r +
            texture2D(uPrevTrail, vUv + vec2(0,px.y)).r +
            texture2D(uPrevTrail, vUv - vec2(0,px.y)).r;

        spread *= 0.25;
        pigment = mix(pigment, spread, wetness * 0.04);
    }

    pigment = pow(pigment, 1.05);

    gl_FragColor = vec4(pigment, wetness, 0.0, 1.0);
   
}