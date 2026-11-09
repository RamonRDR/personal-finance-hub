"use client";

import { useEffect, useState } from "react";
import type { Snapshot, ImportWarning } from "@/lib/finance/types";

interface Connection {
  configured: boolean;
  connected: boolean;
  email?: string | null;
}

interface WorkbookReply {
  snapshot?: Snapshot;
  warnings?: ImportWarning[];
  failedTabs?: string[];
  complete?: boolean;
}

export function GoogleConnector({
  onLoad,
  onDisconnect,
}: {
  onLoad: (snapshot: Snapshot, warnings: ImportWarning[]) => void;
  onDisconnect: () => void;
}) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) throw new Error("Sessão indisponível");
        return response.json() as Promise<Connection>;
      })
      .then((value) => {
        if (active) setConnection(value);
      })
      .catch(() => {
        if (active) setMessage("Não foi possível verificar a conexão Google.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function readGoogle() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/finance/snapshot", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("Leitura não autorizada ou indisponível.");
      const result = (await response.json()) as WorkbookReply;
      if (!result.snapshot || result.snapshot.mode !== "google-read-only") {
        throw new Error("Resposta inesperada da planilha.");
      }
      const warnings = result.warnings ?? [];
      const failed = result.failedTabs?.length ?? 0;
      if (result.complete !== true || warnings.length || failed) {
        setMessage(
          "Leitura incompleta (" +
            warnings.length +
            " avisos, " +
            failed +
            " falhas de abas). A importação foi bloqueada para evitar totais incorretos.",
        );
        return;
      }
      onLoad(result.snapshot, warnings);
      setMessage("Leitura validada. Nenhuma alteração foi feita na planilha.");
    } catch {
      setMessage("Não foi possível carregar a planilha. Nenhum dado foi alterado.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Logout failed");
      onDisconnect();
      setConnection({ configured: true, connected: false });
      setMessage("Conexão encerrada.");
    } catch {
      setMessage("Não foi possível encerrar a sessão agora.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-connector">
      <div className="settings-row">
        <span>
          <strong>Google Sheets</strong>
          <small>
            {connection?.connected
              ? "Conta autorizada: " + connection.email
              : "Acesso privado, exclusivamente de leitura"}
          </small>
        </span>
        <span className={"status " + (connection?.connected ? "status-paid" : "status-pending")}>
          {connection?.connected ? "Conectado" : "Desconectado"}
        </span>
      </div>
      <div className="connector-actions">
        {connection?.configured && !connection.connected && (
          <a className="secondary-action" href="/api/auth/google/start">
            Entrar com Google
          </a>
        )}
        {connection?.connected && (
          <>
            <button className="secondary-action" disabled={busy} onClick={readGoogle}>
              {busy ? "Consultando..." : "Carregar planilha (leitura)"}
            </button>
            <button className="secondary-action" disabled={busy} onClick={logout}>
              Desconectar
            </button>
          </>
        )}
        {connection && !connection.configured && (
          <small>Integração desativada. A demonstração não precisa de credenciais.</small>
        )}
      </div>
      {message && (
        <p role="status" className="settings-copy">
          {message}
        </p>
      )}
    </div>
  );
}
