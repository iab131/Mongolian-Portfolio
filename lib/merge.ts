import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Static prop builder: add primitive parts with transforms, get one merged mesh per material.
// Keeps authored detail without paying a draw call per part.

export class PartBuilder {
  private parts = new Map<string, THREE.BufferGeometry[]>();
  private o = new THREE.Object3D();

  add(
    mat: string,
    geo: THREE.BufferGeometry,
    pos: [number, number, number] = [0, 0, 0],
    rot: [number, number, number] = [0, 0, 0],
    scale: [number, number, number] | number = 1,
  ) {
    this.o.position.set(...pos);
    this.o.rotation.set(...rot);
    if (typeof scale === "number") this.o.scale.setScalar(scale);
    else this.o.scale.set(...scale);
    this.o.updateMatrix();
    return this.addMatrix(mat, geo, this.o.matrix);
  }

  /** Add a part with an explicit transform matrix. */
  addMatrix(mat: string, geo: THREE.BufferGeometry, matrix: THREE.Matrix4) {
    // Non-indexed + only position/normal/uv so every primitive merges cleanly.
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const name of Object.keys(g.attributes)) {
      if (!["position", "normal", "uv"].includes(name)) g.deleteAttribute(name);
    }
    if (!g.attributes.uv) {
      g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    }
    g.applyMatrix4(matrix);
    const list = this.parts.get(mat) ?? [];
    list.push(g);
    this.parts.set(mat, list);
    geo.dispose();
    return this;
  }

  /** One merged geometry per material key. */
  build(): Map<string, THREE.BufferGeometry> {
    const out = new Map<string, THREE.BufferGeometry>();
    for (const [mat, list] of this.parts) {
      const merged = mergeGeometries(list, false);
      if (merged) {
        merged.computeBoundingSphere();
        out.set(mat, merged);
      }
      list.forEach((g) => g.dispose());
    }
    return out;
  }
}

const UP = new THREE.Vector3(0, 1, 0);

/** Matrix that places a Y-aligned, origin-centred part so it spans from a to b. */
export function spanMatrix(a: [number, number, number], b: [number, number, number]) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
  return { matrix: new THREE.Matrix4().compose(va.add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)), len };
}
