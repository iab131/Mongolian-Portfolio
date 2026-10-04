"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export const HORIZON = "#cfe0ea";
const ZENITH = "#1f5fc4";

// Möngkh Khökh Tengri: keep the blue deep. Follows the camera so it never clips.
const vertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const fragment = /* glsl */ `
  uniform vec3 uHorizon;
  uniform vec3 uZenith;
  uniform vec3 uSunDir;
  varying vec3 vDir;
  void main() {
    float h = max(vDir.y, 0.0);
    vec3 col = mix(uHorizon, uZenith, pow(h, 0.55));
    float sun = max(dot(normalize(vDir), uSunDir), 0.0);
    col += vec3(1.0, 0.92, 0.75) * (smoothstep(0.9975, 0.999, sun) + pow(sun, 64.0) * 0.35);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export function SkyDome() {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => mesh.current?.position.copy(camera.position));
  return (
    <mesh ref={mesh} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[400, 32, 16]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={{
          uHorizon: { value: new THREE.Color(HORIZON) },
          uZenith: { value: new THREE.Color(ZENITH) },
          uSunDir: { value: new THREE.Vector3(30, 50, 18).normalize() },
        }}
      />
    </mesh>
  );
}
