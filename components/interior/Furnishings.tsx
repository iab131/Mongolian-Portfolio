"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { box, cyl, geo, type Kit, merge, onCircle, type Part, R } from "./kit";

// Non-interactive furnishings: wall tapestries between the items, beds in empty
// wall slots, the entrance rug, a low table with bowls, stools and a fuel basket.

const TAP_W = 0.78;
const TAP_H = 1.36;
const TAP_Y = 1.36;

/** Wall tapestries (instanced) with their hanging rods (instanced). */
function Tapestries({ kit, angles }: { kit: Kit; angles: { deg: number; scale: number }[] }) {
  const cloth = useRef<THREE.InstancedMesh>(null);
  const rods = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    angles.forEach(({ deg, scale }, i) => {
      const a = THREE.MathUtils.degToRad(deg);
      const y = TAP_Y + (scale - 1) * 0.18;
      o.position.set(...onCircle(a, R - 0.12, y));
      o.rotation.set(0, -a, 0);
      o.scale.set(scale, scale, 1);
      o.updateMatrix();
      cloth.current?.setMatrixAt(i, o.matrix);
      o.position.set(...onCircle(a, R - 0.14, y + (TAP_H * scale) / 2 + 0.02));
      o.updateMatrix();
      rods.current?.setMatrixAt(i, o.matrix);
    });
    for (const m of [cloth.current, rods.current]) {
      if (!m) continue;
      m.count = angles.length;
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
    }
  }, [angles]);
  return (
    <>
      <instancedMesh ref={cloth} args={[undefined, undefined, 12]} material={kit.tapestry} receiveShadow>
        <planeGeometry args={[TAP_W, TAP_H]} />
      </instancedMesh>
      <instancedMesh ref={rods} args={[undefined, undefined, 12]} material={kit.gold}>
        <primitive object={geo("rod", () => merge([{ g: cyl(0.016, 0.016, TAP_W + 0.16, 8), r: [0, 0, Math.PI / 2] }, { g: new THREE.SphereGeometry(0.03, 8, 6), p: [-(TAP_W / 2 + 0.09), 0, 0] }, { g: new THREE.SphereGeometry(0.03, 8, 6), p: [TAP_W / 2 + 0.09, 0, 0] }]))} attach="geometry" />
      </instancedMesh>
    </>
  );
}

/** Low painted bed along the wall: frame with ornament front, felt mattress, pillows. */
const BED_L = 1.9;
const BED_D = 0.78;
const bedFrameGeo = () =>
  geo("bedFrame", () =>
    merge([
      { g: box(BED_L, 0.34, BED_D), p: [0, 0.17, 0.08 + BED_D / 2] },
      { g: box(0.08, 0.62, BED_D + 0.04), p: [-BED_L / 2, 0.31, 0.08 + BED_D / 2] },
      { g: box(0.08, 0.62, BED_D + 0.04), p: [BED_L / 2, 0.31, 0.08 + BED_D / 2] },
    ]),
  );
const bedBandGeo = () =>
  geo("bedBand", () => {
    const g = new THREE.PlaneGeometry(BED_L - 0.12, 0.2);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * Math.round((BED_L - 0.12) / 0.2));
    return merge([{ g, p: [0, 0.19, 0.08 + BED_D + 0.003] }]);
  });
const mattressGeo = () =>
  geo("mattress", () =>
    merge([
      { g: box(BED_L - 0.1, 0.12, BED_D - 0.04), p: [0, 0.4, 0.08 + BED_D / 2] },
      { g: new THREE.CapsuleGeometry(0.11, 0.42, 4, 10), p: [-BED_L / 2 + 0.34, 0.54, 0.24], r: [0, 0, Math.PI / 2], s: [1, 1, 0.7] },
      { g: new THREE.CapsuleGeometry(0.1, 0.36, 4, 10), p: [-BED_L / 2 + 0.3, 0.52, 0.5], r: [0, 0.2, Math.PI / 2], s: [1, 1, 0.7] },
    ]),
  );
const blanketGeo = () => geo("blanket", () => merge([{ g: box(0.7, 0.03, BED_D - 0.02), p: [0.35, 0.475, 0.08 + BED_D / 2] }]));

function Bed({ kit, deg }: { kit: Kit; deg: number }) {
  const a = THREE.MathUtils.degToRad(deg);
  return (
    <group position={onCircle(a, R - 0.07)} rotation={[0, -a, 0]}>
      <mesh geometry={bedFrameGeo()} material={kit.paint} castShadow receiveShadow />
      <mesh geometry={bedBandGeo()} material={kit.bedBand} />
      <mesh geometry={mattressGeo()} material={kit.feltCream} receiveShadow />
      <mesh geometry={blanketGeo()} material={kit.feltAccent} receiveShadow />
    </group>
  );
}

