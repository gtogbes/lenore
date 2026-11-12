import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { useStore } from "../state/store.ts";
import { Bats, Mist } from "./Atmosphere.tsx";
import { CameraRig } from "./CameraRig.tsx";
import { DemoDirector } from "./DemoDirector.tsx";
import { Effects } from "./Effects.tsx";
import { Ground } from "./Ground.tsx";
import { Lanterns } from "./Lanterns.tsx";
import { FOG_FAR, FOG_NEAR, PALETTE, reachOf } from "./palette.ts";
import { Fence, Trees } from "./Props.tsx";
import { Ritual } from "./Ritual.tsx";
import { MOON_POS, Sky } from "./Sky.tsx";
import { Tombstones } from "./Tombstones.tsx";
import { Zombies } from "./Zombies.tsx";
import { introPoints } from "./cameraPaths.ts";

/** The whole haunted graveyard. Data comes from the store; nothing here classifies code. */
export function Scene() {
  const quality = useStore((s) => s.quality);
  const setQuality = useStore((s) => s.setQuality);
  const startPos = useMemo(() => introPoints(reachOf(useStore.getState().layout.plots)).start, []);

  return (
    <Canvas
      flat
      dpr={quality === "low" ? 1 : [1, 2]}
      camera={{ fov: 58, near: 0.1, far: 400, position: startPos }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      onPointerMissed={() => useStore.getState().select(null)}
    >
      <color attach="background" args={[PALETTE.night]} />
      <fog attach="fog" args={[PALETTE.fog, FOG_NEAR, FOG_FAR]} />
      <hemisphereLight args={["#3a4a8a", PALETTE.moss, 0.55]} />
      <directionalLight position={MOON_POS} color={PALETTE.moonlight} intensity={0.3} />
      <PerformanceMonitor onDecline={() => setQuality("low")} />

      <Sky />
      <Ground />
      <Fence />
      <Trees />
      <Tombstones />
      <Lanterns />
      <Zombies />
      <Ritual />
      <Bats />
      {quality === "high" && <Mist />}

      <CameraRig />
      <DemoDirector />
      <Effects />
    </Canvas>
  );
}
