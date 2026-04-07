
# Scanline Wireframe Shader

A dynamic Three.js shader that combines stylized wireframe rendering with animated scanline effects. Perfect for sci-fi UI, medical visualizations, or tech-demo aesthetics.

## Features

### Wireframe Effects
- **Border Edges** - Traditional triangle wireframes
- **Silhouette Edges** - Outer contours of 3D models  
- **Crease Edges** - Sharp folds and hard edges
- **Sketchy Effect** - Optional hand-drawn jitter animation

### Scanline Effect
- **Vertical Scanning** - Animated region that reveals the wireframe
- **Glow & Core** - Dual-layer intensity (bright center + soft falloff)
- **Hard Discard** - Geometry completely invisible outside scan region
- **Speed Control** - Adjustable scan velocity
- **Thickness Control** - Configurable scan band width

## How It Works

### Core Concept
The shader creates a **moving "window"** that reveals wireframe edges. Everything outside this window is completely discarded (invisible), creating a dramatic scanning effect.

### Scanline Math
```glsl
// Normalize Y position to [0,1] range
normalizedY = (worldPosition.y - boundsMinY) / (boundsMaxY - boundsMinY)

// Animate scan position
scanPos = 1.0 - mod(time * speed, 1.0 + thickness * 2.0)

// Calculate distance from scan center
distance = abs(normalizedY - scanPos)

// Create core (bright) + glow (soft) regions
core = 1.0 - smoothstep(0, thickness, distance)
glow = 1.0 - smoothstep(0, thickness * 4.0, distance)
```

### Edge Detection Pipeline
1. Calculate scan mask (where to show geometry)
2. **Discard everything outside scan region** (performance optimization)
3. Compute wireframe edges (border/silhouette/crease)
4. Apply sketchy noise
5. Composite with scan intensity

## Usage

```typescript
const material = new THREE.ShaderMaterial({
  uniforms: {
    // Wireframe controls
    uLineWidth: { value: 1.5 },
    uEdgeThreshold: { value: 0.1 },
    uCreaseThreshold: { value: 0.3 },
    uLineColor: { value: new THREE.Color(0x00ffff) },
    uShowSilhouette: { value: true },
    uShowCrease: { value: true },
    uShowBorder: { value: true },
    uNoiseAmount: { value: 0.05 },
    
    // Scanline controls
    time: { value: 0 },
    boundsMinY: { value: -5.0 },
    boundsMaxY: { value: 5.0 },
    scanSpeed: { value: 0.5 },
    scanThickness: { value: 0.15 },
    scanIntensity: { value: 1.0 }
  },
  transparent: true
});

// Animate
function animate() {
  material.uniforms.time.value += 0.016; // Delta time
  requestAnimationFrame(animate);
}
```

## Parameters

| Uniform | Description | Range |
|---------|-------------|-------|
| `scanSpeed` | How fast scan moves | 0.2 - 2.0 |
| `scanThickness` | Width of scan band | 0.05 - 0.3 |
| `scanIntensity` | Scan line brightness | 0.0 - 1.5 |
| `boundsMinY` | Bottom of scan range | world units |
| `boundsMaxY` | Top of scan range | world units |

## Visual Examples

```
No scan      Active scan        Glow effect
███████      ████               ████▓▓▓
███████      ████▓              ████▓▓▓
███████      ████▓▓             ████▓▓▓
███████      ████               ████▓▓▓
Uniform       Moving band        + soft glow
```

## Use Cases

- **Medical CT/MRI visualization** - Simulate scanning effect
- **Sci-fi interfaces** - Holographic data scans
- **Product showcases** - Reveal internal structures
- **Tech demos** - Animated wireframe presentations
- **Debug visualization** - Isolate geometry regions

## Performance Notes

- Early `discard` outside scan region saves GPU work
- Edge detection uses screen-space derivatives (fast)
- No geometry preprocessing required

## License

MIT
