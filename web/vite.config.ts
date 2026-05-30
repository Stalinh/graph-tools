import { defineConfig } from "vite";

function normalizeModuleId(id: string): string {
  return id.replace(/\\/g, "/");
}

function matchesNodeModule(normalizedId: string, packagePath: string): boolean {
  return normalizedId.includes(`/node_modules/${packagePath}`);
}

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "connect-src 'self' ws://127.0.0.1:* ws://localhost:*",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

export function manualChunks(id: string): string | undefined {
  const normalizedId = normalizeModuleId(id);

  if (!normalizedId.includes("/node_modules/")) {
    return undefined;
  }

  if (
    matchesNodeModule(normalizedId, "react/") ||
    matchesNodeModule(normalizedId, "react-dom/") ||
    matchesNodeModule(normalizedId, "scheduler/")
  ) {
    return "react-vendor";
  }

  if (matchesNodeModule(normalizedId, "@xyflow/")) {
    return "flow-vendor";
  }

  if (
    matchesNodeModule(normalizedId, "@tiptap/") ||
    matchesNodeModule(normalizedId, "@prosemirror/") ||
    matchesNodeModule(normalizedId, "prosemirror-") ||
    matchesNodeModule(normalizedId, "orderedmap/") ||
    matchesNodeModule(normalizedId, "rope-sequence/")
  ) {
    return "editor-vendor";
  }

  return undefined;
}

export default defineConfig({
  server: {
    headers: {
      "Content-Security-Policy": CONTENT_SECURITY_POLICY,
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
});
