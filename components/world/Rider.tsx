"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { readRide } from "@/lib/input";
import { ENTER_RANGE, GER_SITES, OVOO, WORLD_RADIUS } from "@/lib/layout";
import { riderPose } from "@/lib/rider";
import { isUiBlocking, useStore } from "@/lib/store";
import { heightAt } from "@/lib/terrain";
import { contactTexture } from "@/lib/worldMaterials";
import { Horse, type HorseHandle } from "./Horse";
import { Particles, type ParticlesHandle } from "./Particles";
import { PROP_COLLIDERS } from "./Props";

// Kinematic horse: no physics engine. Heavy, smoothed acceleration and turning.
const TROT = 8;
const GALLOP = 17;
const REVERSE = -2.5;
const ACCEL = 1.4;
const BRAKE = 2.6;
const HORSE_RADIUS = 1.3;
const COLLIDERS = [...GER_SITES, OVOO, ...PROP_COLLIDERS];
const want = new THREE.Vector3();
const lookWant = new THREE.Vector3();

const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt);

export function Rider({ shadows }: { shadows: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const group = useRef<THREE.Group>(null);
  const pitchGroup = useRef<THREE.Group>(null);
  const horse = useRef<HorseHandle>(null);
  const dust = useRef<ParticlesHandle>(null);
  const blob = useRef<THREE.Mesh>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const spawnVersion = useStore((s) => s.spawnVersion);

  const st = useRef({
    pos: new THREE.Vector3(),
    yaw: 0,
    yawVel: 0,
    speed: 0,
    cruise: 0,
    pitch: 0,
    roll: 0,
    snap: true,
    look: new THREE.Vector3(),
    fov: 55,
    t: 0,
  });

  useEffect(() => {
    const { spawn } = useStore.getState();
    const s = st.current;
    s.pos.set(spawn.x, heightAt(spawn.x, spawn.z), spawn.z);
    s.yaw = spawn.yaw;
    s.speed = spawn.speed ?? 0;
    s.cruise = spawn.speed ?? 0; // QA can start the horse cruising; any input takes over
    s.yawVel = 0;
    s.snap = true;
  }, [spawnVersion]);

  useFrame((_, rawDt) => {
    const paused = useStore.getState().paused;
    const dt = paused ? 0 : Math.min(rawDt, 0.05);
    const s = st.current;
    s.t += dt;
    const input = isUiBlocking() ? { throttle: 0, steer: 0, gallop: false } : readRide();
    if (input.throttle !== 0) s.cruise = 0;

    // Speed: trot by default, gallop with Shift. Heavy acceleration, firmer braking.
    let target = input.throttle > 0 ? (input.gallop ? GALLOP : TROT) : input.throttle < 0 ? REVERSE : 0;
    if (input.throttle === 0 && s.cruise) target = s.cruise;
    const k = Math.abs(target) > Math.abs(s.speed) ? ACCEL : BRAKE;
    s.speed += (target - s.speed) * damp(k, dt);
    if (Math.abs(s.speed) < 0.02 && target === 0) s.speed = 0;

    // Turning with inertia; wider turns at a gallop; lean into turns.
    const turnRate = THREE.MathUtils.lerp(1.9, 1.15, Math.min(1, Math.abs(s.speed) / GALLOP));
    s.yawVel += (input.steer * turnRate - s.yawVel) * damp(7, dt);
    s.yaw += s.yawVel * dt * (s.speed < -0.1 ? -1 : 1);
    s.roll += (-s.yawVel * Math.min(1, Math.abs(s.speed) / GALLOP) * 0.12 - s.roll) * damp(5, dt);

    const fx = -Math.sin(s.yaw);
    const fz = -Math.cos(s.yaw);
    s.pos.x += fx * s.speed * dt;
    s.pos.z += fz * s.speed * dt;

    for (const c of COLLIDERS) {
      const dx = s.pos.x - c.x;
      const dz = s.pos.z - c.z;
      const d = Math.hypot(dx, dz);
      const min = c.radius + HORSE_RADIUS;
      if (d < min && d > 1e-4) {
        s.pos.x = c.x + (dx / d) * min;
        s.pos.z = c.z + (dz / d) * min;
      }
    }
    const r = Math.hypot(s.pos.x, s.pos.z);
    if (r > WORLD_RADIUS) {
      s.pos.x *= WORLD_RADIUS / r;
      s.pos.z *= WORLD_RADIUS / r;
      s.speed *= 0.9;
    }

    s.pos.y = heightAt(s.pos.x, s.pos.z);
    const hF = heightAt(s.pos.x + fx * 1.2, s.pos.z + fz * 1.2);
    const hB = heightAt(s.pos.x - fx * 1.2, s.pos.z - fz * 1.2);
    s.pitch += (Math.atan2(hF - hB, 2.4) - s.pitch) * damp(8, dt);

    if (group.current) {
      group.current.position.copy(s.pos);
      group.current.rotation.set(0, s.yaw, 0);
    }
    if (pitchGroup.current) pitchGroup.current.rotation.set(s.pitch, 0, s.roll);
    horse.current?.update(dt, s.speed, s.t);
    riderPose.gait += horse.current?.strideDelta ?? 0;

    // Hoof dust on contact, stronger at speed
    const sp = Math.abs(s.speed);
    if (dust.current && horse.current && sp > 5) {
      for (const c of horse.current.contacts) {
        const n = sp > 12 ? 3 : 1;
        for (let i = 0; i < n; i++) {
          dust.current.emit(
            c.x + (Math.random() - 0.5) * 0.3,
            heightAt(c.x, c.z) + 0.15,
            c.z + (Math.random() - 0.5) * 0.3,
            -fx * sp * 0.12 + (Math.random() - 0.5) * 1.2,
            0.6 + Math.random() * 0.8,
            -fz * sp * 0.12 + (Math.random() - 0.5) * 1.2,
          );
        }
      }
    }
    if (blob.current) {
      blob.current.position.set(s.pos.x, s.pos.y + 0.04, s.pos.z);
      blob.current.rotation.set(-Math.PI / 2, 0, -s.yaw);
    }

    riderPose.x = s.pos.x;
    riderPose.y = s.pos.y;
    riderPose.z = s.pos.z;
    riderPose.yaw = s.yaw;
    riderPose.speed = s.speed;

    // Follow camera: spring-damped, pulls back and widens at speed, framed higher on portrait screens.
    const portrait = size.width / size.height < 1;
    const dist = (portrait ? 9 : 6.3) + Math.max(0, s.speed) * 0.1;
    const height = portrait ? 4.2 : 2.9;
    want.set(s.pos.x - fx * dist, s.pos.y + height, s.pos.z - fz * dist);
    want.y = Math.max(want.y, heightAt(want.x, want.z) + 1.5);
    lookWant.set(s.pos.x + fx * 5, s.pos.y + 1.75, s.pos.z + fz * 5);
    const fovWant = (portrait ? 62 : 55) + Math.max(0, s.speed - TROT) * 0.45;
    if (s.snap) {
      camera.position.copy(want);
      s.look.copy(lookWant);
      s.fov = fovWant;
      s.snap = false;
    } else if (!paused) {
      camera.position.lerp(want, damp(3.5, dt));
      s.look.lerp(lookWant, damp(6, dt));
      s.fov += (fovWant - s.fov) * damp(2.5, dt);
    }
    // While paused (screenshots) leave the camera alone after the initial snap, so QA can frame shots.
    if (!paused || s.t === 0) {
      if (Math.abs(camera.fov - s.fov) > 0.01) {
        camera.fov = s.fov;
        camera.updateProjectionMatrix();
      }
      camera.lookAt(s.look);
    }

    // Shadow-casting sun follows the horse with a small frustum (sharp near-field shadows)
    if (sun.current) {
      sun.current.position.set(s.pos.x + 34, s.pos.y + 42, s.pos.z + 26);
      sun.current.target.position.copy(s.pos);
      sun.current.target.updateMatrixWorld();
    }

    let near: (typeof GER_SITES)[number]["id"] | null = null;
    let best = Infinity;
    for (const g of GER_SITES) {
      const d = Math.hypot(s.pos.x - g.x, s.pos.z - g.z) - g.radius;
      if (d < ENTER_RANGE && d < best) {
        best = d;
        near = g.id;
      }
    }
    useStore.getState().setNearGer(near);
  }, -1);

  return (
    <>
      <directionalLight
        ref={sun}
        intensity={2.9}
        color="#ffe3bd"
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={1}
        shadow-camera-far={140}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <group ref={group}>
        <group ref={pitchGroup}>
          <Horse ref={horse} />
        </group>
      </group>
      <mesh ref={blob} renderOrder={1}>
        <planeGeometry args={[2.0, 3.6]} />
        <meshBasicMaterial map={contactTexture()} transparent depthWrite={false} />
      </mesh>
      <Particles ref={dust} max={160} color="#cdb68c" life={1.3} size0={0.5} size1={2.4} alpha={0.55} drag={1.8} rise={0.25} />
    </>
  );
}
