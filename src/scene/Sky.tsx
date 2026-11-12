import { useEffect, useMemo } from "react";
import { Billboard, Stars } from "@react-three/drei";
import * as THREE from "three";
import { mulberry32 } from "../core/prng.ts";
import { makeGlowTexture } from "./geometry.ts";
import { PALETTE } from "./palette.ts";

export const MOON_POS: [number, number, number] = [-46, 44, -110];

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SKY_FRAG = /* glsl */ `
uniform vec3 uHorizon;
uniform vec3 uZenith;
varying vec3 vDir;
void main() {
  float h = clamp(vDir.y, 0.0, 1.0);
  vec3 col = mix(uHorizon, uZenith, pow(h, 0.55));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

function makeMoonTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#e8e4d8";
    ctx.fillRect(0, 0, 256, 256);
    const rng = mulberry32(31337);
    for (let i = 0; i < 26; i++) {
      const x = rng() * 256;
      const y = rng() * 256;
      const r = 6 + rng() * 22;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(120,125,150,0.38)");
      g.addColorStop(1, "rgba(120,125,150,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Gradient night dome, drei stars, and a moon with a soft halo. All procedural. */
export function Sky() {
  const skyMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uHorizon: { value: new THREE.Color(PALETTE.horizon) },
          uZenith: { value: new THREE.Color(PALETTE.night) },
        },
      }),
    [],
  );
  const moonTex = useMemo(makeMoonTexture, []);
  const halo = useMemo(() => makeGlowTexture("rgba(190,200,255,0.55)", "rgba(120,130,255,0)"), []);
  const halo2 = useMemo(() => makeGlowTexture("rgba(150,120,255,0.18)", "rgba(120,100,255,0)"), []);

  useEffect(
    () => () => {
      skyMat.dispose();
      moonTex.dispose();
      halo.dispose();
      halo2.dispose();
    },
    [skyMat, moonTex, halo, halo2],
  );

  return (
    <group>
      <mesh material={skyMat} renderOrder={-10} frustumCulled={false}>
        <sphereGeometry args={[300, 32, 16]} />
      </mesh>
      <Stars radius={220} depth={60} count={2200} factor={5} saturation={0.2} fade speed={0.4} />
      <group position={MOON_POS}>
        <mesh>
          <sphereGeometry args={[6, 32, 32]} />
          <meshBasicMaterial map={moonTex} toneMapped={false} fog={false} />
        </mesh>
        <Billboard>
          <mesh position={[0, 0, -0.5]}>
            <planeGeometry args={[34, 34]} />
            <meshBasicMaterial map={halo} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, -0.6]}>
            <planeGeometry args={[90, 90]} />
            <meshBasicMaterial map={halo2} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} toneMapped={false} />
          </mesh>
        </Billboard>
      </group>
    </group>
  );
}
