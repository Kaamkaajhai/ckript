import React from "react";

export default class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Global crash caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", fontFamily: "sans-serif", color: "#333" }}>
          <h1 style={{ color: "#d32f2f" }}>The app crashed.</h1>
          <p>An unhandled error occurred during rendering.</p>
          <pre style={{ 
            background: "#fee", 
            padding: "20px", 
            borderRadius: "4px", 
            overflowX: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all"
          }}>
            {this.state.error && (this.state.error.stack || this.state.error.message)}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              marginTop: "20px", 
              padding: "10px 20px", 
              background: "#1976d2", 
              color: "white", 
              border: "none", 
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
