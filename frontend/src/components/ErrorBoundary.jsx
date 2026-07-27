import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * App-wide error boundary. Without this, any render error white-screens the
 * whole SPA. Here we catch it and show a recoverable fallback instead.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface it for debugging; a real logger/Sentry hook would go here.
    console.error('Unhandled UI error:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-float border border-slate-100 p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle size={26} className="text-red-500" />
          </div>
          <h1 className="font-display font-bold text-slate-800 text-xl">Something went wrong</h1>
          <p className="text-slate-500 text-sm mt-2">
            An unexpected error occurred while rendering this page. Reloading usually fixes it.
          </p>
          {import.meta.env.DEV && (
            <pre className="mt-4 text-left text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-auto max-h-40 text-red-600">
              {String(this.state.error?.message || this.state.error)}
            </pre>
          )}
          <button onClick={() => window.location.reload()}
            className="mt-6 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:-translate-y-0.5 transition-all shadow-lg">
            <RefreshCw size={16} /> Reload page
          </button>
        </div>
      </div>
    );
  }
}
