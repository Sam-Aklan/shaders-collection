// vertex.glsl
uniform sampler2D uHeightMap;
uniform float uStrength;

varying vec2 vUv;
varying float vHeight;
varying vec3 vWorldPos;

float remapHeight(float h){

    // remove dark bias
    h = smoothstep(0.03, 0.45, h);

    // mountain boost
    h = pow(h, 1.6);

    return h;
}

void main(){

    vUv = uv;

    float h = texture2D(uHeightMap, uv).r;
    h = remapHeight(h);

    vHeight = h;

    vec3 pos = position;

    pos.z += h * uStrength;

    vec4 world = modelMatrix * vec4(pos,1.0);

    vWorldPos = world.xyz;

    gl_Position = projectionMatrix * viewMatrix * world;
}
