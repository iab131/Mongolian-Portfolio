"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { box, cyl, DOOR_HALF, geo, type Kit, merge, onCircle, R, ringBand, TOONO_R, TOONO_Y, WALL_H } from "./kit";

// The ger's structure: floor, khana lattice wall, uni roof poles, toono crown,
// bagana pillars and the painted door. Repeats are instanced; static parts merged.

const LATH_N = 104; // laths per direction around the wall
const LATH_SEG = 5; // straight segments per lath (follows the curve)
const LATH_R = R - 0.06;
const POLES = 60;

function Lattice({ kit }: { kit: Kit }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const span = WALL_H / LATH_R; // 45° climb, as arc angle
    let n = 0;
    for (const s of [1, -1]) {
      const r = LATH_R + s * 0.013;
      for (let i = 0; i < LATH_N; i++) {
        const phi0 = (i / LATH_N) * Math.PI * 2;
        for (let k = 0; k < LATH_SEG; k++) {
          const p0 = phi0 + (s * span * k) / LATH_SEG;
          const p1 = phi0 + (s * span * (k + 1)) / LATH_SEG;
          const mid = Math.atan2(Math.sin((p0 + p1) / 2), Math.cos((p0 + p1) / 2));
          if (Math.abs(Math.abs(mid) - Math.PI) < DOOR_HALF) continue; // door opening
          a.set(...onCircle(p0, r, (WALL_H * k) / LATH_SEG));
          b.set(...onCircle(p1, r, (WALL_H * (k + 1)) / LATH_SEG));
          o.position.copy(a).add(b).multiplyScalar(0.5);
          o.lookAt(b);
          o.scale.set(1, 1, a.distanceTo(b) + 0.02);
          o.updateMatrix();
          m.setMatrixAt(n++, o.matrix);
        }
      }
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, LATH_N * LATH_SEG * 2]} material={kit.lath} frustumCulled={false}>
      <boxGeometry args={[0.022, 0.045, 1]} />
    </instancedMesh>
  );
}

function RoofPoles({ kit }: { kit: Kit }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    for (let i = 0; i < POLES; i++) {
      const phi = ((i + 0.5) / POLES) * Math.PI * 2;
      a.set(...onCircle(phi, R - 0.1, WALL_H - 0.02));
      b.set(...onCircle(phi, TOONO_R + 0.04, TOONO_Y - 0.06));
      o.position.copy(a).add(b).multiplyScalar(0.5);
      o.position.y -= 0.05;
      o.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize());
      o.scale.set(1, a.distanceTo(b), 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, POLES]} material={kit.pole} frustumCulled={false}>
      <cylinderGeometry args={[0.03, 0.042, 1, 6]} />
    </instancedMesh>
  );
}

/** Toono: outer crown ring, inner ring, arched spokes to a hub. One merged mesh. */
const toonoGeo = () =>
  geo("toono", () => {
    const parts = [
      { g: new THREE.TorusGeometry(TOONO_R, 0.11, 8, 56), p: [0, TOONO_Y, 0] as const, r: [Math.PI / 2, 0, 0] as const },
      { g: new THREE.TorusGeometry(TOONO_R - 0.16, 0.045, 6, 48), p: [0, TOONO_Y + 0.08, 0] as const, r: [Math.PI / 2, 0, 0] as const },
      { g: new THREE.TorusGeometry(0.24, 0.05, 6, 24), p: [0, TOONO_Y + 0.42, 0] as const, r: [Math.PI / 2, 0, 0] as const },
      // the felt-wrapped collar the crown sits in
      { g: new THREE.CylinderGeometry(TOONO_R + 0.08, TOONO_R + 0.08, 0.5, 40, 1, true), p: [0, TOONO_Y + 0.25, 0] as const },
    ];
    const spokes = [];
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      // two segments per spoke so they arch up to the hub
      const pts = [
        new THREE.Vector3(...onCircle(a, TOONO_R - 0.12, TOONO_Y + 0.06)),
        new THREE.Vector3(...onCircle(a, 0.5, TOONO_Y + 0.32)),
        new THREE.Vector3(...onCircle(a, 0.24, TOONO_Y + 0.42)),
      ];
      for (let k = 0; k < 2; k++) {
        const d = pts[k + 1].clone().sub(pts[k]);
        const g = new THREE.CylinderGeometry(0.03, 0.03, d.length() + 0.04, 6);
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize()));
        const c = pts[k].clone().add(pts[k + 1]).multiplyScalar(0.5);
        spokes.push({ g, p: [c.x, c.y, c.z] as [number, number, number] });
      }
    }
    return merge([...parts.map((p) => ({ ...p, p: [...p.p] as [number, number, number], r: p.r ? ([...p.r] as [number, number, number]) : undefined })), ...spokes]);
  });

/** Bagana: two painted pillars with carved capitals and feet. */
const PILLAR_X = 0.82;
const PILLAR_TOP = TOONO_Y - 0.12;
const pillarShaftGeo = () =>
  geo("pillarShaft", () =>
    merge([-PILLAR_X, PILLAR_X].map((x) => ({ g: cyl(0.085, 0.1, PILLAR_TOP - 0.22, 14), p: [x, (PILLAR_TOP + 0.22) / 2, 0] as [number, number, number] }))),
  );
