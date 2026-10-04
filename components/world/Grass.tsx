"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { riderPose } from "@/lib/rider";
import { useStore } from "@/lib/store";
import { TERRAIN_GLSL } from "@/lib/terrain";

// Instanced grass blades in a patch that travels with the horse. Blades are world-anchored
// (lattice offsets wrapped around the patch centre), placed on the GLSL twin of heightAt,
// thinned on tracks and around gers, bent by wind and pushed aside by the horse.

const PATCH = 84; // patch width in world units

const vertex = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  ${TERRAIN_GLSL}
  attribute vec2 aOffset;
  attribute vec4 aRand;
  uniform vec2 uCenter;
  uniform vec2 uPlayer;
  uniform float uTime;
  uniform float uPatch;
  varying float vY;
  varying vec3 vTint;
  varying float vFlower;

  float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

  void main() {
    vec2 rel = mod(aOffset - uCenter + uPatch * 0.5, uPatch) - uPatch * 0.5;
    vec2 wp = uCenter + rel;

    // Density / height masks
    float edge = 1.0 - smoothstep(uPatch * 0.36, uPatch * 0.5, length(rel));
    float track = smoothstep(0.5, 1.7, tTrack(wp));
    float clear = tClear(wp);
    float clump = 0.55 + 0.45 * sin(wp.x * 0.21 + sin(wp.y * 0.17) * 2.0) * cos(wp.y * 0.13);
    float trample = smoothstep(1.2, 3.5, length(wp - uPlayer));
    float h = (0.2 + aRand.y * 0.34) * (0.55 + 0.6 * clump) * edge * mix(0.08, 1.0, track) * clear * mix(0.35, 1.0, trample);
    float flower = step(0.965, aRand.w) * step(0.25, h);
    vFlower = flower;

    // Blade frame
    float ang = aRand.x * 6.2831;
    vec3 p = position;
    p.x *= (0.07 + aRand.z * 0.05) * (1.0 + flower * 0.6);
    p.y *= h * (1.0 - flower * 0.35);
    float c = cos(ang), s = sin(ang);
    p = vec3(p.x * c, p.y, p.x * s);

    // Wind + lean + horse push (stronger towards the tip)
    float tip = position.y * position.y;
    float gust = sin(uTime * 0.6 + wp.x * 0.02) * 0.5 + 0.5;
    float wave = sin(uTime * 1.9 + wp.x * 0.23 + wp.y * 0.11) * 0.5 + 0.5;
    vec2 wind = vec2(0.9, 0.35) * (0.08 + 0.22 * wave * (0.5 + gust));
    vec2 away = wp - uPlayer;
    float d = length(away);
    vec2 push = d < 1.8 ? normalize(away + 1e-4) * (1.8 - d) * 0.45 : vec2(0.0);
    p.xz += (wind + push + (aRand.zy - 0.5) * 0.12) * tip * max(h, 0.2) * 1.6;

    vec3 world = vec3(wp.x, tHeight(wp) - 0.02, wp.y) + p;
    vY = position.y;
    // Patchwork of greener and golder tufts
    float dry = 0.5 + 0.5 * sin(wp.x * 0.07 + 1.7) * sin(wp.y * 0.09 - 0.4);
    vTint = mix(vec3(0.30, 0.46, 0.12), vec3(0.66, 0.58, 0.22), dry * 0.8) * (0.85 + aRand.z * 0.3);
    vec4 mvPosition = viewMatrix * vec4(world, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragment = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform vec3 uSun;
  uniform vec3 uSky;
  varying float vY;
  varying vec3 vTint;
  varying float vFlower;
  void main() {
    vec3 base = vTint * 0.38;
    vec3 col = mix(base, vTint, smoothstep(0.0, 1.0, vY));
    // Flowers: steppe edelweiss/yellow/purple dots on the tips
    if (vFlower > 0.5 && vY > 0.72) col = mix(vec3(0.98, 0.86, 0.28), vec3(0.93, 0.92, 0.88), step(0.5, fract(vTint.r * 37.0)));
    col *= uSky * 0.45 + uSun * (0.3 + 0.45 * vY);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

function bladeGeometry() {
  // Tapered blade, 3 tris, height 1 (scaled per instance), width 1 (scaled).
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, -0.3, 0.55, 0, 0.3, 0.55, 0, 0, 1, 0], 3),
  );
  g.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4]);
  return g;
}

export function Grass({ count }: { count: number }) {
  const { mesh, uniforms } = useMemo(() => {
    const base = bladeGeometry();
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute("position", base.attributes.position);
    const offsets = new Float32Array(count * 2);
    const rand = new Float32Array(count * 4);
    // Jittered grid so coverage is even.
    const side = Math.ceil(Math.sqrt(count));
    const cell = PATCH / side;
    let seed = 1337;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < count; i++) {
      const gx = i % side;
      const gz = Math.floor(i / side);
      offsets[i * 2] = (gx + rnd()) * cell;
      offsets[i * 2 + 1] = (gz + rnd()) * cell;
      rand.set([rnd(), rnd(), rnd(), rnd()], i * 4);
    }
    geo.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offsets, 2));
    geo.setAttribute("aRand", new THREE.InstancedBufferAttribute(rand, 4));
    geo.instanceCount = count;

    const uniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uCenter: { value: new THREE.Vector2() },
        uPlayer: { value: new THREE.Vector2() },
        uTime: { value: 0 },
        uPatch: { value: PATCH },
        uSun: { value: new THREE.Color("#ffe6c4") },
        uSky: { value: new THREE.Color("#b9d2f2") },
      },
    ]);
    const mat = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms, fog: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    return { mesh, uniforms };
  }, [count]);

  useFrame(({ camera }, dt) => {
    if (!useStore.getState().paused) uniforms.uTime.value += dt;
    // Centre the patch a little ahead of the camera so the visible field is covered.
    const dir = camera.getWorldDirection(tmp);
    uniforms.uCenter.value.set(camera.position.x + dir.x * PATCH * 0.3, camera.position.z + dir.z * PATCH * 0.3);
    uniforms.uPlayer.value.set(riderPose.x, riderPose.z);
  });

  return <primitive object={mesh} />;
}

const tmp = new THREE.Vector3();
