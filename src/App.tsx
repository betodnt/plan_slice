import { FormEvent, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

type MonitorRow = {
  operador: string;
  maquina: string;
  pedido: string;
  plano: string;
  duracao: string;
  conclusao: string;
  rowType: string;
  isDelayed: boolean;
};

type MonitorSnapshot = {
  activeItems: MonitorRow[];
  historyItems: MonitorRow[];
  historyTotal: number;
  count: number;
  statusText: string;
  statusColor: string;
  selectedDate: string;
  refreshIntervalMs: number;
  locksFilePath: string;
  xmlFilePath: string;
};

function App() {
  const [dateInput, setDateInput] = useState("");
  const [snapshot, setSnapshot] = useState<MonitorSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadSnapshot = async (requestedDate?: string) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await invoke<MonitorSnapshot>("get_monitor_snapshot", {
        viewDate: requestedDate && requestedDate.trim() ? requestedDate : undefined,
      });
      setSnapshot(data);
      setDateInput(data.selectedDate);
    } catch (error) {
      setErrorMessage(String(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshot();
  }, []);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    const timerId = window.setInterval(() => {
      loadSnapshot(dateInput || snapshot.selectedDate);
    }, snapshot.refreshIntervalMs);

    return () => window.clearInterval(timerId);
  }, [snapshot?.refreshIntervalMs, snapshot?.selectedDate, dateInput]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await loadSnapshot(dateInput);
  };

  const totalVisibleRows = (snapshot?.activeItems.length ?? 0) + (snapshot?.historyItems.length ?? 0);

  return (
    <main className="monitor-shell">
      <header className="monitor-header">
        <div className="title-block">
          <p className="eyebrow">Replica do monitor Python</p>
          <h1>Monitor de Operacoes</h1>
        </div>

        <form className="search-bar" onSubmit={handleSubmit}>
          <label>
            Data
            <input
              value={dateInput}
              onChange={(event) => setDateInput(event.target.value)}
              placeholder="dd/mm/aaaa"
            />
          </label>
          <button type="submit" disabled={isLoading}>
            Buscar
          </button>
        </form>

        <div className="header-status">
          <strong>{snapshot?.count ?? 0} ativos</strong>
          <span style={{ color: snapshot?.statusColor }}>{snapshot?.statusText ?? "carregando..."}</span>
        </div>
      </header>

      <section className="summary-grid">
        <article className="summary-card">
          <span>Em operacao</span>
          <strong>{snapshot?.count ?? 0}</strong>
        </article>
        <article className="summary-card">
          <span>Finalizados</span>
          <strong>{snapshot?.historyTotal ?? 0}</strong>
        </article>
        <article className="summary-card wide">
          <span>Arquivo XML monitorado</span>
          <strong>{snapshot?.xmlFilePath ?? "-"}</strong>
        </article>
        <article className="summary-card wide">
          <span>Arquivo de locks</span>
          <strong>{snapshot?.locksFilePath ?? "-"}</strong>
        </article>
      </section>

      <section className="table-card">
        <div className="table-header">
          <div>
            <h2>Operacoes em tempo real</h2>
            <p>{totalVisibleRows} linhas exibidas</p>
          </div>
          {isLoading ? <span className="pill">Atualizando...</span> : <span className="pill">Atualizado</span>}
        </div>

        {errorMessage ? <div className="error-box">{errorMessage}</div> : null}

        <div className="table-wrap">
          <table className="monitor-table">
            <thead>
              <tr>
                <th>OPERADOR</th>
                <th>MAQUINA</th>
                <th>PEDIDO</th>
                <th>PLANO (SAIDA CNC)</th>
                <th>DURACAO</th>
                <th>CONCLUSAO</th>
              </tr>
            </thead>
            <tbody>
              {snapshot?.activeItems.map((row, index) => (
                <tr key={`active-${row.maquina}-${row.plano}-${index}`} className={row.isDelayed ? "delayed" : "active"}>
                  <td>{row.operador}</td>
                  <td>{row.maquina}</td>
                  <td>{row.pedido}</td>
                  <td>{row.plano}</td>
                  <td>{row.duracao}</td>
                  <td>{row.conclusao}</td>
                </tr>
              ))}
              {snapshot?.historyItems.map((row, index) => (
                <tr key={`history-${row.maquina}-${row.plano}-${row.conclusao}-${index}`} className="history">
                  <td>{row.operador}</td>
                  <td>{row.maquina}</td>
                  <td>{row.pedido}</td>
                  <td>{row.plano}</td>
                  <td>{row.duracao}</td>
                  <td>{row.conclusao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default App;
