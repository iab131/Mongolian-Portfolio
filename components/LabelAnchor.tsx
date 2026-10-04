"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { clearAnchor, projectLabels, setAnchor } from "@/lib/labels";

/** Marks where a DOM label (see components/ui/Labels) should sit in the 3D scene. */
export function LabelAnchor({
  id,
  position,
  size,
  maxDist,
  minScale,
}: {
  id: string;
  position: [number, number, number];
  size: number;
  maxDist?: number;
  minScale?: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const pos = useRef<THREE.Vector3 | null>(null);
  useEffect(() => {
    pos.current = setAnchor(id, { size, maxDist, minScale });
    return () => clearAnchor(id);
  }, [id, size, maxDist, minScale]);
  // Runs before the projector (priority 0) so labels don't lag a frame.
  useFrame(() => {
    if (ref.current && pos.current) ref.current.getWorldPosition(pos.current);
  }, -1);
  return <group ref={ref} position={position} />;
}

/** Moves every registered label to its anchor. Mount once inside the Canvas. */
export function LabelProjector() {
  useFrame(({ camera, size }) => projectLabels(camera, size.width, size.height));
  return null;
}
