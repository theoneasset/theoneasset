import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary] Caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%', 
          color: 'white', 
          background: '#0f172a',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h2 style={{ marginBottom: '10px' }}>⚠️ 지도 컴포넌트 오류</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            지도를 불러오는 중 문제가 발생했습니다. 하지만 다른 기능은 정상적으로 이용 가능합니다.
          </p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            style={{ 
              marginTop: '20px', 
              padding: '10px 20px', 
              background: 'var(--accent)', 
              border: 'none', 
              borderRadius: '8px', 
              color: 'white', 
              cursor: 'pointer' 
            }}
          >
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
