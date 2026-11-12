import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Placement, Tombstone } from "../core/types.ts";
import { useStore } from "../state/store.ts";
import { makeTextTexture } from "./geometry.ts";
import { PALETTE, smooth } from "./palette.ts";
import { PLAQUE, VARIANT_COUNT, VARIANT_HEIGHT, buildTombGeometry, tombScale, variantOf } from "./tombGeometry.ts";

const STONE = new THREE.Color(PALETTE.stone);
const VIOLET = new THREE.Color(PALETTE.violet);
const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();
const NEAR_EPITAPHS = 6;

function baseColor(t: Tombstone, out: THREE.Color): THREE.Color {
  const age = Math.min(1, t.daysSinceCommit / 900);
  return out.copy(STONE).multiplyScalar(1 - 0.5 * age);
}

interface GroupProps {
  variant: number;
  items: Placement<Tombstone>[];
}

/** One instanced draw call per tombstone variant. */
function TombstoneGroup({ variant, items }: GroupProps) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const painted = useRef<{ hover: string | null; selected: string | null }>({ hover: null, selected: null });
  const geometry = useMemo(() => buildTombGeometry(variant), [variant]);
  const sinks = useMemo(() => new Float32Array(items.length), [items]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const place = (m: THREE.InstancedMesh, k: number) => {
    const p = items[k] as Placement<Tombstone>;
    const sc = tombScale(p.item);
    const h = (VARIANT_HEIGHT[variant] ?? 1.3) * sc;
    const sink = sinks[k] as number;
    dummy.position.set(p.pos.x, -sink * (h + 0.4), p.pos.z);
    dummy.rotation.set(sink * 0.3, p.rotation, p.rotation * 0.2 + sink * 0.12);
    dummy.scale.setScalar(sc);
    dummy.updateMatrix();
    m.setMatrixAt(k, dummy.matrix);
  };

  const paint = (m: THREE.InstancedMesh, hover: string | null, selected: string | null) => {
    items.forEach((p, k) => {
      baseColor(p.item, tmpColor);
      if (p.item.id === selected) tmpColor.lerp(VIOLET, 0.65);
      else if (p.item.id === hover) tmpColor.lerp(VIOLET, 0.35);
      m.setColorAt(k, tmpColor);
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  };

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    for (let k = 0; k < items.length; k++) place(m, k);
    m.instanceMatrix.needsUpdate = true;
    const s = useStore.getState();
    paint(m, s.hoveredId, s.selectedId);
    painted.current = { hover: s.hoveredId, selected: s.selectedId };
    // place and paint only close over items, variant and sinks, which are all in the deps.
  }, [items, geometry, sinks]);

  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    const s = useStore.getState();
    const dt = Math.min(delta, 0.05);
    let moved = false;
    for (let k = 0; k < items.length; k++) {
      const id = (items[k] as Placement<Tombstone>).item.id;
      let target = 0;
      if (s.resolved[id]) target = 1;
      else if (s.ritualId === id && (s.ritualPhase === "running" || s.ritualPhase === "decision")) {
        target = smooth(0.3, 0.7, s.ritualProgress);
      }
      const cur = sinks[k] as number;
      if (cur !== target) {
        sinks[k] = Math.abs(target - cur) < 0.001 ? target : THREE.MathUtils.damp(cur, target, 5, dt);
        place(m, k);
        moved = true;
      }
    }
    if (moved) m.instanceMatrix.needsUpdate = true;
    if (painted.current.hover !== s.hoveredId || painted.current.selected !== s.selectedId) {
      paint(m, s.hoveredId, s.selectedId);
      painted.current = { hover: s.hoveredId, selected: s.selectedId };
    }
  });

  if (items.length === 0) return null;
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, items.length]}
      geometry={geometry}
      frustumCulled={false}
      onPointerOver={(e) => {
        e.stopPropagation();
        const it = e.instanceId === undefined ? undefined : items[e.instanceId];
        if (it && !useStore.getState().resolved[it.item.id]) {
          useStore.getState().hover(it.item.id);
          document.body.style.cursor = "pointer";
        }
      }}
      onPointerOut={() => {
        useStore.getState().hover(null);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        if (e.delta > 4) return;
        e.stopPropagation();
        const it = e.instanceId === undefined ? undefined : items[e.instanceId];
        if (!it) return;
        const s = useStore.getState();
        if (s.resolved[it.item.id]) return;
        s.select(it.item.id);
        // One click starts the ritual. In demo mode the DemoDirector owns the rituals.
        if (!s.demoMode) useStore.getState().beginRitual();
      }}
    >
      <meshStandardMaterial roughness={0.92} metalness={0.02} />
    </instancedMesh>
  );
}

