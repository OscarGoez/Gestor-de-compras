import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg border max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
              <h2 className="text-xl font-bold text-gray-900">¡Ups! Algo salió mal</h2>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-700 mb-3">
                Ha ocurrido un error en la aplicación. Puedes intentar:
              </p>
              
              <div className="space-y-2">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full text-left px-4 py-2 bg-primary-50 text-primary-700 rounded hover:bg-primary-100"
                >
                  🔄 Recargar la página
                </button>
                
                <button
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="w-full text-left px-4 py-2 bg-amber-50 text-amber-700 rounded hover:bg-amber-100"
                >
                  🧹 Limpiar caché y recargar
                </button>
                
                <button
                  onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                  className="w-full text-left px-4 py-2 bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
                >
                  ↩️ Intentar de nuevo
                </button>
              </div>
            </div>

            {this.state.error && (
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                  Detalles técnicos del error
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded overflow-auto max-h-60">
                  <p className="font-mono text-red-600">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;