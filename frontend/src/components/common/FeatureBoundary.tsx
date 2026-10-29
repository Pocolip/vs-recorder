import { Component, type ReactNode } from "react";

export default class FeatureBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div role="alert" className="p-8 text-center">
      <p>This feature could not load. Please reload to try again.</p>
      <button className="mt-3 underline" onClick={() => window.location.reload()}>Reload</button>
    </div>;
    return this.props.children;
  }
}
