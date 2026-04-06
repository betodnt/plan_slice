import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  error: string | null;
};

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error("Render error", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return createBootError("Erro ao renderizar a interface", this.state.error);
    }

    return this.props.children;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function createBootMarkup(title: string, message: string): string {
  return `
    <div style="min-height:100vh;display:grid;place-items:center;background:#111317;color:#e7edf7;padding:24px;font-family:Cascadia Code,Segoe UI,sans-serif;">
      <div style="width:min(760px,100%);border:1px solid rgba(133,148,173,.22);background:rgba(26,30,38,.96);box-shadow:0 24px 60px rgba(0,0,0,.34);padding:24px;">
        <p style="margin:0 0 8px;color:#e5a34d;font-size:12px;letter-spacing:.18em;text-transform:uppercase;">Diagnostico do Monitor</p>
        <h1 style="margin:0 0 14px;font-size:28px;line-height:1.1;">${escapeHtml(title)}</h1>
        <pre style="margin:0;white-space:pre-wrap;word-break:break-word;color:#c8d3e2;font-size:14px;line-height:1.5;">${escapeHtml(message)}</pre>
      </div>
    </div>
  `;
}

function createBootError(title: string, message: string) {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: createBootMarkup(title, message),
      }}
    />
  );
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Elemento #root nao encontrado.");
}

rootElement.innerHTML = createBootMarkup(
  "Carregando interface",
  "Inicializando a aplicacao..."
);

window.addEventListener("error", (event) => {
  rootElement.innerHTML = createBootMarkup(
    "Erro de runtime",
    event.error instanceof Error ? `${event.error.name}: ${event.error.message}` : String(event.message)
  );
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason instanceof Error ? `${event.reason.name}: ${event.reason.message}` : String(event.reason);
  rootElement.innerHTML = createBootMarkup("Promise rejeitada", reason);
});

const root = ReactDOM.createRoot(rootElement);

void import("./App")
  .then(({ default: App }) => {
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    rootElement.innerHTML = createBootMarkup("Falha ao carregar App.tsx", message);
  });
