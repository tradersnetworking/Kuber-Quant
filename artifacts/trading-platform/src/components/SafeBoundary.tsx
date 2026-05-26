import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
};

type State = { error: Error | null };

/** Catches render errors in a subtree so one widget cannot blank the whole page. */
export class SafeBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {this.props.label || "This section failed to load."}
        </div>
      );
    }
    return this.props.children;
  }
}
