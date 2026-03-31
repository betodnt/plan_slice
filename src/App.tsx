import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [status, setStatus] = useState("Parado");
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Atualizar status periodicamente
    const interval = setInterval(async () => {
      try {
        const currentStatus = await invoke("get_cut_status");
        setStatus(currentStatus);
        setIsRunning(currentStatus === "Cortando");
      } catch (error) {
        console.error("Erro ao obter status:", error);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  async function startCut() {
    try {
      await invoke("start_cut");
      setStatus("Cortando");
      setIsRunning(true);
    } catch (error) {
      console.error("Erro ao iniciar corte:", error);
    }
  }

  async function stopCut() {
    try {
      await invoke("stop_cut");
      setStatus("Parado");
      setIsRunning(false);
    } catch (error) {
      console.error("Erro ao parar corte:", error);
    }
  }

  return (
    <main className="container">
      <h1>Controle de Corte</h1>

      <div className="status">
        <h2>Status: {status}</h2>
      </div>

      <div className="controls">
        <button onClick={startCut} disabled={isRunning}>
          Iniciar Corte
        </button>
        <button onClick={stopCut} disabled={!isRunning}>
          Parar Corte
        </button>
      </div>

      <div className="parameters">
        <label>
          Parâmetro de Corte:
          <input type="number" placeholder="Ex: 10" />
        </label>
      </div>
    </main>
  );
}

export default App;
