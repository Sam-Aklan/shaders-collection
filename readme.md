# 3D Parallax Shader Effect

## How It Works

### 1. Depth Map
The shader uses a grayscale depth map where:

- **White (1.0)** = Closer to camera
- **Black (0.0)** = Farther from camera

This map tells the shader which parts of the image should appear to "pop out" more.

### 2. Parallax Calculation

```glsl
vec2 parallax = uMouse * depth * uStrength;
vec2 finalUV = uv - parallax;
Mouse position provides the view direction
```
Depth value controls displacement amount (closer = more movement)

Strength adjusts the overall intensity

UV coordinates are shifted opposite to mouse movement, creating the illusion of depth

3. Smart Image Scaling
The coverUV function ensures the image properly fills the screen regardless of aspect ratio (like CSS object-fit: cover). It:

Compares screen vs image aspect ratios

Scales UV coordinates to crop appropriately

Centers the image with proper offsets
```glsl
Visual Example
text
Original Image    Depth Map        Result
   [  🏠  ]       [  ████  ]      [  🏠➡️  ]
   [  🌳  ]   +   [  ░░░░  ]   =  [🌳  ⬅️  ]
   [  ⛰️  ]       [       ]       [  ⛰️    ]
(Closer objects shift more than distant ones)

Key Parameters
Uniform	Purpose
uImage	Main 2D image
uDepth	Grayscale depth map
uMouse	Mouse position for parallax direction
uStrength	Effect intensity
uResolution	Screen dimensions
uImageResolution	Original image dimensions
Usage Ideas
Interactive portraits - Make photos feel three-dimensional
```

Parallax backgrounds - Create depth in 2D scenes

Product showcases - Highlight product features with movement

Art installations - Add interactivity to static images

Requirements
Input image and matching depth map

Mouse/touch input for interaction

WebGL/GLSL support

Try It Yourself
Create or obtain a depth map for your image

Pass both textures to the shader

Move your mouse to see the 3D effect in action!

This shader demonstrates how simple math can create convincing 3D illusions using only 2D textures.
