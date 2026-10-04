"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { forwardRef, useImperativeHandle, useMemo } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";

// Pooled soft-sprite particles (one draw call per pool). Used for hoof dust and chimney smoke.

const vertex = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  attribute float aAlpha;
  attribute float aSize;
  uniform float uScale;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / max(-mvPosition.z, 0.1);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;
const fragment = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.05, d) * vAlpha;
    if (a < 0.01) discard;
    // a touch of fake lighting: brighter on top
    vec3 col = uColor * (0.85 + 0.3 * (0.5 - c.y));
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export type ParticleOpts = {
  life: number;
  size0: number;
  size1: number;
  alpha: number;
  drag?: number;
  rise?: number;
};

export type ParticlesHandle = {
  emit: (x: number, y: number, z: number, vx: number, vy: number, vz: number) => void;
};

export const Particles = forwardRef<ParticlesHandle, { max: number; color: string } & ParticleOpts>(function Particles(
  { max, color, life, size0, size1, alpha, drag = 1.5, rise = 0 },
  ref,
) {
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);

  const sim = useMemo(() => {
    const pos = new Float32Array(max * 3);
    const vel = new Float32Array(max * 3);
    const age = new Float32Array(max).fill(Infinity);
    const alphaA = new Float32Array(max);
    const sizeA = new Float32Array(max);
    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
    const alphaAttr = new THREE.BufferAttribute(alphaA, 1).setUsage(THREE.DynamicDrawUsage);
    const sizeAttr = new THREE.BufferAttribute(sizeA, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", posAttr);
    geo.setAttribute("aAlpha", alphaAttr);
    geo.setAttribute("aSize", sizeAttr);
    const uniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      { uColor: { value: new THREE.Color(color) }, uScale: { value: 400 } },
    ]);
    const mat = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms,
      transparent: true,
      depthWrite: false,
      fog: true,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    return { pos, vel, age, alphaA, sizeA, posAttr, alphaAttr, sizeAttr, uniforms, points, next: 0 };
  }, [max, color]);

  useImperativeHandle(
    ref,
    () => ({
      emit(x, y, z, vx, vy, vz) {
        const i = sim.next;
        sim.next = (sim.next + 1) % max;
        sim.pos.set([x, y, z], i * 3);
        sim.vel.set([vx, vy, vz], i * 3);
        sim.age[i] = 0;
      },
    }),
    [sim, max],
  );

  useFrame((_, rawDt) => {
    const dt = useStore.getState().paused ? 0 : Math.min(rawDt, 0.05);
    sim.uniforms.uScale.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    const k = Math.exp(-drag * dt);
    for (let i = 0; i < max; i++) {
      const a = sim.age[i];
      if (a > life) {
        sim.alphaA[i] = 0;
        continue;
      }
      const na = a + dt;
      sim.age[i] = na;
      const t = na / life;
      sim.vel[i * 3] *= k;
      sim.vel[i * 3 + 1] = sim.vel[i * 3 + 1] * k + rise * dt;
      sim.vel[i * 3 + 2] *= k;
      sim.pos[i * 3] += sim.vel[i * 3] * dt;
      sim.pos[i * 3 + 1] += sim.vel[i * 3 + 1] * dt;
      sim.pos[i * 3 + 2] += sim.vel[i * 3 + 2] * dt;
      sim.sizeA[i] = size0 + (size1 - size0) * Math.sqrt(t);
      sim.alphaA[i] = alpha * Math.min(1, t * 6) * (1 - t) * (1 - t);
    }
    sim.posAttr.needsUpdate = true;
    sim.alphaAttr.needsUpdate = true;
    sim.sizeAttr.needsUpdate = true;
  });

  return <primitive object={sim.points} />;
});