function EpitaphPlate({ p }: { p: Placement<Tombstone> }) {
  const id = p.item.id;
  const hidden = useStore((s) => Boolean(s.resolved[id]) || (s.ritualId === id && s.ritualPhase !== "idle"));
  const v = variantOf(id);
  const pl = PLAQUE[v] as (typeof PLAQUE)[number];
  const tex = useMemo(
    () => makeTextTexture(p.item.epitaph, 320, Math.round((320 * pl.h) / pl.w), PALETTE.bone),
    [p.item.epitaph, pl.h, pl.w],
  );
  useEffect(() => () => tex.dispose(), [tex]);
  if (hidden) return null;
  return (
    <group
      position={[p.pos.x, 0, p.pos.z]}
      rotation={[0, p.rotation, p.rotation * 0.2]}
      scale={tombScale(p.item)}
    >
      <mesh position={[0, pl.y, pl.z + 0.032]}>
        <planeGeometry args={[pl.w * 0.94, pl.h * 0.92]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} color="#cfcabb" />
      </mesh>
    </group>
  );
}

/** Epitaph text on the tombstones nearest to the camera. */
function Epitaphs() {
  const placements = useStore((s) => s.layout.tombstones);
  const [near, setNear] = useState<string[]>([]);
  const acc = useRef(1);

  useFrame((state, delta) => {
    acc.current += delta;
    if (acc.current < 0.5) return;
    acc.current = 0;
    const cam = state.camera.position;
    const ranked = placements
      .map((p) => ({ id: p.item.id, d: (p.pos.x - cam.x) ** 2 + (p.pos.z - cam.z) ** 2 }))
      .filter((r) => r.d < 40 * 40)
      .sort((a, b) => a.d - b.d)
      .slice(0, NEAR_EPITAPHS)
      .map((r) => r.id)
      .sort();
    setNear((prev) => (prev.length === ranked.length && prev.every((v, i) => v === ranked[i]) ? prev : ranked));
  });

  return (
    <>
      {placements
        .filter((p) => near.includes(p.item.id))
        .map((p) => (
          <EpitaphPlate key={p.item.id} p={p} />
        ))}
    </>
  );
}

function SelectionRing() {
  const ref = useRef<THREE.Mesh>(null);
  const place = useStore((s) => (s.selectedId ? s.layout.tombstones.find((p) => p.item.id === s.selectedId) : undefined));
  const resolved = useStore((s) => (s.selectedId ? Boolean(s.resolved[s.selectedId]) : false));
  useFrame((state) => {
    const m = ref.current;
    if (!m) return;
    const pulse = 1 + 0.06 * Math.sin(state.clock.elapsedTime * 2.4);
    m.scale.set(pulse, pulse, 1);
  });
  if (!place || resolved) return null;
  const r = 0.9 * tombScale(place.item);
  return (
    <mesh ref={ref} position={[place.pos.x, 0.06, place.pos.z]} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[r, r + 0.12, 48]} />
      <meshBasicMaterial color={PALETTE.violet} transparent opacity={0.85} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
}

export function Tombstones() {
  const placements = useStore((s) => s.layout.tombstones);
  const groups = useMemo(() => {
    const out: Placement<Tombstone>[][] = Array.from({ length: VARIANT_COUNT }, () => []);
    for (const p of placements) (out[variantOf(p.item.id)] as Placement<Tombstone>[]).push(p);
    return out;
  }, [placements]);
  return (
    <group>
      {groups.map((items, v) => (
        <TombstoneGroup key={`${v}-${items.length}`} variant={v} items={items} />
      ))}
      <Epitaphs />
      <SelectionRing />
    </group>
  );
}
