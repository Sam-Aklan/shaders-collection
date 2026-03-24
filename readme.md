Here's the content formatted as a Markdown file for your GitHub README:


# Interactive Watercolor Reveal Shader

A GLSL shader implementation for Three.js that simulates an interactive watercolor painting experience. The system uses a two-pass rendering pipeline with ping-pong buffering to create persistent, organic brush strokes that reveal a hidden image.

## Overview

This shader transforms a simple mouse input into a complex fluid-like effect. It is not simply drawing a shape on the screen; it is simulating a physical surface that reacts to speed, pressure, and time.

### Key Features

- **Organic Brush Shapes**: Uses Metaball math to create fluid, merging strokes
- **Motion Streaking**: Brush shape stretches based on mouse velocity
- **Persistent Trails**: "Wet" paint stays on the screen and dries over time
- **Image Reveal**: Acts as a dynamic mask to reveal a hidden texture

## Architecture: The Two-Pass Pipeline

The shader is split into two distinct stages to separate Logic (Physics) from Presentation (Visuals).

### Pass 1: Simulation (The Logic)

**Goal**: Calculate the state of the "canvas."

- **Input**: Previous Frame's Texture, Mouse Data
- **Output**: A texture containing pigment (R) and wetness (G)

This pass handles the heavy lifting:
- **Persistence**: Reads the previous state to keep paint on the screen
- **Painting**: Adds new "paint" where the mouse currently is
- **Physics**: Calculates drying, fading, and capillary spread

### Pass 2: Render (The Visuals)

**Goal**: Translate the simulation data into pixels.

- **Input**: Texture from Pass 1, Hidden Image
- **Output**: Final color to the screen

This pass is the "lens":
- **Masking**: Uses the simulation data as an alpha mask
- **Composition**: Blends a "Ghost" layer with the actual Image layer
- **Output**: Sends premultiplied alpha to the screen

## Core Concepts

### 1. Metaballs (Organic Shapes)

Instead of drawing hard circles, we calculate a "potential field" for every pixel.

```glsl
float metaball(vec2 p, float r) {
    return r * r / dot(p, p);
}
```

- **The Logic**: We sum the potential of multiple small blobs
- **The Result**: When blobs get close, their fields overlap and merge into one seamless, liquid shape

### 2. Motion Streaking

The brush changes shape based on how fast you move the mouse.

- **Interpolation**: We draw the blob multiple times between the previous mouse position and the current one to prevent gaps
- **Velocity Offset**: We add "satellite" blobs offset in the direction of movement. Fast movement = long, stretched comet tails

### 3. Ping-Pong Buffering (Memory)

In WebGL, a shader cannot read and write to the same texture simultaneously. To create persistence (trails that stay on screen), we use two render targets (Buffers A and B).

1. **Read**: Pass 1 reads from Buffer A (the previous frame)
2. **Write**: Pass 1 writes the new state to Buffer B
3. **Swap**: In the next frame, Buffer B becomes the input, and Buffer A becomes the target

### 4. Physics Simulation

The shader simulates basic fluid properties on a 2D grid:

- **Drying**: The wetness channel decreases slightly every frame
- **Decay**: The pigment channel fades slowly (evaporation)
- **Capillary Spread**: While wet, the pigment bleeds into neighboring pixels using a simple blur convolution

## Code Breakdown

### Pass 1: The Simulation Loop

```glsl
void main() {
    // 1. FETCH HISTORY: Get the state from the last frame
    vec4 prev = texture2D(uPrevTrail, vUv);
    float pigment = prev.r;
    float wetness = prev.g;

    // 2. PHYSICS: Fade/Disappear over time
    wetness = max(wetness - 0.001, 0.0);
    pigment *= 0.965;

    // 3. PAINT: If mouse is pressed, calculate new blob shape
    if (uMousePressure > 0.01) {
        float shape = blobShape(gl_FragCoord.xy);
        pigment = max(pigment, shape);
        wetness = max(wetness, shape);
    }

    // 4. SPREAD: Bleed color into neighbors if wet
    if (wetness > 0.2) { ... }

    gl_FragColor = vec4(pigment, wetness, 0.0, 1.0);
}
```

### Pass 2: The Reveal

```glsl
void main() {
    // 1. READ MASK: Get the paint intensity
    float reveal = texture2D(uTrail, vUv).r;

    // 2. BOOST: Sharpen the edges for cleaner look
    float boostedReveal = smoothstep(0.05, 0.9, reveal);

    // 3. COMPOSITE: Mix Ghost layer and Image layer
    vec3 finalColor = mix(ghostColor, imageColor, boostedReveal);

    gl_FragColor = vec4(finalColor, finalAlpha);
}
```

## Implementation Note (Three.js)

To run this shader, you must set up a `THREE.WebGLRenderTarget` cycle in your JavaScript loop:

```javascript
// Create render targets
let rtA = new THREE.WebGLRenderTarget(width, height);
let rtB = new THREE.WebGLRenderTarget(width, height);

// Animation loop
function animate() {
    // Render Pass 1: Update simulation
    simulationMaterial.uniforms.uPrevTrail.value = rtB.texture;
    renderer.render(simulationScene, camera, rtA);
    
    // Render Pass 2: Composite final image
    renderMaterial.uniforms.uTrail.value = rtA.texture;
    renderer.render(renderScene, camera);
    
    // Swap buffers for next frame
    [rtA, rtB] = [rtB, rtA];
}
```

## License

MIT

