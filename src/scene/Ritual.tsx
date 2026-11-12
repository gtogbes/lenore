import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "../core/prng.ts";
import type { Placement, Tombstone } from "../core/types.ts";
import { useStore } from "../state/store.ts";
import { mergeParts } from "./geometry.ts";
import { PALETTE, smooth } from "./palette.ts";
import { PLAQUE, VARIANT_HEIGHT, tombScale, variantOf } from "./tombGeometry.ts";

const PARTICLES = 140;
const PILLAR_H = 16;

/** Summoning circle drawn on a canvas: rings, ticks, rune strokes and a five point star. */
function makeGlyphTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (ctx) {
    const mid = size / 2;
    ctx.translate(mid, mid);
    ctx.strokeStyle = "#c9a8ff";
    ctx.lineCap = "round";
    ctx.lineWidth = 5;
    for (const r of [236, 214, 150]) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineWidth = 3;
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 214, Math.sin(a) * 214);
      ctx.lineTo(Math.cos(a) * 226, Math.sin(a) * 226);
      ctx.stroke();
    }
    const rng = mulberry32(666);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.save();
      ctx.rotate(a);
      ctx.translate(0, -182);
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(0, 14);
      if (rng() < 0.5) ctx.lineTo(10, 4);
      if (rng() < 0.5) {
        ctx.moveTo(0, -4);
        ctx.lineTo(-10, -14);
      }
      if (rng() < 0.4) {
        ctx.moveTo(-8, 8);
        ctx.lineTo(8, 8);
      }
      ctx.stroke();
      ctx.restore();
    }
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i <= 5; i++) {
      const a = -Math.PI / 2 + ((i * 2) / 5) * Math.PI * 2;
      const x = Math.cos(a) * 148;
      const y = Math.sin(a) * 148;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildMausoleum(): THREE.BufferGeometry {
  const base = new THREE.BoxGeometry(2.4, 0.3, 2.8);
  base.translate(0, 0.15, 0);
  const body = new THREE.BoxGeometry(1.9, 1.7, 2.3);
  body.translate(0, 1.15, 0);
  const roof = new THREE.ConeGeometry(1.75, 1.0, 4);
  roof.rotateY(Math.PI / 4);
  roof.translate(0, 2.5, 0);
  const col = (x: number) => {
    const g = new THREE.CylinderGeometry(0.1, 0.12, 1.7, 8);
    g.translate(x, 1.15, 1.25);
    return g;
  };
  return mergeParts([base, body, roof, col(-0.75), col(0.75)]);
}

/** The glowing mausoleum that rises where a tombstone stood. Local origin is at ground level. */
function MausoleumModel({ geo }: { geo: THREE.BufferGeometry }) {
  return (
    <>
      <mesh geometry={geo}>
        <meshStandardMaterial color="#5a5d6a" roughness={0.85} emissive={PALETTE.violet} emissiveIntensity={0.22} />
      </mesh>
      <mesh position={[0, 0.95, 1.16]}>
        <planeGeometry args={[0.7, 1.2]} />
        <meshBasicMaterial color="#c9a8ff" toneMapped={false} />
      </mesh>
    </>
  );
}

function RitualFX() {
  const place = useStore((s) => (s.ritualId ? s.layout.tombstones.find((p) => p.item.id === s.ritualId) : undefined));
  const root = useRef<THREE.Group>(null);
  const glyph = useRef<THREE.Mesh>(null);
  const glyphMat = useRef<THREE.MeshBasicMaterial>(null);
  const inner = useRef<THREE.Mesh>(null);
  const innerMat = useRef<THREE.MeshBasicMaterial>(null);
  const pillarMat = useRef<THREE.MeshBasicMaterial>(null);
  const coreMat = useRef<THREE.MeshBasicMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const pointsMat = useRef<THREE.PointsMaterial>(null);
  const crackGroup = useRef<THREE.Group>(null);
  const crackMat = useRef<THREE.LineBasicMaterial>(null);
  const maus = useRef<THREE.Group>(null);
  const fade = useRef(0);
  const lastP = useRef(0);

  const glyphTex = useMemo(makeGlyphTexture, []);
  const mausGeo = useMemo(buildMausoleum, []);
  const particleGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PARTICLES * 3), 3));
    return g;
  }, []);
  const crackGeo = useMemo(() => {
    const rng = mulberry32(9);
    const pts: number[] = [];
    for (let line = 0; line < 3; line++) {
      let x = (line - 1) * 0.22 + (rng() - 0.5) * 0.1;
      let y = 1.1 - rng() * 0.2;
      for (let i = 0; i < 7; i++) {
        const nx = x + (rng() - 0.5) * 0.2;
        const ny = y - 0.12 - rng() * 0.08;
        pts.push(x, y, 0, nx, ny, 0);
        x = nx;
        y = ny;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);

  useEffect(
    () => () => {
      glyphTex.dispose();
      mausGeo.dispose();
      particleGeo.dispose();
      crackGeo.dispose();
    },
    [glyphTex, mausGeo, particleGeo, crackGeo],
  );

  useFrame((state, delta) => {
    const g = root.current;
    const lamp = light.current;
    if (!g || !lamp) return;
    const s = useStore.getState();
    const dt = Math.min(delta, 0.05);
    const live = (s.ritualPhase === "running" || s.ritualPhase === "decision") && place !== undefined;
    fade.current = THREE.MathUtils.damp(fade.current, live ? 1 : 0, live ? 6 : 2.5, dt);
    if (live) lastP.current = s.ritualProgress;
    else if (s.ritualPhase === "resolved") lastP.current = 1;
    g.visible = fade.current > 0.01 && place !== undefined;
    // The light stays mounted and visible so the scene light count never changes (no shader recompiles).
    lamp.intensity = 0;
    if (!g.visible || !place) return;
    lamp.position.set(place.pos.x, 2.5, place.pos.z);

    const p = lastP.current;
    const f = fade.current;
    const t = state.clock.elapsedTime;
    const reduced = s.reducedMotion;
    const verdict = s.ritualPlan?.verdict;

    const circle = smooth(0, 0.12, p) * f;
    if (glyph.current) {
      glyph.current.rotation.z = reduced ? 0 : t * 0.35;
      glyph.current.scale.setScalar(0.6 + 0.4 * smooth(0, 0.18, p));
    }
    if (glyphMat.current) glyphMat.current.opacity = circle * 0.95;
    if (inner.current) inner.current.rotation.z = reduced ? 0 : -t * 0.6;
    if (innerMat.current) innerMat.current.opacity = circle * 0.8;

    const beam = smooth(0.35, 0.55, p) * (1 - 0.25 * smooth(0.9, 1, p)) * f;
    if (pillarMat.current) pillarMat.current.opacity = 0.28 * beam;
    if (coreMat.current) coreMat.current.opacity = 0.55 * beam;
    lamp.intensity = (6 + 70 * beam) * f * smooth(0, 0.2, p);

    const attr = particleGeo.getAttribute("position") as THREE.BufferAttribute;
    const count = reduced ? 40 : PARTICLES;
    particleGeo.setDrawRange(0, count);
    for (let i = 0; i < count; i++) {
      const u = (i / count + t * 0.22) % 1;
      const r = 2.1 * (1 - u * 0.75);
      const a = i * 0.62 + t * 1.8 + u * 6;
      attr.setXYZ(i, Math.cos(a) * r, 0.1 + u * 6.5, Math.sin(a) * r);
    }
    attr.needsUpdate = true;
    if (pointsMat.current) pointsMat.current.opacity = smooth(0.04, 0.2, p) * (1 - 0.6 * smooth(0.9, 1, p)) * f;

    const sinkAmt = smooth(0.3, 0.7, p);
    if (crackGroup.current) {
      const h = (VARIANT_HEIGHT[variantOf(place.item.id)] ?? 1.3) * tombScale(place.item);
      crackGroup.current.position.y = -sinkAmt * (h + 0.4);
    }
    if (crackMat.current) crackMat.current.opacity = smooth(0.1, 0.28, p) * (1 - smooth(0.6, 0.72, p)) * f;

    if (maus.current) {
      const rise = smooth(0.55, 0.88, p) * (verdict === "bury" ? 1 - smooth(0.9, 1, p) : 1) * f;
      maus.current.scale.set(1, Math.max(0.0001, rise), 1);
      maus.current.visible = rise > 0.01;
    }
  });

  const lamp = <pointLight ref={light} color={PALETTE.violet} intensity={0} distance={20} decay={2} />;
  if (!place) {
    return (
      <>
        {lamp}
        <group ref={root} visible={false} />
      </>
    );
  }
  const pl = PLAQUE[variantOf(place.item.id)] as (typeof PLAQUE)[number];
  return (
    <>
    {lamp}
    <group ref={root} position={[place.pos.x, 0, place.pos.z]} visible={false}>
      <mesh ref={glyph} position={[0, 0.07, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[6, 6]} />
        <meshBasicMaterial ref={glyphMat} map={glyphTex} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} color={PALETTE.violet} toneMapped={false} />
      </mesh>
      <mesh ref={inner} position={[0, 0.09, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.0, 1.08, 48]} />
        <meshBasicMaterial ref={innerMat} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} color="#c9a8ff" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, PILLAR_H / 2, 0]}>
        <cylinderGeometry args={[0.9, 1.4, PILLAR_H, 28, 1, true]} />
        <meshBasicMaterial ref={pillarMat} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} color={PALETTE.violet} toneMapped={false} side={THREE.DoubleSide} fog={false} />
      </mesh>
      <mesh position={[0, PILLAR_H / 2, 0]}>
        <cylinderGeometry args={[0.2, 0.3, PILLAR_H, 12, 1, true]} />
        <meshBasicMaterial ref={coreMat} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} color="#e6d6ff" toneMapped={false} side={THREE.DoubleSide} fog={false} />
      </mesh>
      <points geometry={particleGeo} frustumCulled={false}>
        <pointsMaterial ref={pointsMat} color="#c9a8ff" size={0.14} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </points>
      <group position={[0, 0, 0]} rotation={[0, place.rotation, 0]} scale={tombScale(place.item)}>
        <group ref={crackGroup}>
          <lineSegments geometry={crackGeo} position={[0, 0, pl.z + 0.07]}>
            <lineBasicMaterial ref={crackMat} color="#c9a8ff" transparent opacity={0} toneMapped={false} />
          </lineSegments>
        </group>
      </group>
      <group ref={maus} rotation={[0, place.rotation, 0]} scale={[1, 0.0001, 1]} visible={false}>
        <MausoleumModel geo={mausGeo} />
      </group>
    </group>
    </>
  );
}

/** Tombstones that were revived or refactored keep a glowing mausoleum. */
function ResolvedMausoleums() {
  const resolved = useStore((s) => s.resolved);
  const placements = useStore((s) => s.layout.tombstones);
  const geo = useMemo(buildMausoleum, []);
  useEffect(() => () => geo.dispose(), [geo]);
  const list = placements.filter((p: Placement<Tombstone>) => {
    const v = resolved[p.item.id];
    return v === "revive" || v === "refactor";
  });
  return (
    <>
      {list.map((p) => (
        <group key={p.item.id} position={[p.pos.x, 0, p.pos.z]} rotation={[0, p.rotation, 0]}>
          <MausoleumModel geo={geo} />
        </group>
      ))}
    </>
  );
}

/** Advances the ritual clock once per frame. */
function RitualClock() {
  useFrame((_, delta) => {
    useStore.getState().advanceRitual(Math.min(delta, 0.05));
  });
  return null;
}

export function Ritual() {
  return (
    <>
      <RitualClock />
      <RitualFX />
      <ResolvedMausoleums />
    </>
  );
}
