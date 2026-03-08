import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import './ErrorBoundary.css';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-screen">
          <div className="error-boundary-card">
             <div className="error-icon">⚠️</div>
             <h1>System Disruption</h1>
             <p className="error-primary">Something went wrong, but your data is safe.</p>
             <p className="error-secondary">The CanAfford engine encountered an unexpected layout crash.</p>
             <button 
                className="error-reset-btn" 
                onClick={() => window.location.reload()}
             >
               Reboot Engine
             </button>
             {import.meta.env.DEV && (
                <pre className="error-trace">{this.state.error?.message}</pre>
             )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
