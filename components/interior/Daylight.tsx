"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { interiorClock } from "./clock";
import { TOONO_R, TOONO_Y } from "./kit";

// Cool daylight falling through the toono: the only shadow-casting light, a soft
// additive light shaft, and slow dust motes drifting inside it.

const TOP = new THREE.Vector3(0, TOONO_Y + 0.4, 0);
const FLOOR = new THREE.Vector3(-1.35, 0, -1.25); // where the sun pool lands
const TOP_R = TOONO_R * 0.78;
const BOT_R = 1.1;
const H = TOP.y;
const MOTES = 160;

/** Open cone from the toono to the floor pool, sheared so it slants with the sun. */
function shaftGeometry() {
  const g = new THREE.CylinderGeometry(TOP_R, BOT_R, H, 40, 8, true);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) + H / 2) / H; // 0 floor → 1 top
    p.setXYZ(i, p.getX(i) + THREE.MathUtils.lerp(FLOOR.x, TOP.x, t), THREE.MathUtils.lerp(0, H, t), p.getZ(i) + THREE.MathUtils.lerp(FLOOR.z, TOP.z, t));
  }
  g.computeVertexNormals();
  return g;
}

const shaftVert = /* glsl */ `
  varying vec3 vN; varying vec3 vV; varying float vH;
  void main(){
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    vH = position.y;
    gl_Position = projectionMatrix * mv;
  }`;
const shaftFrag = /* glsl */ `
  uniform vec3 uColor; uniform float uOpacity; uniform float uH;
  varying vec3 vN; varying vec3 vV; varying float vH;
  void main(){
    float facing = abs(dot(normalize(vN), normalize(vV)));
    float edge = pow(facing, 2.2);              // soft silhouette edges
    float h = vH / uH;
    float fade = smoothstep(0.0, 0.35, h) * (0.55 + 0.45 * h); // brighter near the crown
    gl_FragColor = vec4(uColor * edge * fade * uOpacity, 1.0);
  }`;

const moteVert = /* glsl */ `
  uniform float uTime; uniform float uScale; uniform float uH;
  uniform vec3 uTop; uniform vec3 uFloor; uniform float uTopR; uniform float uBotR;
  attribute vec3 aSeed;
  varying float vA;
  void main(){
    float h = fract(aSeed.z + uTime * (0.008 + 0.01 * aSeed.x));     // slow rise, wraps
    float y = h * uH;
    vec3 c = mix(uFloor, uTop, h);
    float r = mix(uBotR, uTopR, h) * sqrt(aSeed.y) * 0.92;
    float a = aSeed.x * 40.0 + uTime * (0.05 + 0.08 * aSeed.y);
    vec3 p = vec3(c.x + cos(a) * r, y, c.z + sin(a) * r);
    p.x += sin(uTime * 0.31 + aSeed.y * 20.0) * 0.06;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uScale * (0.6 + aSeed.x) / -mv.z;
    float tw = 0.65 + 0.35 * sin(uTime * (0.7 + aSeed.y) + aSeed.x * 30.0);
    vA = smoothstep(0.0, 0.12, h) * smoothstep(1.0, 0.8, h) * tw;
  }`;
const moteFrag = /* glsl */ `
  uniform vec3 uColor; varying float vA;
  void main(){
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor * a * a * vA, 1.0);
  }`;

export function Daylight({ narrow }: { narrow: boolean }) {
  const target = useMemo(() => new THREE.Object3D(), []);
  const shaft = useMemo(() => shaftGeometry(), []);
  const motes = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const seed = new Float32Array(MOTES * 3);
    let s = 3;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < seed.length; i++) seed[i] = rnd();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(-0.5, H / 2, 0.4), H);
    return g;
  }, []);
  const moteMat = useRef<THREE.ShaderMaterial>(null);
  const moteUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScale: { value: 34 },
      uH: { value: H },
      uTop: { value: TOP },
      uFloor: { value: FLOOR },
      uTopR: { value: TOP_R },
      uBotR: { value: BOT_R },
      uColor: { value: new THREE.Color("#fff4dc").multiplyScalar(0.9) },
    }),
    [],
  );
  const shaftUniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color("#dfe9ff") }, uOpacity: { value: 0.16 }, uH: { value: H } }),
    [],
  );

  useFrame(({ gl }) => {
    const m = moteMat.current;
    if (!m) return;
    m.uniforms.uTime.value = interiorClock.t;
    m.uniforms.uScale.value = (narrow ? 26 : 34) * gl.getPixelRatio();
  });

  const dir = TOP.clone().sub(FLOOR);
  const lightPos = FLOOR.clone().addScaledVector(dir, 1.6);
  const dist = lightPos.distanceTo(FLOOR);
  const angle = Math.atan(BOT_R / dist) * 1.15;

  return (
    <group>
      <primitive object={target} position={FLOOR.toArray()} />
      <spotLight
        position={lightPos.toArray()}
        target={target}
        angle={angle}
        penumbra={0.75}
        intensity={95}
        distance={18}
        decay={1.7}
        color="#eef3ff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-near={2}
        shadow-camera-far={14}
      />
      <mesh geometry={shaft} renderOrder={5}>
        <shaderMaterial
          vertexShader={shaftVert}
          fragmentShader={shaftFrag}
          uniforms={shaftUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      <points geometry={motes} renderOrder={6}>
        <shaderMaterial
          ref={moteMat}
          vertexShader={moteVert}
          fragmentShader={moteFrag}
          uniforms={moteUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
