import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };

type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#050A14] bg-background text-foreground flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
            <h1 className="text-lg font-semibold text-destructive">Something went wrong</h1>
            <p className="text-sm text-muted-foreground break-words">{this.state.error.message}</p>
            <Button onClick={() => window.location.reload()}>Reload page</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
