import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * Collapses the static mesh children of every group under `root` into one mesh per
 * (material, shadow flags). Groups keep animating; only leaf meshes that never move relative
 * to their parent are merged. Mark meshes that are animated or referenced with
 * `userData.keep = true` to leave them alone. Returns how many meshes were removed.
 */
export function mergeStaticChildren(root: THREE.Object3D) {
  let removed = 0;
  const parents: THREE.Object3D[] = [];
  root.traverse((o) => parents.push(o));
  for (const parent of parents) {
    const buckets = new Map<string, THREE.Mesh[]>();
    for (const c of parent.children) {
      const m = c as THREE.Mesh;
      if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh || m.userData.keep || m.children.length) continue;
      if (Array.isArray(m.material)) continue;
      const key = `${m.material.uuid}|${m.castShadow}|${m.receiveShadow}|${m.renderOrder}`;
      const list = buckets.get(key) ?? [];
      list.push(m);
      buckets.set(key, list);
    }
    for (const list of buckets.values()) {
      if (list.length < 2) continue;
      const geos = list.map((m) => {
        m.updateMatrix();
        const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
        for (const name of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(name)) g.deleteAttribute(name);
        if (!g.attributes.uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        return g.applyMatrix4(m.matrix);
      });
      const merged = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (!merged) continue;
      const first = list[0];
      const mesh = new THREE.Mesh(merged, first.material);
      mesh.castShadow = first.castShadow;
      mesh.receiveShadow = first.receiveShadow;
      mesh.renderOrder = first.renderOrder;
      parent.add(mesh);
      for (const m of list) {
        parent.remove(m);
        removed++;
      }
    }
  }
  return removed;
}
