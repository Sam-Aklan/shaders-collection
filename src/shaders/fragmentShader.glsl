precision mediump float;
uniform sampler2D uColorMap;
uniform vec3 uLightDir;

varying vec2 vUv;
varying float vHeight;

void main(){

    vec3 color = texture2D(uColorMap, vUv).rgb;

    vec3 lightDir = normalize(uLightDir);

    float light = dot(normalize(vec3(0.0,0.0,1.0)), lightDir);
    light = light * 0.5 + 0.5; // increase or decrease lights

    // terrain shading
    color *= mix(0.65, 1.35, vHeight);

    // coastlines brighter
    color *= mix(1.2, 1.0, smoothstep(0.0,0.08,vHeight));

    gl_FragColor = vec4(color * light,1.0);
}
