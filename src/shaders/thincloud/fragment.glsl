precision mediump float;

// Uniforms
uniform float uTime;             // Time in seconds for animation
uniform vec2 uWindDirection;     // 2D vector defining the direction of wind/drift
uniform float uWindSpeed;        // Speed of the cloud drift
uniform float uCloudScale;       // Base frequency of the cloud noise
uniform float uCloudOpacity;     // Maximum opacity of the clouds (faintness control)
uniform float uCloudCutoff;      // Threshold for cloud formation (higher = fewer clouds)
uniform float uCloudFeather;     // Softness of cloud boundaries
uniform float uHazeAmount;       // Base level of constant atmospheric haze
uniform float uCloudStretch;     // Elongation of clouds along wind direction (1.0 = isotropic/random)
uniform float uCloudCoverage;    // Macro cloud coverage / patchiness (0.0 to 1.0)
uniform float uCurlStrength;     // Intensity of the swirling vortex/wrap effect

varying vec2 vUv;

// A standard high-quality pseudo-random 2D hash
float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

// 2D Value Noise with quintic interpolation for smooth gradients
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    
    // Quintic curve: 6t^5 - 15t^4 + 10t^3
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    
    return mix(mix(hash(i + vec2(0.0, 0.0)), 
                   hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), 
                   hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

// Rotated 5-octave FBM to prevent axis-aligned grid patterns
const mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p * frequency);
        p = rot * p;
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

// Lightweight potential field for curl noise (generates large-scale vortices)
float potential(vec2 p) {
    // Evolve the potential field slowly over time to morph the vortex centers
    return noise(p + vec2(uTime * 0.05));
}

// 2D Curl Noise: computes a divergence-free velocity field from the potential
vec2 curl(vec2 p) {
    float eps = 0.1;
    vec2 dx = vec2(eps, 0.0);
    vec2 dy = vec2(0.0, eps);
    
    float p_y_up   = potential(p + dy);
    float p_y_down = potential(p - dy);
    float p_x_up   = potential(p + dx);
    float p_x_down = potential(p - dx);
    
    // Velocity = (d_potential/dy, -d_potential/dx)
    return vec2(p_y_up - p_y_down, p_x_down - p_x_up) / (2.0 * eps);
}

void main() {
    // 1. Establish coordinate space with wind movement
    vec2 windDir = normalize(uWindDirection);
    vec2 movingUv = vUv - windDir * uTime * uWindSpeed;
    
    // 2. Compute Curl Noise velocity field for local wrapping/swirling
    // Scaling the coordinates determines the size of the swirling vortices
    vec2 curlCoord = movingUv * uCloudScale * 0.2;
    vec2 velocity = curl(curlCoord);
    
    // Warp the coordinates along the curl streamlines (swirl intensity)
    vec2 warpedMovingUv = movingUv + velocity * uCurlStrength * 0.1;
    
    // 3. Low-frequency FBM for macro-scale "patchiness" (random shapes/groupings)
    // We warp the mask coordinates for highly organic, non-linear cloud bank edges
    vec2 maskUv = warpedMovingUv * uCloudScale * 0.25;
    vec2 maskWarp = vec2(
        fbm(maskUv + vec2(0.0, 0.0)),
        fbm(maskUv + vec2(4.1, 2.8))
    );
    float maskNoise = fbm(maskUv + maskWarp * 1.2);
    
    // The mask determines where clouds are allowed to form (0.0 to 1.0)
    float cloudMask = smoothstep(1.0 - uCloudCoverage, 1.3 - uCloudCoverage, maskNoise);
    
    // 4. Project coordinates for high-frequency cloud detail (directional stretching)
    vec2 perpDir = vec2(-windDir.y, windDir.x);
    float windProj = dot(warpedMovingUv, windDir);
    float perpProj = dot(warpedMovingUv, perpDir);
    
    // Use the uCloudStretch parameter to control the cloud streakiness
    vec2 stretchedUv = vec2(windProj / uCloudStretch, perpProj) * uCloudScale;
    
    // 5. Domain warping for micro-scale wind shear turbulence/wisps
    vec2 warpOffset = vec2(
        fbm(stretchedUv + vec2(0.0, 0.0) + uTime * uWindSpeed * 0.1),
        fbm(stretchedUv + vec2(5.2, 1.3) - uTime * uWindSpeed * 0.05)
    );
    
    // Apply warp to final coordinates
    vec2 finalUv = stretchedUv + warpOffset * 1.5;
    
    // 6. Calculate local detailed cloud density
    float cloudNoise = fbm(finalUv);
    
    // Remap noise using smoothstep for wispy, fading boundaries
    float edgeStart = uCloudCutoff;
    float edgeEnd = uCloudCutoff + uCloudFeather;
    float localDensity = smoothstep(edgeStart, edgeEnd, cloudNoise);
    
    // 7. Combine detailed noise with the macro-patchiness mask
    float cloudDensity = localDensity * cloudMask;
    
    // 8. Add a base level of atmospheric haze (also modulated slightly by the mask for natural look)
    float finalDensity = max(cloudDensity, uHazeAmount * cloudMask * (1.0 - cloudDensity));
    finalDensity = max(finalDensity, uHazeAmount * 0.1); // Constant global minimum atmospheric haze
    
    // Apply maximum opacity scaling
    float alpha = finalDensity * uCloudOpacity;
    
    // White clouds / haze
    vec3 cloudColor = vec3(1.0, 1.0, 1.0);
    
    gl_FragColor = vec4(cloudColor, alpha);
}