const pillarCapsGeo = () =>
  geo("pillarCaps", () =>
    merge(
      [-PILLAR_X, PILLAR_X].flatMap((x) => [
        // stepped foot
        { g: box(0.3, 0.1, 0.3), p: [x, 0.05, 0] as [number, number, number] },
        { g: box(0.22, 0.12, 0.22), p: [x, 0.16, 0] as [number, number, number] },
        // capital: block + flared bracket arms (the "head")
        { g: box(0.24, 0.18, 0.24), p: [x, PILLAR_TOP - 0.25, 0] as [number, number, number] },
        { g: box(0.62, 0.1, 0.16), p: [x, PILLAR_TOP - 0.11, 0] as [number, number, number] },
        { g: box(0.16, 0.1, 0.5), p: [x, PILLAR_TOP - 0.02, 0] as [number, number, number] },
      ]),
    ),
  );

/** Door frame (posts, lintel, threshold) and the double painted door, on the south wall. */
const DOOR_W = 1.2;
const DOOR_H = 1.85;
const doorFrameGeo = () =>
  geo("doorFrame", () =>
    merge([
      { g: box(0.14, DOOR_H + 0.2, 0.2), p: [-(DOOR_W / 2 + 0.07), (DOOR_H + 0.2) / 2, 0] },
      { g: box(0.14, DOOR_H + 0.2, 0.2), p: [DOOR_W / 2 + 0.07, (DOOR_H + 0.2) / 2, 0] },
      { g: box(DOOR_W + 0.5, 0.16, 0.24), p: [0, DOOR_H + 0.12, 0] },
      { g: box(DOOR_W + 0.36, 0.08, 0.3), p: [0, 0.04, 0] },
    ]),
  );
const doorLeavesGeo = () =>
  geo("doorLeaves", () =>
    merge([
      { g: new THREE.PlaneGeometry(DOOR_W / 2 - 0.02, DOOR_H - 0.06), p: [-DOOR_W / 4, DOOR_H / 2 + 0.05, 0] },
      { g: new THREE.PlaneGeometry(DOOR_W / 2 - 0.02, DOOR_H - 0.06), p: [DOOR_W / 4, DOOR_H / 2 + 0.05, 0] },
    ]),
  );
const doorHandlesGeo = () =>
  geo("doorHandles", () =>
    merge([
      { g: new THREE.TorusGeometry(0.05, 0.012, 6, 16), p: [-0.08, 1.0, 0.04] },
      { g: new THREE.TorusGeometry(0.05, 0.012, 6, 16), p: [0.08, 1.0, 0.04] },
    ]),
  );

export function Structure({ kit }: { kit: Kit }) {
  return (
    <group>
      {/* Floor: planks, round felt carpet with ornament border */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={kit.floor}>
        <circleGeometry args={[R, 72]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow material={kit.feltFloor}>
        <circleGeometry args={[3.9, 72]} />
      </mesh>
      <mesh position={[0, 0.016, 0]} receiveShadow material={kit.carpetBand} geometry={geo("carpetRing", () => ringBand(3.6, 3.9, 128))} />
      <mesh position={[0, 0.016, 0]} receiveShadow material={kit.carpetBand} geometry={geo("carpetRing2", () => ringBand(1.45, 1.63, 72))} />

      {/* Khana wall: felt behind an orange lattice, painted frieze at the top, dark skirting */}
      <mesh position={[0, WALL_H / 2 + 0.05, 0]} material={kit.feltWall} receiveShadow>
        <cylinderGeometry args={[R, R, WALL_H + 0.1, 96, 1, true]} />
      </mesh>
      <Lattice kit={kit} />
      <mesh position={[0, WALL_H - 0.1, 0]} material={kit.frieze}>
        <cylinderGeometry args={[R - 0.115, R - 0.115, 0.22, 96, 1, true]} />
      </mesh>
      <mesh position={[0, 0.07, 0]} material={kit.woodDark}>
        <cylinderGeometry args={[R - 0.11, R - 0.11, 0.14, 96, 1, true]} />
      </mesh>

      {/* Roof: felt cone over 72 painted uni poles, crown ring, sky through the toono */}
      <mesh position={[0, (WALL_H + TOONO_Y) / 2, 0]} material={kit.feltRoof}>
        <cylinderGeometry args={[TOONO_R + 0.06, R + 0.02, TOONO_Y - WALL_H, 96, 1, true]} />
      </mesh>
      <RoofPoles kit={kit} />
      <mesh geometry={toonoGeo()} material={kit.paint} />
      <mesh position={[0, TOONO_Y + 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} material={kit.sky}>
        <circleGeometry args={[TOONO_R + 0.1, 40]} />
      </mesh>

      {/* Bagana pillars */}
      <mesh geometry={pillarShaftGeo()} material={kit.pillar} castShadow />
      <mesh geometry={pillarCapsGeo()} material={kit.paint} castShadow />

      {/* Door (south, +z), facing in */}
      <group position={[0, 0, R - 0.1]} rotation={[0, Math.PI, 0]}>
        <mesh geometry={doorFrameGeo()} material={kit.paint} />
        <mesh geometry={doorLeavesGeo()} material={kit.door} position={[0, 0, 0.02]} />
        <mesh geometry={doorHandlesGeo()} material={kit.gold} />
      </group>
    </group>
  );
}

export { PILLAR_X };
