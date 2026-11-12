import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useStore } from "../state/store.ts";
import { PALETTE, reachOf } from "./palette.ts";

const MAX_PLOTS = 64;

const VERT = /* glsl */ `
#include <fog_pars_vertex>
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAG = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uMoss;
uniform vec3 uDirt;
uniform vec3 uPlots[${MAX_PLOTS}];
uniform float uCount;
varying vec3 vWorld;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 p = vWorld.xz;
  float n = fbm(p * 0.35);
  float fine = fbm(p * 2.2);
  vec3 col = uMoss * (0.55 + 0.9 * n) * (0.85 + 0.3 * fine);

  float plot = 0.0;
  float hub = 1.0 - smoothstep(4.0, 6.5, length(p));
  for (int i = 0; i < ${MAX_PLOTS}; i++) {
    if (float(i) >= uCount) break;
    vec3 pl = uPlots[i];
    float d = length(p - pl.xy);
    float edge = 1.0 - smoothstep(pl.z - 1.6, pl.z + 0.4, d);
    plot = max(plot, edge);
  }
  float ground = max(plot, hub);
  col = mix(col, uDirt * (0.7 + 0.6 * fine), ground * 0.55);
  col += vec3(0.01, 0.015, 0.03) * ground;

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

/** Procedural moss ground with burial-plot discs. One draw call. */
export function Ground() {
  const plots = useStore((s) => s.layout.plots);
  const paths = useStore((s) => s.layout.paths);

  const material = useMemo(() => {
    const arr: THREE.Vector3[] = [];
    for (let i = 0; i < MAX_PLOTS; i++) {
      const p = plots[i];
      arr.push(p ? new THREE.Vector3(p.center.x, p.center.z, p.radius) : new THREE.Vector3());
    }
    return new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uMoss: { value: new THREE.Color(PALETTE.moss) },
          uDirt: { value: new THREE.Color("#2b2620") },
          uPlots: { value: arr },
          uCount: { value: Math.min(plots.length, MAX_PLOTS) },
        },
      ]),
    });
  }, [plots]);

  useEffect(() => () => material.dispose(), [material]);

  const reach = reachOf(plots);
  const strips = useMemo(() => {
    const out: { key: string; x: number; z: number; len: number; yaw: number }[] = [];
    const add = (key: string, a: { x: number; z: number }, b: { x: number; z: number }) => {
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      out.push({ key, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, len: Math.hypot(dx, dz), yaw: Math.atan2(dx, dz) });
    };
    paths.forEach((seg, i) => {
      const a = seg[0];
      const b = seg[seg.length - 1];
      if (a && b) add(`p${i}`, a, b);
    });
    add("gate", { x: 0, z: 0 }, { x: 0, z: reach + 8 });
    return out;
  }, [paths, reach]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} material={material}>
        <planeGeometry args={[700, 700]} />
      </mesh>
      {strips.map((s) => (
        <mesh key={s.key} position={[s.x, 0.02, s.z]} rotation={[-Math.PI / 2, 0, s.yaw]}>
          <planeGeometry args={[1.6, s.len]} />
          <meshBasicMaterial color="#1c1814" transparent opacity={0.65} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
