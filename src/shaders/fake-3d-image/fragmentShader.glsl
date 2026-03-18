uniform sampler2D uImage;
  uniform sampler2D uDepth;
  uniform vec2 uMouse;
  uniform float uStrength;
  uniform vec2 uResolution;
  uniform vec2 uImageResolution;
  varying vec2 vUv;

  vec2 coverUV(vec2 uv, vec2 screenSize, vec2 imageSize){

  float screenRatio = screenSize.x / screenSize.y;
  float imageRatio = imageSize.x / imageSize.y;

  vec2 newUV = uv;

  if(screenRatio < imageRatio){
      float scale = screenRatio / imageRatio;
      newUV.x = uv.x * scale + (1.0 - scale) * 0.5;
  }else{
      float scale = imageRatio / screenRatio;
      newUV.y = uv.y * scale + (1.0 - scale) * 0.5;
  }

  return newUV;
}

  void main() {

    vec2 uv = coverUV(vUv, uResolution, uImageResolution);

float depth = texture2D(uDepth, uv).r;

     vec2 parallax = uMouse * depth * uStrength;

vec2 finalUV = uv - parallax;

gl_FragColor = texture2D(uImage, finalUV);
  }