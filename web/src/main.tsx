import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { ErrorBoundary } from "./lib/ErrorBoundary";
import "./styles.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found in DOM");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
