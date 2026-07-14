import React from 'react';
import { AlertTriangle } from 'lucide-react';

const isChunkLoadError = (error) => {
  const msg = String(error?.message || error || '');
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Unable to preload CSS/i.test(msg) ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /Importing a module script failed/i.test(msg)
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, isChunkError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, isChunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo, isChunkError: isChunkLoadError(error) });

    // After a deploy, cached HTML can point at deleted asset hashes.
    // One hard reload usually fixes it; don't loop forever.
    if (isChunkLoadError(error)) {
      const key = 'deergayu_chunk_reload';
      const last = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - last > 15000) {
        sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--text-color)'
        }}>
          <AlertTriangle size={64} style={{ color: 'var(--error-color)', marginBottom: '1.5rem' }} />
          <h1 style={{ fontSize: '2rem', color: 'var(--secondary-color)', marginBottom: '1rem' }}>
            {this.state.isChunkError ? 'Site update in progress' : 'Oops! Something went wrong.'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', marginBottom: '2rem', lineHeight: '1.6' }}>
            {this.state.isChunkError
              ? 'A new version was deployed. Please refresh to load the latest files.'
              : "We're sorry, but an unexpected error occurred. Our team has been notified and is working on a fix."}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                sessionStorage.removeItem('deergayu_chunk_reload');
                window.location.href = '/';
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              Go Home
            </button>
            <button
              className="btn btn-outline"
              onClick={() => window.location.reload()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              Refresh Page
            </button>
          </div>

          {this.state.error && (
            <details style={{ marginTop: '2rem', textAlign: 'left', background: 'rgba(255,0,0,0.05)', padding: '1rem', borderRadius: '8px', maxWidth: '800px', overflow: 'auto' }}>
              <summary style={{ cursor: 'pointer', color: 'var(--error-color)', fontWeight: 'bold' }}>Error Details</summary>
              <pre style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                {this.state.error.toString()}
                <br />
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
