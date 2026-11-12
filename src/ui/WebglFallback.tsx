export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function WebglFallback() {
  return (
    <div className="fallback" role="alert">
      <h2>The graveyard cannot rise</h2>
      <p>
        Lenore needs WebGL to draw its night sky, and this browser or device has it switched off or does not offer it.
        Try a recent Chrome, Firefox, Safari or Edge with hardware acceleration enabled.
      </p>
    </div>
  );
}
