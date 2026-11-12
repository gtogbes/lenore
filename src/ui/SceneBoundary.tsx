import { Component } from "react";
import type { ReactNode } from "react";
import { WebglFallback } from "./WebglFallback.tsx";

interface Props {
  children: ReactNode;
}
interface State {
  failed: boolean;
}

/** Shows the WebGL message if the renderer throws (for example on context creation failure). */
export class SceneBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render(): ReactNode {
    return this.state.failed ? <WebglFallback /> : this.props.children;
  }
}
