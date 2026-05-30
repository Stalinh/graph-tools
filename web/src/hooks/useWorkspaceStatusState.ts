import { useState } from "react";

export function useWorkspaceStatusState() {
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return {
    dirty,
    setDirty,
    status,
    setStatus,
    errorMessage,
    setErrorMessage,
  };
}
