pub mod commands;
pub mod db;
pub mod error;
pub mod models;
pub mod services;
pub mod state;

use crate::state::AppState;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

const MONITOR_WINDOW_BOOTSTRAP: &str = r###"
if (window.location.href === 'about:blank') {
  const style = `
    :root {
      color-scheme: dark;
      font-family: "Segoe UI", "Cascadia Code", sans-serif;
      --bg: #111317;
      --panel: #1b2028;
      --panel-strong: #202631;
      --line: rgba(143, 160, 187, 0.16);
      --text: #ecf2fa;
      --muted: #9eacbf;
      --blue: #61afef;
      --green: #7bc275;
      --orange: #e5a34d;
      --red: #d96b75;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at top left, rgba(97,175,239,.12), transparent 28%),
        radial-gradient(circle at bottom right, rgba(229,163,77,.08), transparent 26%),
        linear-gradient(180deg, #15181e 0%, #101318 100%);
      color: var(--text);
    }
    body { padding: 24px; }
    .shell { display: grid; gap: 18px; }
    .header, .card {
      background: linear-gradient(180deg, rgba(31,36,45,.94) 0%, rgba(19,23,30,.96) 100%);
      border: 1px solid var(--line);
      box-shadow: 0 22px 54px rgba(0,0,0,.28);
    }
    .header {
      display: grid;
      grid-template-columns: minmax(320px, 1.3fr) 200px 200px minmax(260px, auto);
      gap: 16px;
      padding: 20px;
      align-items: stretch;
    }
    .hero {
      position: relative;
      padding: 22px 24px 22px 30px;
      min-height: 148px;
      background: linear-gradient(135deg, rgba(36,42,53,.94) 0%, rgba(19,23,30,.96) 100%);
    }
    .hero::before {
      content: "";
      position: absolute;
      inset: 0 auto 0 0;
      width: 6px;
      background: linear-gradient(180deg, var(--blue), rgba(97,175,239,.12));
    }
    .eyebrow {
      margin: 0;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: .2em;
      font-size: .72rem;
    }
    h1, h2 { margin: 6px 0 0; line-height: 1.05; }
    h1 { font-size: 2.2rem; }
    h2 { font-size: 1.55rem; }
    .metric {
      display: grid;
      align-content: center;
      gap: 10px;
      padding: 18px;
      background: rgba(255,255,255,.02);
    }
    .metric span {
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: .12em;
      font-size: .8rem;
    }
    .metric strong {
      color: var(--green);
      font-size: 2.8rem;
      line-height: 1;
    }
    .status {
      display: grid;
      align-content: center;
      justify-items: end;
      text-align: right;
      gap: 8px;
      color: #c9d4e3;
    }
    .status strong { color: var(--orange); }
    .card { padding: 18px; }
    .card-head {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      margin-bottom: 14px;
    }
    .card-head p {
      margin: 4px 0 0;
      color: var(--muted);
    }
    .pill {
      padding: 10px 14px;
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--text);
      background: rgba(255,255,255,.04);
      white-space: nowrap;
      font-size: .85rem;
      font-weight: 700;
    }
    .table-wrap {
      overflow: auto;
      max-height: calc(100vh - 260px);
      border: 1px solid rgba(143,160,187,.12);
      background: rgba(12,15,20,.76);
    }
    table {
      width: 100%;
      min-width: 1080px;
      border-collapse: collapse;
    }
    th, td {
      padding: 14px 16px;
      text-align: left;
      border-bottom: 1px solid rgba(255,255,255,.06);
    }
    th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: rgba(42,48,59,.98);
      color: var(--muted);
      font-size: .78rem;
      font-weight: 700;
      letter-spacing: .12em;
    }
    td { font-size: .96rem; font-weight: 600; }
    tr:hover { background: rgba(97,175,239,.06); }
    .status-active td:first-child, .status-in-progress td:first-child { color: var(--green); }
    .status-active td:nth-child(2), .status-in-progress td:nth-child(2) { color: var(--orange); }
    .status-finished-complete td:first-child { color: var(--blue); }
    .status-finished-incomplete td:first-child { color: var(--orange); }
    .notice {
      padding: 14px 16px;
      border: 1px solid rgba(217,107,117,.22);
      background: rgba(217,107,117,.12);
      color: #ffc5cb;
      margin-bottom: 14px;
      display: none;
    }
    .diag {
      color: #dbe5f2;
      font-size: .98rem;
      line-height: 1.6;
      overflow-wrap: anywhere;
    }
    .loading {
      color: var(--muted);
      font-size: 1rem;
      font-weight: 600;
      letter-spacing: .04em;
    }
    @media (max-width: 1100px) {
      .header { grid-template-columns: 1fr; }
      .status { justify-items: start; text-align: left; }
      .card-head { flex-direction: column; align-items: flex-start; }
    }
  `;

  document.open();
  document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Monitor de Operacoes</title>
        <style>${style}</style>
      </head>
      <body>
        <div class="shell">
          <div id="error" class="notice"></div>

          <section class="header">
            <div class="hero">
              <p class="eyebrow">Monitor em tempo real</p>
              <h1>Apps rodando agora</h1>
            </div>

            <div class="metric">
              <span>Operacoes ativas</span>
              <strong id="activeCount">0</strong>
            </div>

            <div class="metric">
              <span>Historico carregado</span>
              <strong id="historyCount">0</strong>
            </div>

            <div class="status">
              <span>Agora</span>
              <strong id="clock">--</strong>
              <span id="updatedAt">Atualizado em --</span>
            </div>
          </section>

          <section class="card">
            <div class="card-head">
              <div>
                <p class="eyebrow">Diagnostico</p>
                <h2>Armazenamento em uso pelo monitor</h2>
              </div>
            </div>
            <div class="diag"><strong>Store:</strong> <span id="storePath">--</span></div>
          </section>

          <section class="card">
            <div class="card-head">
              <div>
                <p class="eyebrow">Lista viva</p>
                <h2>Operador, saida CNC e data/hora</h2>
              </div>
              <div class="pill" id="activeBadge">0 em execucao</div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>OPERARIO</th>
                    <th>SAIDA CNC</th>
                    <th>MAQUINA</th>
                    <th>PEDIDO</th>
                    <th>DATA / HORA</th>
                    <th>TEMPO RODANDO</th>
                  </tr>
                </thead>
                <tbody id="activeTable">
                  <tr><td colspan="6" class="loading">Carregando operacoes em tempo real...</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="card">
            <div class="card-head">
              <div>
                <p class="eyebrow">Historico geral</p>
                <h2>Status, motivo e tempo final</h2>
              </div>
              <div class="pill" id="historyBadge">0 registros</div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>STATUS</th>
                    <th>OPERARIO</th>
                    <th>SAIDA CNC</th>
                    <th>PEDIDO</th>
                    <th>MAQUINA</th>
                    <th>FINALIZADO EM</th>
                    <th>TEMPO</th>
                    <th>MOTIVO</th>
                  </tr>
                </thead>
                <tbody id="historyTable">
                  <tr><td colspan="8" class="loading">Carregando historico...</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </body>
    </html>
  `);
  document.close();

  const errorBox = document.getElementById('error');
  const activeCount = document.getElementById('activeCount');
  const historyCount = document.getElementById('historyCount');
  const activeBadge = document.getElementById('activeBadge');
  const historyBadge = document.getElementById('historyBadge');
  const storePath = document.getElementById('storePath');
  const updatedAt = document.getElementById('updatedAt');
  const clock = document.getElementById('clock');
  const activeTable = document.getElementById('activeTable');
  const historyTable = document.getElementById('historyTable');

  const invoke = window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke;

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDateTime(value) {
    if (!value) return '--';
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'medium',
      }).format(new Date(value));
    } catch (_) {
      return String(value);
    }
  }

  function formatClock(now) {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(now);
  }

  function formatElapsedSeconds(totalSeconds) {
    const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
    const h = String(Math.floor(safeSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(safeSeconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function formatDuration(startedAt) {
    if (!startedAt) return '--';
    const start = new Date(startedAt).getTime();
    const elapsed = Math.floor((Date.now() - start) / 1000);
    return formatElapsedSeconds(elapsed);
  }

  function getVisualStatus(row) {
    if (row.status === 'started') return 'in-progress';
    return row.completed_full ? 'finished-complete' : 'finished-incomplete';
  }

  function getStatusLabel(row) {
    const visualStatus = getVisualStatus(row);
    if (visualStatus === 'in-progress') return 'EM PROCESSO';
    if (visualStatus === 'finished-complete') return 'FINALIZADO COMPLETO';
    return 'FINALIZADO INCOMPLETO';
  }

  function updateClock() {
    clock.textContent = formatClock(new Date());
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.style.display = 'block';
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.style.display = 'none';
  }

  function renderActiveRows(rows) {
    if (!rows.length) {
      activeTable.innerHTML = '<tr><td colspan="6">Nenhum app em execucao no momento.</td></tr>';
      return;
    }

    activeTable.innerHTML = rows.map((row) => `
      <tr class="status-active">
        <td>${escapeHtml(row.operator_name)}</td>
        <td>${escapeHtml(row.saida)}</td>
        <td>${escapeHtml(row.machine_name)}</td>
        <td>${escapeHtml(row.pedido)}</td>
        <td>${escapeHtml(formatDateTime(row.started_at))}</td>
        <td>${escapeHtml(formatDuration(row.started_at))}</td>
      </tr>
    `).join('');
  }

  function renderHistoryRows(rows) {
    if (!rows.length) {
      historyTable.innerHTML = '<tr><td colspan="8">Nenhum historico encontrado.</td></tr>';
      return;
    }

    historyTable.innerHTML = rows.map((row) => {
      const visualStatus = getVisualStatus(row);
      return `
        <tr class="status-${escapeHtml(visualStatus)}">
          <td>${escapeHtml(getStatusLabel(row))}</td>
          <td>${escapeHtml(row.operator_name)}</td>
          <td>${escapeHtml(row.saida)}</td>
          <td>${escapeHtml(row.pedido)}</td>
          <td>${escapeHtml(row.machine_name)}</td>
          <td>${escapeHtml(row.finished_at ? formatDateTime(row.finished_at) : '--')}</td>
          <td>${escapeHtml(row.elapsed_seconds != null ? formatElapsedSeconds(row.elapsed_seconds) : formatDuration(row.started_at))}</td>
          <td>${escapeHtml((row.incomplete_reason || '').trim() || '--')}</td>
        </tr>
      `;
    }).join('');
  }

  async function loadMonitor() {
    try {
      if (!invoke) {
        throw new Error('API interna do Tauri nao disponivel na janela do monitor.');
      }

      const [snapshot, runtime] = await Promise.all([
        invoke('get_monitor_snapshot'),
        invoke('get_runtime_config'),
      ]);

      const activeRows = [...(snapshot.active_operations || [])]
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

      const historyRows = [...(snapshot.recent_operations || [])]
        .sort((a, b) => new Date(b.finished_at || b.started_at).getTime() - new Date(a.finished_at || a.started_at).getTime())
        .slice(0, 150);

      activeCount.textContent = String(activeRows.length);
      historyCount.textContent = String(historyRows.length);
      activeBadge.textContent = `${activeRows.length} em execucao`;
      historyBadge.textContent = `${historyRows.length} registros`;
      storePath.textContent = runtime && runtime.storage_path ? runtime.storage_path : '--';
      updatedAt.textContent = `Atualizado em ${formatDateTime(snapshot.generated_at)}`;

      renderActiveRows(activeRows);
      renderHistoryRows(historyRows);
      clearError();
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      showError(`Falha ao carregar o monitor: ${message}`);
    }
  }

  updateClock();
  loadMonitor();
  window.setInterval(updateClock, 1000);
  window.setInterval(loadMonitor, 3000);
}
"###;

#[tauri::command]
fn open_monitor_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("monitor") {
        let _ = window.close();
    }

    WebviewWindowBuilder::new(
        &app,
        "monitor",
        WebviewUrl::External(
            "about:blank"
                .parse()
                .map_err(|e| format!("url invalida do monitor: {e}"))?,
        ),
    )
    .initialization_script(MONITOR_WINDOW_BOOTSTRAP)
    .title("Monitor de Operacoes")
    .inner_size(1280.0, 860.0)
    .center()
    .maximized(true)
    .resizable(true)
    .build()
    .map(|_| ())
    .map_err(|e| format!("erro ao abrir janela do monitor: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .setup(|_app| {
            dotenvy::dotenv().ok();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::system::validate_system_paths,
            commands::config_commands::get_runtime_config,
            commands::config_commands::save_config,
            commands::health_commands::get_backend_status,
            commands::health_commands::test_storage,
            commands::auth_commands::validate_monitor_login,
            commands::operation_commands::bootstrap_storage,
            commands::operation_commands::get_bootstrap_data,
            commands::operation_commands::start_operation,
            commands::operation_commands::finish_operation,
            commands::operation_commands::touch_operation_lock,
            commands::monitor_commands::get_monitor_snapshot,
            commands::file_commands::search_cnc_files,
            commands::file_commands::open_pdf,
            open_monitor_window
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar aplicacao tauri");
}
