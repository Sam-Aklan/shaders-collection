# 3D World-Space Scanline Shader

## Overview

This shader creates a realistic scanline effect that moves through 3D world space, affecting objects based on their actual world position rather than screen position. Unlike traditional 2D scanline effects that simply scroll across your monitor, this effect respects 3D perspective, geometry, and world-space synchronization.

## Core Concept: 2D vs 3D Scanline

### Traditional 2D Approach
- Scanline moves in **screen space** (pixel coordinates)
- Effect is independent of 3D geometry
- All objects on screen get scanned at the same screen Y position
- No perspective or depth perception

### Our 3D World-Space Approach
- Scanline moves through **actual world space**
- Effect respects object positions, heights, and distances
- Objects at the same world Y position get scanned simultaneously
- Perspective creates natural speed variation with distance

## Technical Breakdown

### 1. World Position Transformation

```glsl
vec4 worldPos = modelMatrix * vec4(position, 1.0);
vWorldPosition = worldPos.xyz;
```

**Purpose:** Pass actual 3D world coordinates to the fragment shader
- `position` - Local vertex coordinates within the object
- `modelMatrix` - Transformation that places the object in the world
- Result: Every fragment knows its exact position in the 3D scene

**Why This Matters:**
- Makes scanline consistent across all objects
- Enables world-space distance calculations
- Creates physically-plausible scanning behavior

### 2. Normalization Within Bounds

```glsl
float heightRange = boundsMaxY - boundsMinY;
float normalizedY = (vWorldPosition.y - boundsMinY) / heightRange;
normalizedY = clamp(normalizedY, 0.0, 1.0);
```

**Purpose:** Convert arbitrary world Y positions to a 0-1 range
- `boundsMinY` and `boundsMaxY` define the scanning volume
- Objects of any height work with the same scanline logic
- Clamping ensures objects outside bounds don't get false effects

### 3. Scanline Position in World Space

```glsl
float paddedRange = 1.0 + scanThickness * 2.0;
float scanPos = 1.0 - mod(time * scanSpeed, paddedRange);
```

**Purpose:** Create a looping scanline that moves through world space
- `paddedRange` ensures the scanline fully exits before reappearing
- `mod()` creates the looping behavior
- `1.0 -` makes the scanline move from top to bottom

### 4. World-Space Distance Calculation

```glsl
float d = abs(normalizedY - scanPos);
```

**The Critical Difference:** Distance is measured in **normalized world space**, not screen space
- Objects at the same world height get scanned simultaneously
- Distance from camera affects apparent speed (perspective)
- Creates cohesive, synchronized effect across all objects

### 5. Realistic Falloff with Smoothstep

```glsl
float core = 1.0 - smoothstep(0.0, scanThickness, d);
float glow = 1.0 - smoothstep(0.0, scanThickness * 4.0, d);
```

**Why Smoothstep:**
- Creates smooth, natural brightness falloff
- Separates core (bright, narrow) from glow (subtle, wide)
- More controllable than power functions
- Looks natural from all angles and distances

### 6. Texture Distortion

```glsl
vec2 distortedUv = vUv;
distortedUv.x += glow * distortionStrength;
```

**Purpose:** Simulate CRT bending/warping effect
- Distortion follows the scanline intensity (glow)
- Affects texture mapping, not screen space
- Respects object geometry and UV mapping

### 7. Color Composition

```glsl
color.rgb += scanColor * core * scanIntensity;
color.rgb += scanColor * glow * scanIntensity * 0.3;
```

**Purpose:** Add scanline color with proper intensity
- Core gets full intensity
- Glow gets 30% intensity for subtle falloff
- Configurable color for different scanline looks

## Visual Characteristics

### Perspective Effects
- **Close objects:** Scanline appears to move quickly across surface
- **Distant objects:** Scanline appears to crawl slowly
- **Reason:** World-space scanline moves at constant world speed, but closer objects occupy more screen space

### Synchronization
- All objects at same world height get scanned at the exact same moment
- Creates cohesive, physically-plausible effect
- Perfect for scenes with multiple objects at various distances

### Height Adaptability
- Objects of different heights automatically work
- Scanline properly covers the entire height range of each object
- Can set different bounds per object or use global bounds

## Key Parameters

| Parameter | Purpose | Typical Range |
|-----------|---------|---------------|
| `scanSpeed` | How fast scanline moves | 0.5 - 2.0 |
| `scanThickness` | Width of scanline core | 0.02 - 0.1 |
| `scanIntensity` | Brightness of scanline | 0.5 - 1.5 |
| `distortionStrength` | Amount of texture warp | 0.01 - 0.05 |
| `scanColor` | RGB color of scanline | Varies by effect |

## Applications

- **Retro game aesthetics** - Create CRT monitor effects
- **Sci-fi scanning effects** - Simulate sensors or scanners
- **UI elements** - Moving highlights in 3D menus
- **Atmospheric effects** - Add visual interest to scenes

## Comparison Summary

| Aspect | 2D Screen-Space | 3D World-Space |
|--------|-----------------|----------------|
| **Space** | Screen coordinates | World coordinates |
| **Movement** | Moves on monitor | Moves through 3D space |
| **Perspective** | No effect | Apparent speed varies with distance |
| **Synchronization** | Screen-based | World-based |
| **Geometry** | No relation | Respects object positions |
| **Distortion** | Screen-space warp | UV-space warp |

## Why This Matters

This shader demonstrates a fundamental principle in 3D graphics: **attaching effects to actual world space** rather than screen space creates more immersive, physically-plausible visuals. By understanding this approach, you can apply similar thinking to other effects like:

- World-space glows
- Volumetric lighting
- Position-based particle effects
- Global environment interactions

## Credits

This implementation builds on concepts from CRT monitor emulation and applies them to modern 3D rendering techniques, creating a unique hybrid effect that combines retro aesthetics with 3D spatial awareness.

it is inspired by this shader on shadertoy
https://www.shadertoy.com/view/MdXcR7


