import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mulberry32 } from "../core/prng.ts";
import { useStore } from "../state/store.ts";
import { mergeParts } from "./geometry.ts";
import { fenceRadius, reachOf } from "./palette.ts";

const dummy = new THREE.Object3D();
const GATE_HALF_WIDTH = 3.4;

function buildPost(): THREE.BufferGeometry {
  const shaft = new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6);
  shaft.translate(0, 0.8, 0);
  const spike = new THREE.ConeGeometry(0.09, 0.28, 6);
  spike.translate(0, 1.74, 0);
  return mergeParts([shaft, spike]);
}

/** Iron fence ring with a gap at +z where the gate stands. Posts and rails are instanced. */
export function Fence() {
  const plots = useStore((s) => s.layout.plots);
  const R = fenceRadius(reachOf(plots));
  const posts = useRef<THREE.InstancedMesh>(null);
  const rails = useRef<THREE.InstancedMesh>(null);
  const postGeo = useMemo(buildPost, []);
  const railGeo = useMemo(() => new THREE.BoxGeometry(1, 0.05, 0.05), []);
  useEffect(
    () => () => {
      postGeo.dispose();
      railGeo.dispose();
    },
    [postGeo, railGeo],
  );

  const ring = useMemo(() => {
    const n = Math.min(160, Math.max(24, Math.round((2 * Math.PI * R) / 2.2)));
    const pts: { x: number; z: number }[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = Math.cos(a) * R;
      const z = Math.sin(a) * R;
      if (z > 0 && Math.abs(x) < GATE_HALF_WIDTH) continue;
      pts.push({ x, z });
    }
    return pts;
  }, [R]);

  useLayoutEffect(() => {
    const pm = posts.current;
    const rm = rails.current;
    if (!pm || !rm) return;
    ring.forEach((p, i) => {
      dummy.position.set(p.x, 0, p.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      pm.setMatrixAt(i, dummy.matrix);
      const next = ring[(i + 1) % ring.length] as { x: number; z: number };
      const len = Math.hypot(next.x - p.x, next.z - p.z);
      // Do not bridge the gate gap.
      const visible = len < 6.4 ? 1 : 0;
      [0.55, 1.2].forEach((y, j) => {
        dummy.position.set((p.x + next.x) / 2, y, (p.z + next.z) / 2);
        dummy.rotation.set(0, -Math.atan2(next.z - p.z, next.x - p.x), 0);
        dummy.scale.set(len * visible, 1, 1);
        dummy.updateMatrix();
        rm.setMatrixAt(i * 2 + j, dummy.matrix);
      });
    });
    pm.instanceMatrix.needsUpdate = true;
    rm.instanceMatrix.needsUpdate = true;
  }, [ring]);

  return (
    <group>
      <instancedMesh key={`fp-${ring.length}`} ref={posts} args={[undefined, undefined, ring.length]} geometry={postGeo} frustumCulled={false}>
        <meshStandardMaterial color="#1b1b24" roughness={0.5} metalness={0.8} />
      </instancedMesh>
      <instancedMesh key={`fr-${ring.length}`} ref={rails} args={[undefined, undefined, ring.length * 2]} geometry={railGeo} frustumCulled={false}>
        <meshStandardMaterial color="#1b1b24" roughness={0.5} metalness={0.8} />
      </instancedMesh>
      <Gate z={R} />
    </group>
  );
}

function Gate({ z }: { z: number }) {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (const sx of [-1, 1]) {
      const pillar = new THREE.BoxGeometry(0.7, 4.2, 0.7);
      pillar.translate(sx * GATE_HALF_WIDTH, 2.1, 0);
      parts.push(pillar);
      const cap = new THREE.ConeGeometry(0.55, 0.8, 4);
      cap.rotateY(Math.PI / 4);
      cap.translate(sx * GATE_HALF_WIDTH, 4.6, 0);
      parts.push(cap);
    }
    const arch = new THREE.TorusGeometry(GATE_HALF_WIDTH, 0.09, 6, 28, Math.PI);
    arch.translate(0, 3.6, 0);
    parts.push(arch);
    for (let i = -4; i <= 4; i++) {
      const bar = new THREE.CylinderGeometry(0.03, 0.03, 3.4, 5);
      bar.translate((i / 4) * (GATE_HALF_WIDTH - 0.4), 1.7, 0);
      parts.push(bar);
    }
    return mergeParts(parts);
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group position={[0, 0, z]}>
      <mesh geometry={geo}>
        <meshStandardMaterial color="#22222c" roughness={0.55} metalness={0.8} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * GATE_HALF_WIDTH, 3.9, 0.45]}>
          <icosahedronGeometry args={[0.18, 1]} />
          <meshBasicMaterial color="#ffd08a" toneMapped={false} fog={false} />
        </mesh>
      ))}
      <pointLight position={[0, 3.6, 1.2]} color="#ffb347" intensity={14} distance={16} decay={2} />
    </group>
  );
}

function limbGeometry(
  parts: THREE.BufferGeometry[],
  base: THREE.Matrix4,
  len: number,
  r: number,
  tilt: number,
  yaw: number,
): THREE.Matrix4 {
  const g = new THREE.CylinderGeometry(r * 0.45, r, len, 5);
  g.translate(0, len / 2, 0);
  const local = new THREE.Matrix4().makeRotationY(yaw).multiply(new THREE.Matrix4().makeRotationZ(tilt));
  const m = base.clone().multiply(local);
  g.applyMatrix4(m);
  parts.push(g);
  // Return a frame at the tip of this limb.
  return m.clone().multiply(new THREE.Matrix4().makeTranslation(0, len, 0));
}

function buildTree(): THREE.BufferGeometry {
  const rng = mulberry32(4242);
  const parts: THREE.BufferGeometry[] = [];
  const root = new THREE.Matrix4();
  const trunkTip = limbGeometry(parts, root, 4.2, 0.34, 0.05, 0);
  for (let i = 0; i < 6; i++) {
    const y = 2.0 + i * 0.38;
    const at = new THREE.Matrix4().makeTranslation(0, y, 0);
    const tilt = 0.7 + rng() * 0.5;
    const yaw = i * 1.05 + rng() * 0.4;
    const tip = limbGeometry(parts, at, 2.0 - i * 0.1, 0.09, tilt, yaw);
    limbGeometry(parts, tip, 1.1, 0.045, 0.5 + rng() * 0.6, rng() * Math.PI * 2);
    limbGeometry(parts, tip, 0.8, 0.04, -0.5 - rng() * 0.5, rng() * Math.PI * 2);
  }
  limbGeometry(parts, trunkTip, 1.0, 0.12, 0.3, 1.2);
  return mergeParts(parts);
}

const TREE_COUNT = 26;

/** Bare trees outside the fence, one instanced mesh. */
export function Trees() {
  const plots = useStore((s) => s.layout.plots);
  const R = fenceRadius(reachOf(plots));
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(buildTree, []);
  useEffect(() => () => geo.dispose(), [geo]);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const rng = mulberry32(777);
    for (let i = 0; i < TREE_COUNT; i++) {
      const a = rng() * Math.PI * 2;
      const r = R + 4 + rng() * 26;
      dummy.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      dummy.rotation.set(0, rng() * Math.PI * 2, 0);
      dummy.scale.setScalar(0.9 + rng() * 0.9);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [R]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, TREE_COUNT]} geometry={geo} frustumCulled={false}>
      <meshStandardMaterial color="#0f0d14" roughness={1} />
    </instancedMesh>
  );
}
