import * as THREE from 'three'

type sharedUniformsType = {
    uTime: {
        value: number;
    };
    uResolution: {
        value: THREE.Vector2;
    };
    uMouse: {
        value: THREE.Vector2;
    };
    uPrevMouse: {
        value: THREE.Vector2;
    };
    uMouseVelocity: {
        value: THREE.Vector2;
    };
    uMousePressure: {
        value: number;
    };
    uIdle: {
        value: number;
    };
    uActivity: {
        value: number;
    };
    uPrevTrail: {
        value: null | unknown;
    };
    uTrail: {
        value: null | unknown;
    };
    uNoise: {
        value: THREE.Texture<HTMLImageElement>;
    };
    uChannel1: {
        value: THREE.Texture<HTMLImageElement>;
    };
    uBlobSize: {
        value: number;
    };
}

export {type sharedUniformsType}