/** Low round-cornered table (shiree) with bowls, between the stove and the altar. */
const tableGeo = () =>
  geo("table", () => {
    const parts: Part[] = [
      { g: box(1.0, 0.05, 0.66), p: [0, 0.38, 0] },
      { g: box(0.92, 0.1, 0.58), p: [0, 0.31, 0] },
    ];
    for (const x of [-1, 1]) for (const z of [-1, 1]) parts.push({ g: box(0.06, 0.3, 0.06), p: [x * 0.42, 0.15, z * 0.25] });
    return merge(parts);
  });
const tableTopGeo = () => geo("tableTop", () => merge([{ g: new THREE.PlaneGeometry(0.62, 0.42), p: [0, 0.4065, 0], r: [-Math.PI / 2, 0, 0] }]));
const bowlsGeo = () =>
  geo("bowls", () => {
    const bowl = new THREE.LatheGeometry(
      [
        [0, 0],
        [0.035, 0],
        [0.04, 0.01],
        [0.075, 0.06],
        [0.072, 0.062],
        [0.033, 0.016],
        [0, 0.016],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      16,
    );
    return merge([
      { g: bowl, p: [-0.28, 0.405, 0.12] },
      { g: bowl.clone(), p: [-0.12, 0.405, -0.14] },
      { g: bowl.clone(), p: [0.3, 0.405, 0.1], s: [1.3, 1.1, 1.3] },
    ]);
  });
const stoolsGeo = () =>
  geo("stools", () => {
    const parts: Part[] = [];
    for (const [x, z] of [
      [-1.45, -1.5],
      [1.6, -1.25],
    ]) {
      parts.push({ g: cyl(0.2, 0.2, 0.05, 16), p: [x, 0.3, z] });
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        parts.push({ g: cyl(0.025, 0.03, 0.29, 6), p: [x + Math.cos(a) * 0.12, 0.145, z + Math.sin(a) * 0.12], r: [Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15] });
      }
    }
    return merge(parts);
  });
/** Wicker fuel basket with split logs, beside the stove. */
const basketGeo = () =>
  geo("basket", () =>
    merge([
      { g: new THREE.CylinderGeometry(0.22, 0.17, 0.32, 14, 1, true), p: [0, 0.16, 0] },
      { g: new THREE.CircleGeometry(0.17, 14), p: [0, 0.01, 0], r: [-Math.PI / 2, 0, 0] },
      { g: new THREE.TorusGeometry(0.22, 0.015, 5, 18), p: [0, 0.32, 0], r: [Math.PI / 2, 0, 0] },
    ]),
  );
const logsGeo = () =>
  geo("logs", () =>
    merge(
      [
        [0.05, 0.3, 0.03, 0.3, 0.1],
        [-0.06, 0.31, -0.04, -0.2, 0.15],
        [0.0, 0.36, 0.06, 0.1, -0.2],
        [-0.04, 0.34, 0.08, 0.5, 0.05],
      ].map(([x, y, z, ry, rz]) => ({ g: cyl(0.04, 0.045, 0.42, 6), p: [x, y, z] as [number, number, number], r: [Math.PI / 2 - 0.25, ry, rz] as [number, number, number] })),
    ),
  );

export function Furnishings({ kit, tapestries, beds }: { kit: Kit; tapestries: { deg: number; scale: number }[]; beds: number[] }) {
  return (
    <group>
      <Tapestries kit={kit} angles={tapestries} />
      {beds.map((d) => (
        <Bed key={d} kit={kit} deg={d} />
      ))}

      {/* entrance rug between the door and the stove */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.022, 2.55]} material={kit.rug} receiveShadow>
        <planeGeometry args={[1.5, 2.25]} />
      </mesh>

      <group position={[0, 0, -2.35]}>
        <mesh geometry={tableGeo()} material={kit.paint} castShadow receiveShadow />
        <mesh geometry={tableTopGeo()} material={kit.medallion} />
        <mesh geometry={bowlsGeo()} material={kit.porcelain} castShadow />
      </group>
      <mesh geometry={stoolsGeo()} material={kit.paint} castShadow receiveShadow />
      <group position={[-0.62, 0, 0.78]}>
        <mesh geometry={basketGeo()} receiveShadow>
          <meshStandardMaterial color="#9a7448" roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
        <mesh geometry={logsGeo()} material={kit.woodDark} />
      </group>
    </group>
  );
}
