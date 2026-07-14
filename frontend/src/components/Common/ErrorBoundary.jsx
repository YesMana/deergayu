import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service here
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
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
          <h1 style={{ fontSize: '2rem', color: 'var(--secondary-color)', marginBottom: '1rem' }}>Oops! Something went wrong.</h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', marginBottom: '2rem', lineHeight: '1.6' }}>
            We're sorry, but an unexpected error occurred. Our team has been notified and is working on a fix.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              Try Again
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
