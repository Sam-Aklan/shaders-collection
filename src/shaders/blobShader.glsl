precision highp float;

uniform vec2 uResolution;
uniform vec2 uMouse;
uniform vec2 uPrevMouse;
uniform vec2 uMouseVelocity;
uniform float uMousePressure;

uniform sampler2D uPrevTrail;
uniform float uTime;
uniform float uBlobSize;

uniform sampler2D uHeightMap;
uniform float uAspect;
uniform float uPinHover;

varying vec2 vUv;

// Simplex 2D noise
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// ===== METABALL HELPER (potential and gradient) =====
void addMetaball(vec2 p, float mass, inout float r, inout vec2 grad)
{
    float d2 = dot(p, p) + 1e-8;
    float potential = mass / d2;
    r += potential;
    grad += -2.0 * potential * p / d2;
}

vec3 blobShape(vec2 uv)
{
    // 1. Height map integration & distortion
    float h = texture2D(uHeightMap, uv).r;
    h = smoothstep(0.03, 0.45, h);
    h = pow(h, 1.6);
    
    float noise1 = snoise(uv * 15.0 + uTime * 2.0);
    float noise2 = snoise(uv * 15.0 - uTime * 2.0 + 100.0);
    vec2 distortion = vec2(noise1, noise2) * h* mix(.01,0.0001,h);

    // 2. Compute grid lines once (they don't depend on the mouse step)
    vec2 gridCoords = uv + distortion;
    gridCoords.x *= uAspect;

    vec2 distToLine = abs(fract(gridCoords * 30.0 + 0.5) - 0.5);
    vec2 pixelStep = (30.0 / uResolution) * vec2(uAspect, 1.0);
    vec2 distInPixelsGrid = distToLine / pixelStep;

    float uGridLineWidth = .1;     // Solid line width in pixels (decrease for thinner lines)
    float uGridLineFeather = .5;   // Anti-aliasing edge in pixels
    float uGridLineIntensity = .3; // Gridline brightness/opacity multiplier

    float edgeX = 1.0 - smoothstep(uGridLineWidth, uGridLineWidth + uGridLineFeather, distInPixelsGrid.x);
    float edgeY = 1.0 - smoothstep(uGridLineWidth, uGridLineWidth + uGridLineFeather, distInPixelsGrid.y);
    float gridLine = max(edgeX, edgeY);

    // 3. Draw a single metaball at the current mouse position (uMouse)
    vec2 localUV = uv - uMouse;
    localUV += distortion;
    localUV.x *= uAspect;

    float totalR = 0.0;
    vec2 totalGrad = vec2(0.0);

    vec2 vel = uMouseVelocity;
    vel.x *= uAspect;
    float speed = length(vel);
    vec2 dir = normalize(vel + 1e-5);

    float baseMass = mix(0.6, 2.2, uMousePressure);
    float mass = baseMass * uBlobSize * 0.05;
    if(uPinHover > 0.){
        mass = mix(baseMass * uBlobSize * 0.05,baseMass * uBlobSize * 0.02,uPinHover);
    }

    // Draw a single unified metaball (increased mass to maintain original size)
    addMetaball(localUV, 2.2 * mass, totalR, totalGrad);

    float phase = dot(localUV, dir * 6.0) + speed * 8.0;
    float turbulence = sin(phase) * 0.08;
    totalR += turbulence;
    totalGrad += cos(phase) * 0.08 * (dir * 6.0);

    float threshold = mix(1.25, 0.7, clamp(speed * 2.0, 0.0, 1.0));

    // Convert gradient to original UV space for isotropic distance estimation
    vec2 uvGrad = vec2(totalGrad.x * uAspect, totalGrad.y);
    float gradLen = max(length(uvGrad), 0.1); // Capped to avoid division by zero/overflow
    float distInPixels = (totalR - threshold) / gradLen * uResolution.y;

    // Smoothly transition to the exact geometric distance inside the metaball core
    // to eliminate the numerical gradient singularity artifact at the center.
    float distInPixelsExact = (sqrt(2.2 * mass / max(0.01, threshold - turbulence)) - length(localUV)) * uResolution.y;
    float insideFactor = smoothstep(threshold, threshold + 0.5, totalR);
    distInPixels = mix(distInPixels, distInPixelsExact, insideFactor);

    // Create neon border (thin and sharp, width in pixels)
    // ADJUST BORDER WIDTH HERE:
    // - borderWidthInPixels: Thickness of the sharp border in pixels (e.g. 1.0 to 3.0)
    float borderWidthInPixels = 1.0;
    float halfWidth = borderWidthInPixels * 0.5;
    // Use feather = 1.5 or larger for high-quality anti-aliasing to keep the border smooth and continuous when upscaled
    float feather = 1.5; 
    float border = smoothstep(halfWidth + feather, halfWidth - feather, abs(distInPixels));

    // Mask for gridlines (inside the blob core, transitions at the inner edge of the border)
    float inner = smoothstep(halfWidth - feather, halfWidth + feather, distInPixels);

    // ADJUST GLOW HERE:
    // - uPinHover: smoothly controls the transition when hovering over a pin.
    // The glow width and intensity expand equally on both sides (inward and outward) of the border.
    float glowWidth = mix(10.0, 12.0, uPinHover);
    float glowIntensity = mix(0.6, 1.3, uPinHover * clamp(sin(uTime *3.),0.,1.));
    
    float borderGlow = exp(-abs(distInPixels) / glowWidth) * glowIntensity;

    return vec3(border, borderGlow, gridLine * inner * uGridLineIntensity);
}

void main()
{
    vec2 frag = gl_FragCoord.xy;

    vec4 prev = texture2D(uPrevTrail, vUv);
    float pigment = prev.r;
    float wetness = prev.g;
    float borderPigment = prev.b;

    // ===== GLOW DECAY (Neon effect) =====
    float dryingRate = 0.015; // Faster decay for glowing trail
    wetness = max(prev.g - dryingRate, 0.0);
    pigment *= 0.92; // Fade out pigment
    borderPigment *= 0.92; // Fade out border pigment

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
        // Sample metaball shape components
        vec3 shapeParts = blobShape(vUv);
        float borderPart = shapeParts.x;
        float glowPart = shapeParts.y;
        float gridPart = shapeParts.z;
        
        // Velocity thinning (faster = thinner paint)
        float speedNorm = clamp(speed / 120.0, 0.0, 1.0);
        float velocityThin = mix(1.0, 0.55, speedNorm);

        // Pressure widening & wetness boost
        float pressureGain = mix(0.7, 1.8, .1);

        borderPart *= velocityThin * pressureGain;
        glowPart *= velocityThin * pressureGain;
        gridPart *= velocityThin * pressureGain;

        // Neon Energy bloom
        float bloom = smoothstep(0.1, 0.8, glowPart);
        bloom *= wetness * 0.4;

        float strokeGlow = max(max(glowPart, gridPart), bloom);

        // Deposit glow pigment (Red channel)
        pigment = max(pigment, strokeGlow);

        // Deposit border pigment (Blue channel)
        borderPigment = max(borderPigment, borderPart);

        // Deposit wetness (fluid behavior based on overall shape)
        float strokeOverall = max(borderPart, glowPart);
        float wetDeposit = strokeOverall * (1.5 + uMousePressure * 1.5);
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
    borderPigment = pow(borderPigment, 1.05);

    gl_FragColor = vec4(pigment, wetness, borderPigment, 1.0);
   
}