import React, { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Saarthi] Uncaught error:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
          <div className="scale-in max-w-md w-full rounded-3xl border border-red-500/20 bg-slate-900/80 p-8 text-center backdrop-blur-xl shadow-2xl">
            {/* Icon */}
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>

            <h2 className="mb-2 text-xl font-bold text-white">
              Something crashed
            </h2>
            <p className="mb-1 text-sm text-slate-400">
              An unexpected error occurred in this part of Saarthi.
            </p>
            {this.state.error && (
              <p className="mb-6 mt-3 rounded-xl bg-slate-950/60 px-4 py-3 font-mono text-xs text-red-400/80 text-left break-all border border-white/5">
                {this.state.error.message}
              </p>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded-xl border border-white/10 bg-slate-800/60 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700/60 transition-colors"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
