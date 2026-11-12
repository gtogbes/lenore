import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "../core/prng.ts";
import { useStore } from "../state/store.ts";
import { makeGlowTexture } from "./geometry.ts";
import { reachOf } from "./palette.ts";

const dummy = new THREE.Object3D();
const BAT_COUNT = 14;
const MIST_COUNT = 9;

/** V-shaped wing pair. Scaling Y between +1 and -1 flaps the wings. */
function buildBat(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const v = new Float32Array([
    // left wing
    0, 0, 0.12, -1.0, 0.35, 0.05, -0.25, 0, -0.25,
    // right wing
    0, 0, 0.12, 0.25, 0, -0.25, 1.0, 0.35, 0.05,
    // body
    -0.08, 0, 0.12, 0, 0, -0.3, 0.08, 0, 0.12,
  ]);
  g.setAttribute("position", new THREE.BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

/** A small flock of bats circling the graveyard. One instanced draw call. */
export function Bats() {
  const plots = useStore((s) => s.layout.plots);
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(buildBat, []);
  useEffect(() => () => geo.dispose(), [geo]);
  const reach = reachOf(plots);
  const flock = useMemo(() => {
    const rng = mulberry32(1031);
    return Array.from({ length: BAT_COUNT }, () => ({
      radius: reach * (0.3 + rng() * 0.8),
      height: 7 + rng() * 12,
      speed: (0.12 + rng() * 0.12) * (rng() < 0.5 ? -1 : 1),
      phase: rng() * Math.PI * 2,
      bob: rng() * Math.PI * 2,
      size: 0.5 + rng() * 0.4,
    }));
  }, [reach]);

  useFrame((state) => {
    const m = ref.current;
    if (!m) return;
    const reduced = useStore.getState().reducedMotion;
    const t = state.clock.elapsedTime * (reduced ? 0.4 : 1);
    flock.forEach((b, i) => {
      const a = b.phase + t * b.speed;
      dummy.position.set(Math.cos(a) * b.radius, b.height + Math.sin(t * 0.7 + b.bob) * 1.2, Math.sin(a) * b.radius);
      // Tangent direction of the circle gives the heading.
      const dir = b.speed > 0 ? 1 : -1;
      dummy.rotation.set(0, Math.atan2(-Math.sin(a) * dir, Math.cos(a) * dir), 0);
      const flap = reduced ? 0.4 : Math.sin(t * 13 + b.bob * 3);
      dummy.scale.set(b.size, b.size * flap, b.size);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, BAT_COUNT]} geometry={geo} frustumCulled={false}>
      <meshBasicMaterial color="#05040a" side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

/** Large soft planes drifting just above the ground. */
export function Mist() {
  const plots = useStore((s) => s.layout.plots);
  const reach = reachOf(plots);
  const tex = useMemo(() => makeGlowTexture("rgba(170,180,215,0.5)", "rgba(170,180,215,0)"), []);
  useEffect(() => () => tex.dispose(), [tex]);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const base = useMemo(() => {
    const rng = mulberry32(555);
    return Array.from({ length: MIST_COUNT }, () => {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * (reach + 10);
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, y: 0.5 + rng() * 1.2, size: 26 + rng() * 22, ph: rng() * 6.28, sp: 0.04 + rng() * 0.05 };
    });
  }, [reach]);

  useFrame((state) => {
    if (useStore.getState().reducedMotion) return;
    const t = state.clock.elapsedTime;
    base.forEach((b, i) => {
      const mesh = refs.current[i];
      if (mesh) mesh.position.set(b.x + Math.sin(t * b.sp + b.ph) * 7, b.y, b.z + Math.cos(t * b.sp * 0.8 + b.ph) * 5);
    });
  });

  return (
    <group>
      {base.map((b, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={[b.x, b.y, b.z]}
          rotation-x={-Math.PI / 2}
          renderOrder={2}
        >
          <planeGeometry args={[b.size, b.size]} />
          <meshBasicMaterial map={tex} transparent opacity={0.28} depthWrite={false} color="#aab2d6" />
        </mesh>
      ))}
    </group>
  );
}
