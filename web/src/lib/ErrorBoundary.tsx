import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  showStack: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null, showStack: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error, showStack: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Unhandled React error caught by ErrorBoundary.', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            gap: '16px',
            padding: '24px',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px' }}>Something went wrong</h2>
          <pre
            style={{
              maxWidth: '600px',
              maxHeight: '200px',
              overflow: 'auto',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#c92a2a',
              background: '#fff5f5',
              border: '1px solid #ffc9c9',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => this.setState({ error: null, showStack: false })}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #adb5bd',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Try again
          </button>
          {this.state.error.stack ? (
            <>
              <button
                type="button"
                onClick={() => this.setState((state) => ({ showStack: !state.showStack }))}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #ced4da',
                  background: '#f8f9fa',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                {this.state.showStack ? 'Hide stack' : 'Show stack'}
              </button>
              {this.state.showStack ? (
                <pre
                  style={{
                    maxWidth: '720px',
                    maxHeight: '240px',
                    overflow: 'auto',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#495057',
                    background: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {this.state.error.stack}
                </pre>
              ) : null}
            </>
          ) : null}
        </div>
      );
    }

    return this.props.children;
  }
}
