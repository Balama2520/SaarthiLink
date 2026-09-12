import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center text-foreground">
          <AlertTriangle className="h-16 w-16 text-red-500 mb-6" />
          <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            An unexpected error occurred in this section of the application. 
            We've been notified and are looking into it.
          </p>
          <button
            onClick={this.handleReload}
            className="flex items-center space-x-2 bg-primary hover:bg-primary/85 text-primary-foreground px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
            <span>Reload Application</span>
          </button>
          
          {import.meta.env.DEV && this.state.error && (
            <div className="mt-12 w-full max-w-2xl bg-card rounded-lg p-6 border border-muted text-left overflow-auto">
              <h2 className="text-xl font-mono text-red-400 mb-4 text-left">Error Details (Development Only)</h2>
              <pre className="text-sm font-mono text-foreground whitespace-pre-wrap">
                {this.state.error.toString()}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
