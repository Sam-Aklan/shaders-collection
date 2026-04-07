
# Wireframe Shader

A Three.js shader that creates artistic, hand-drawn style wireframes with multiple edge detection methods.

## Features

- **Border Edges** - Traditional triangle wireframes
- **Silhouette Edges** - Outer contours of 3D models  
- **Crease Edges** - Sharp folds and hard edges
- **Sketchy Effect** - Optional hand-drawn jitter animation

## How It Works

### Three Edge Detection Methods

| Method | Detection Formula | What It Finds |
|--------|------------------|----------------|
| **Border** | `min(barycentric) ≈ 0` | All triangle boundaries |
| **Silhouette** | `dot(normal, viewDir) ≈ 0` | Where surface turns away from camera |
| **Crease** | `dFdx(normal) + dFdy(normal) > threshold` | Sharp normal changes (hard edges) |

### Core Techniques

**Barycentric Coordinates** - Each vertex gets coordinates `(1,0,0)`, `(0,1,0)`, or `(0,0,1)`. When any coordinate approaches zero during interpolation, you're near a triangle edge.

**Screen-Space Derivatives** - `fwidth()` and `dFdx/dFdy` ensure consistent edge thickness regardless of distance or viewing angle.

**Anti-aliasing** - `smoothstep()` with adaptive thresholds creates clean, jagged-free lines.

## Usage

```typescript
import fragmentWireFrame from "./shaders/wire-frame/fragmentWireFrame.glsl";

// Add barycentric coordinates to your geometry
addBarycentricCoordinates(geometry);

// Create material with custom settings
const material = new THREE.ShaderMaterial({
  uniforms: {
    uLineWidth: { value: 1.5 },
    uEdgeThreshold: { value: 0.1 },
    uCreaseThreshold: { value: 0.3 },
    uLineColor: { value: new THREE.Color(0x000000) },
    uBackgroundColor: { value: new THREE.Color(0xffffff) },
    uShowSilhouette: { value: true },
    uShowCrease: { value: true },
    uShowBorder: { value: true },
    uNoiseAmount: { value: 0.1 },
    uTime: { value: 0 }
  },
  vertexShader: vertexShaderCode,
  fragmentShader: fragmentShaderCode,
  transparent: true
});
```

## Visual Examples

```
No wireframe    Border only    + Silhouette    + Crease (all)
   ███           ━━━━━━━        ━━━━━━━━━       ━━━━━━━━━
   ███           ┃   ┃          ┃     ┃         ╲     ╱
   ███           ━━━━━━━        ━━━━━━━━━       ━━━━━━━━━
  Smooth          Basic         Outlined        Stylized
                 triangles      contours        hard edges
```

## Live Demo

[Add your demo link here]

## Technical Notes

- Works with any Three.js geometry
- Real-time edge detection (no preprocessing)
- Sketchy effect uses screen-space hash noise
- Supports transparency for compositing

## License

MIT


