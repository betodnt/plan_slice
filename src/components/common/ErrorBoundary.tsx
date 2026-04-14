import { Component, ErrorInfo, ReactNode } from 'react';

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

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6 text-zinc-100">
          <div className="w-full max-w-md rounded-2xl border border-red-900/50 bg-red-950/20 p-8 text-center backdrop-blur-xl">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h1 className="mb-2 text-2xl font-bold">Algo deu errado</h1>
            <p className="mb-6 text-zinc-400">
              Ocorreu um erro inesperado na interface. Tente reiniciar o aplicativo.
            </p>
            {this.state.error && (
              <pre className="mb-6 overflow-auto rounded-lg bg-zinc-900 p-4 text-left text-xs text-red-400">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
