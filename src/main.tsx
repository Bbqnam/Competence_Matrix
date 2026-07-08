import { RouterProvider } from "@tanstack/react-router";
import { Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

import { getRouter } from "./router";
import "./styles.css";

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Application failed to render", error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
        <div className="mx-auto max-w-xl rounded-xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">KUBAL Competence Matrix could not load</h1>
          <p className="mt-2 text-sm text-slate-600">
            The app hit a browser-side error while starting. Try refreshing the page, or clear the
            site data if this happened after an older demo version was opened.
          </p>
          <pre className="mt-4 overflow-auto rounded bg-slate-100 p-3 text-xs text-red-700">
            {this.state.error.message}
          </pre>
          <button
            className="mt-4 rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            onClick={() => window.location.reload()}
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

createRoot(rootElement).render(
  <AppErrorBoundary>
    <RouterProvider router={getRouter()} />
  </AppErrorBoundary>,
);
