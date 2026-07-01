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
uniform float uCloudCoverage;    // Controls size/scale of the 5 clouds (0.0 to 1.0)
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

// Rotated 5-octave FBM for base potential field
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

// Rotated 3-octave FBM for optimized local cloud details
float fbm3(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 3; i++) {
        value += amplitude * noise(p * frequency);
        p = rot * p;
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

// Lightweight potential field for curl noise (generates large-scale vortices)
float potential(vec2 p) {
    // Evolve the potential field based on uWindSpeed * time for morphing speed
    return noise(p + vec2(uTime * uWindSpeed * 2.0));
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
    
    return vec2(p_y_up - p_y_down, p_x_down - p_x_up) / (2.0 * eps);
}

void main() {
    // 1. Establish coordinate space (stationary, no global wind translation/drift)
    vec2 windDir = normalize(uWindDirection);
    vec2 movingUv = vUv;
    
    // 2. Compute Curl Noise velocity field for local wrapping/swirling
    vec2 curlCoord = movingUv * uCloudScale * 0.15;
    vec2 velocity = curl(curlCoord);
    
    // Warp the coordinate space along curl streamlines
    vec2 warpedMovingUv = movingUv + velocity * uCurlStrength * 0.1;
    
    // 3. Define 5 dynamic cloud centers that wiggle subtly (controlled by uWindSpeed)
    vec2 C[5];
    C[0] = vec2(0.25, 0.35) + vec2(cos(uTime * uWindSpeed * 2.0), sin(uTime * uWindSpeed * 1.5)) * 0.03;
    C[1] = vec2(0.75, 0.25) + vec2(sin(uTime * uWindSpeed * 2.5), cos(uTime * uWindSpeed * 1.0)) * 0.03;
    C[2] = vec2(0.50, 0.55) + vec2(cos(uTime * uWindSpeed * 1.0), sin(uTime * uWindSpeed * 2.0)) * 0.02;
    C[3] = vec2(0.30, 0.75) + vec2(sin(uTime * uWindSpeed * 1.5), cos(uTime * uWindSpeed * 2.5)) * 0.03;
    C[4] = vec2(0.80, 0.70) + vec2(cos(uTime * uWindSpeed * 2.5), sin(uTime * uWindSpeed * 3.0)) * 0.03;
    
    // Cloud size factor governed by uCloudCoverage slider
    float cloudSize = 0.25 * uCloudCoverage;
    
    float totalDensity = 0.0;
    vec2 perpDir = vec2(-windDir.y, windDir.x);
    
    // 4. Calculate density for each of the 5 clouds with seamless wrapping
    for (int i = 0; i < 5; i++) {
        // Calculate shortest difference vector on a toroidal grid (0.0 to 1.0 wrapping)
        vec2 diff = fract(warpedMovingUv - C[i] + 0.5) - 0.5;
        float dist = length(diff);
        
        // Soft circular mask for this cloud instance
        float mask = smoothstep(cloudSize, cloudSize * 0.2, dist);
        
        if (mask > 0.0) {
            // Project diff coordinates to support stretch controls
            float windProj = dot(diff, windDir);
            float perpProj = dot(diff, perpDir);
            vec2 stretchedUv = vec2(windProj / uCloudStretch, perpProj) * uCloudScale;
            
            // Micro-scale domain warping inside the cloud (morphs over time)
            vec2 detailWarp = vec2(
                fbm3(stretchedUv + vec2(0.0, 0.0) + uTime * uWindSpeed * 2.5),
                fbm3(stretchedUv + vec2(3.1, 7.4) - uTime * uWindSpeed * 1.5)
            );
            
            // FBM detailed noise
            float n = fbm3(stretchedUv + detailWarp * 1.5);
            
            // Density curve
            float d = mask * smoothstep(uCloudCutoff, uCloudCutoff + uCloudFeather, n);
            totalDensity = max(totalDensity, d);
        }
    }
    
    // 5. Add a base level of atmospheric haze (also wrapping-aware)
    float finalDensity = max(totalDensity, uHazeAmount * 0.1);
    
    // Apply maximum opacity scaling
    float alpha = finalDensity * uCloudOpacity;
    
    // White clouds / haze
    vec3 cloudColor = vec3(1.0, 1.0, 1.0);
    
    gl_FragColor = vec4(cloudColor, alpha);
}
