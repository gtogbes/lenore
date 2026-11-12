import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useStore } from "../state/store.ts";

/** Postprocessing budget (tech.md): bloom + vignette + noise only. Quality "low" skips multisampling and mipmap blur. */
export function Effects() {
  const quality = useStore((s) => s.quality);
  const reduced = useStore((s) => s.reducedMotion);

  if (quality === "low") {
    return (
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.8} luminanceThreshold={0.6} luminanceSmoothing={0.2} />
        <Vignette eskil={false} offset={0.3} darkness={0.85} />
        <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.4} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={4}>
      <Bloom intensity={1.0} luminanceThreshold={0.6} luminanceSmoothing={0.2} mipmapBlur />
      <Vignette eskil={false} offset={0.3} darkness={0.85} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={reduced ? 0.25 : 0.4} />
    </EffectComposer>
  );
}
