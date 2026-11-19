import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// 1. Force scheduler to not use MessageChannel if restricted in iframe
try {
  if (typeof window !== 'undefined' && window.MessageChannel) {
    window.MessageChannel = undefined;
  }
} catch (e) {}

// 2. Global Error Boundary to catch render failures and show readable feedback
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('App ErrorBoundary caught error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '32px',
          margin: '24px auto',
          maxWidth: '800px',
          background: '#fff1f2',
          border: '2px solid #f87171',
          borderRadius: '16px',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          color: '#991b1b',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 12px 0' }}>
            Application Render Notice
          </h2>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.95rem', lineHeight: 1.5 }}>
            {this.state.error?.message || String(this.state.error)}
          </p>
          <pre style={{
            background: '#ffffff',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            overflow: 'auto',
            border: '1px solid #fecdd3',
            color: '#475569'
          }}>
            {this.state.error?.stack || ''}
            {this.state.info?.componentStack || ''}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function mountApplication() {
  const container = document.getElementById('root');
  if (!container) {
    setTimeout(mountApplication, 20);
    return;
  }

  const existingRoot = container.__bhartiTaPortalRoot;
  if (existingRoot) {
    existingRoot.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
    return;
  }

  try {
    const root = createRoot(container);
    container.__bhartiTaPortalRoot = root;

    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
    console.info('MIS TA Portal successfully mounted with a stable React 18 root.');
  } catch (err) {
    console.error('createRoot failed:', err);
    container.innerHTML = '<div style="padding:32px;margin:24px auto;max-width:800px;background:#fff1f2;border:2px solid #f87171;border-radius:16px;font-family:sans-serif;color:#991b1b;"><h2 style="font-weight:800;margin-bottom:12px;">Initialization Notice</h2><p style="margin-bottom:16px;">' + (err.message || String(err)) + '</p><pre style="background:#fff;padding:12px;border-radius:8px;font-size:0.8rem;overflow:auto;">' + (err.stack || '') + '</pre></div>';
  }
}

// In Google Apps Script iframes, call mountApplication directly
mountApplication();
