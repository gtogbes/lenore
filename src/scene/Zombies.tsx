import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { zombiePosition } from "../core/layout.ts";
import { hashString } from "../core/prng.ts";
import type { Zombie } from "../core/types.ts";
import { useStore } from "../state/store.ts";
import { makeTextTexture, mergeParts } from "./geometry.ts";
import { PALETTE } from "./palette.ts";

const dummy = new THREE.Object3D();
const tint = new THREE.Color();
const ROT = new THREE.Color(PALETTE.rot);
const DEAD = new THREE.Color("#3b4a3c");
const EYE = new THREE.Color("#d8ff8a");

function limb(w: number, h: number, d: number, x: number, y: number, z: number, rx = 0): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.rotateX(rx);
  g.translate(x, y, z);
  return g;
}

/** Low-poly hunched zombie, facing +z. */
function buildBody(): THREE.BufferGeometry {
  const head = new THREE.IcosahedronGeometry(0.17, 0);
  head.translate(0, 1.08, 0.32);
  return mergeParts([
    limb(0.15, 0.62, 0.15, -0.11, 0.31, 0),
    limb(0.15, 0.62, 0.15, 0.11, 0.31, 0.06),
    limb(0.44, 0.58, 0.26, 0, 0.9, 0.12, 0.55),
    head,
    limb(0.11, 0.11, 0.62, -0.29, 0.98, 0.52, -0.25),
    limb(0.11, 0.11, 0.62, 0.29, 0.98, 0.5, -0.1),
  ]);
}

function buildEyes(): THREE.BufferGeometry {
  const a = new THREE.SphereGeometry(0.035, 6, 4);
  a.translate(-0.07, 1.12, 0.47);
  const b = new THREE.SphereGeometry(0.035, 6, 4);
  b.translate(0.07, 1.12, 0.47);
  return mergeParts([a, b]);
}

/** 0 fresh .. 1 long dead. */
function staleness(z: Zombie): number {
  let s = Math.min(1, z.majorsBehind / 4);
  if (z.reasons.includes("abandoned")) s += 0.3;
  if (z.reasons.includes("deprecated")) s += 0.3;
  return Math.min(1, s);
}

export function Zombies() {
  const paths = useStore((s) => s.layout.zombies);
  const zombies = useStore((s) => s.graveyard.zombies);
  const body = useRef<THREE.InstancedMesh>(null);
  const eyes = useRef<THREE.InstancedMesh>(null);
  const sprites = useRef<(THREE.Sprite | null)[]>([]);

  const bodyGeo = useMemo(buildBody, []);
  const eyeGeo = useMemo(buildEyes, []);
  const byId = useMemo(() => new Map(zombies.map((z) => [z.id, z])), [zombies]);
  const labels = useMemo(
    () =>
      paths.map((p) => {
        const z = byId.get(p.id);
        const text = z ? `${z.name} ${z.current} > ${z.latest}` : p.id;
        return makeTextTexture(text, 384, 96, PALETTE.rot);
      }),
    [paths, byId],
  );
  useEffect(() => () => labels.forEach((t) => t.dispose()), [labels]);
  useEffect(
    () => () => {
      bodyGeo.dispose();
      eyeGeo.dispose();
    },
    [bodyGeo, eyeGeo],
  );

  useLayoutEffect(() => {
    const m = body.current;
    const e = eyes.current;
    if (!m || !e) return;
    paths.forEach((p, k) => {
      const z = byId.get(p.id);
      tint.lerpColors(ROT, DEAD, z ? staleness(z) : 0.5);
      m.setColorAt(k, tint);
      e.setColorAt(k, tmpEye());
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    if (e.instanceColor) e.instanceColor.needsUpdate = true;
  }, [paths, byId]);

  useFrame((state) => {
    const m = body.current;
    const e = eyes.current;
    if (!m || !e) return;
    const t = state.clock.elapsedTime;
    const reduced = useStore.getState().reducedMotion;
    paths.forEach((p, k) => {
      // Layout speed is an angular rate; divide by radius so the zombie shambles at p.speed units/s.
      const u = t / p.radius;
      const a = zombiePosition(p, u);
      const b = zombiePosition(p, u + 0.2 / p.radius);
      const heading = Math.atan2(b.x - a.x, b.z - a.z);
      const lurch = reduced ? 0 : Math.sin(t * 2.2 + p.phase * 3);
      dummy.position.set(a.x, 0.04 * Math.abs(lurch), a.z);
      dummy.rotation.set(0.05 * lurch, heading, 0.07 * lurch);
      dummy.scale.setScalar(1.05 + (hashString(p.id) % 5) * 0.03);
      dummy.updateMatrix();
      m.setMatrixAt(k, dummy.matrix);
      e.setMatrixAt(k, dummy.matrix);
      const sp = sprites.current[k];
      if (sp) sp.position.set(a.x, 2.2, a.z);
    });
    m.instanceMatrix.needsUpdate = true;
    e.instanceMatrix.needsUpdate = true;
  });

  if (paths.length === 0) return null;
  return (
    <group>
      <instancedMesh key={`zb-${paths.length}`} ref={body} args={[undefined, undefined, paths.length]} geometry={bodyGeo} frustumCulled={false}>
        <meshStandardMaterial roughness={0.95} flatShading />
      </instancedMesh>
      <instancedMesh key={`ze-${paths.length}`} ref={eyes} args={[undefined, undefined, paths.length]} geometry={eyeGeo} frustumCulled={false}>
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {paths.map((p, k) => (
        <sprite
          key={p.id}
          ref={(el) => {
            sprites.current[k] = el;
          }}
          scale={[3.2, 0.8, 1]}
        >
          <spriteMaterial map={labels[k]} transparent depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
}

function tmpEye(): THREE.Color {
  return EYE.clone().multiplyScalar(2.5);
}
