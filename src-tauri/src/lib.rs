use chrono::{Local, NaiveDate};
use quick_xml::events::Event;
use quick_xml::Reader;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

const REFRESH_INTERVAL_MS: u64 = 5000;
const WARNING_THRESHOLD_SECONDS: u64 = 3600;
const DELAYED_COLOR: &str = "#c0392b";
const DIM_COLOR: &str = "#e0e0e0";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct LockInfo {
    maquina: Option<String>,
    saida: Option<String>,
    operador: Option<String>,
    pedido: Option<String>,
    timestamp: Option<f64>,
    heartbeat_at: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MonitorRow {
    operador: String,
    maquina: String,
    pedido: String,
    plano: String,
    duracao: String,
    conclusao: String,
    row_type: String,
    is_delayed: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MonitorSnapshot {
    active_items: Vec<MonitorRow>,
    history_items: Vec<MonitorRow>,
    history_total: usize,
    count: usize,
    status_text: String,
    status_color: String,
    selected_date: String,
    refresh_interval_ms: u64,
    locks_file_path: String,
    xml_file_path: String,
}

#[derive(Debug, Clone, Default)]
struct MonitorCache {
    xml_path: String,
    last_mtime: u64,
    history_items: Vec<MonitorRow>,
}

struct AppState {
    cache: Mutex<MonitorCache>,
}

fn now_hms() -> String {
    Local::now().format("%H:%M:%S").to_string()
}

fn app_root() -> Result<PathBuf, String> {
    std::env::current_dir().map_err(|e| format!("Nao foi possivel obter a pasta atual: {e}"))
}

fn resolve_runtime_path(value: &str) -> Result<PathBuf, String> {
    let root = app_root()?;
    let normalized = value.replace('/', "\\");
    if normalized.starts_with("\\\\") || normalized.starts_with("//") {
        return Ok(PathBuf::from(value));
    }

    let path = PathBuf::from(&normalized);
    if path.is_absolute() {
        return Ok(path);
    }

    if normalized.starts_with(".\\") || normalized.starts_with("./") {
        return Ok(root.join(&normalized[2..]));
    }

    Ok(root.join(normalized))
}

fn get_locks_file_path() -> Result<PathBuf, String> {
    let env_path = std::env::var("PCP_LOCKS_FILE")
        .unwrap_or_else(|_| "./Public/app_data/active_locks.json".to_string());
    resolve_runtime_path(&env_path)
}

fn normalize_view_date(view_date: Option<String>) -> String {
    match view_date {
        Some(value) if !value.trim().is_empty() => value.trim().to_string(),
        _ => Local::now().format("%d/%m/%Y").to_string(),
    }
}

fn get_xml_file_path(view_date: &str) -> Result<PathBuf, String> {
    let date = NaiveDate::parse_from_str(view_date, "%d/%m/%Y")
        .map_err(|_| "Data invalida. Use o formato dd/mm/aaaa.".to_string())?;
    let date_str = date.format("%Y-%m-%d").to_string();
    let template = std::env::var("PCP_DADOS_XML")
        .unwrap_or_else(|_| "./Public/dados/dados_{date}.xml".to_string())
        .replace("{date}", &date_str);
    resolve_runtime_path(&template)
}

fn read_locks(path: &Path) -> HashMap<String, LockInfo> {
    let content = match fs::read_to_string(path) {
        Ok(content) => content,
        Err(_) => return HashMap::new(),
    };

    serde_json::from_str::<HashMap<String, LockInfo>>(&content).unwrap_or_default()
}

fn format_duration(total_seconds: u64) -> String {
    let h = total_seconds / 3600;
    let m = (total_seconds % 3600) / 60;
    let s = total_seconds % 60;

    if h > 0 {
        format!("{h:02}:{m:02}:{s:02}")
    } else {
        format!("{m:02}:{s:02}")
    }
}

fn active_rows_for_today(view_date: &str, locks_path: &Path) -> Vec<MonitorRow> {
    let today = Local::now().format("%d/%m/%Y").to_string();
    if view_date != today {
        return Vec::new();
    }

    let now_secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_secs_f64())
        .unwrap_or(0.0);

    let mut rows = read_locks(locks_path)
        .into_iter()
        .map(|(_, data)| {
            let started_at = data.timestamp.unwrap_or(now_secs);
            let elapsed = if now_secs > started_at {
                (now_secs - started_at) as u64
            } else {
                0
            };

            MonitorRow {
                operador: data.operador.unwrap_or_else(|| "-".to_string()),
                maquina: data.maquina.unwrap_or_else(|| "-".to_string()),
                pedido: data.pedido.unwrap_or_else(|| "-".to_string()),
                plano: data.saida.unwrap_or_else(|| "-".to_string()),
                duracao: format_duration(elapsed),
                conclusao: String::new(),
                row_type: "active".to_string(),
                is_delayed: elapsed > WARNING_THRESHOLD_SECONDS,
            }
        })
        .collect::<Vec<_>>();

    rows.sort_by(|left, right| {
        left.maquina
            .cmp(&right.maquina)
            .then_with(|| left.plano.cmp(&right.plano))
    });
    rows
}

fn modified_millis(path: &Path) -> Result<u64, String> {
    let metadata = fs::metadata(path)
        .map_err(|e| format!("Nao foi possivel acessar {}: {e}", path.display()))?;
    let modified = metadata
        .modified()
        .map_err(|e| format!("Nao foi possivel ler a data de modificacao de {}: {e}", path.display()))?;
    modified
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_millis() as u64)
        .map_err(|e| format!("Data de modificacao invalida em {}: {e}", path.display()))
}

fn parse_history_rows(xml_content: &str) -> Result<Vec<MonitorRow>, String> {
    let mut reader = Reader::from_str(xml_content);
    reader.config_mut().trim_text(true);
    let mut buffer = Vec::new();

    let mut rows = Vec::new();
    let mut current_tag = String::new();
    let mut current_entry: HashMap<String, String> = HashMap::new();
    let mut inside_entry = false;

    loop {
        match reader.read_event_into(&mut buffer) {
            Ok(Event::Start(event)) => {
                current_tag = String::from_utf8_lossy(event.name().as_ref()).to_string();
                if current_tag == "Entrada" {
                    current_entry.clear();
                    inside_entry = true;
                }
            }
            Ok(Event::Text(event)) => {
                if inside_entry && !current_tag.is_empty() {
                    let text = String::from_utf8_lossy(event.as_ref()).to_string();
                    current_entry.insert(current_tag.clone(), text);
                }
            }
            Ok(Event::End(event)) => {
                let tag = String::from_utf8_lossy(event.name().as_ref()).to_string();
                if tag == "Entrada" {
                    if let Some(end_value) = current_entry.get("DataHoraTermino") {
                        let conclusao = end_value
                            .split_whitespace()
                            .nth(1)
                            .unwrap_or(end_value)
                            .to_string();

                        rows.push(MonitorRow {
                            operador: current_entry
                                .get("Operador")
                                .cloned()
                                .unwrap_or_else(|| "-".to_string()),
                            maquina: current_entry
                                .get("Maquina")
                                .cloned()
                                .unwrap_or_else(|| "-".to_string()),
                            pedido: current_entry
                                .get("Pedido")
                                .cloned()
                                .unwrap_or_else(|| "-".to_string()),
                            plano: current_entry
                                .get("Saida")
                                .cloned()
                                .unwrap_or_else(|| "-".to_string()),
                            duracao: current_entry
                                .get("TempoDecorrido")
                                .cloned()
                                .unwrap_or_else(|| "-".to_string()),
                            conclusao,
                            row_type: "history".to_string(),
                            is_delayed: false,
                        });
                    }
                    current_entry.clear();
                    inside_entry = false;
                }
                current_tag.clear();
            }
            Ok(Event::Eof) => break,
            Err(error) => return Err(format!("Falha ao ler XML: {error}")),
            _ => {}
        }

        buffer.clear();
    }

    rows.reverse();
    Ok(rows)
}

fn load_history_rows(
    state: &tauri::State<'_, AppState>,
    xml_path: &Path,
) -> (Vec<MonitorRow>, String, String) {
    if !xml_path.exists() {
        return (Vec::new(), format!("atualizado {}", now_hms()), DIM_COLOR.to_string());
    }

    let mtime = match modified_millis(xml_path) {
        Ok(value) => value,
        Err(error) => return (Vec::new(), error, DELAYED_COLOR.to_string()),
    };

    let mut cache = match state.cache.lock() {
        Ok(cache) => cache,
        Err(_) => {
            return (
                Vec::new(),
                "falha ao acessar cache do monitor".to_string(),
                DELAYED_COLOR.to_string(),
            )
        }
    };

    let cache_hit = cache.xml_path == xml_path.to_string_lossy() && cache.last_mtime == mtime;
    if cache_hit {
        return (
            cache.history_items.clone(),
            format!("atualizado {}", now_hms()),
            DIM_COLOR.to_string(),
        );
    }

    let xml_content = match fs::read_to_string(xml_path) {
        Ok(content) => content,
        Err(error) => {
            return (
                cache.history_items.clone(),
                format!("falha ao ler historico XML: {error}"),
                DELAYED_COLOR.to_string(),
            )
        }
    };

    match parse_history_rows(&xml_content) {
        Ok(rows) => {
            cache.xml_path = xml_path.to_string_lossy().to_string();
            cache.last_mtime = mtime;
            cache.history_items = rows.clone();
            (rows, format!("atualizado {}", now_hms()), DIM_COLOR.to_string())
        }
        Err(error) => (cache.history_items.clone(), error, DELAYED_COLOR.to_string()),
    }
}

#[tauri::command]
fn get_monitor_snapshot(
    view_date: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<MonitorSnapshot, String> {
    let selected_date = normalize_view_date(view_date);
    let locks_file_path = get_locks_file_path()?;
    let xml_file_path = get_xml_file_path(&selected_date)?;

    let active_items = active_rows_for_today(&selected_date, &locks_file_path);
    let (all_history_items, status_text, status_color) = load_history_rows(&state, &xml_file_path);
    let history_total = all_history_items.len();
    let history_items = all_history_items.into_iter().take(100).collect::<Vec<_>>();

    Ok(MonitorSnapshot {
        count: active_items.len(),
        active_items,
        history_items,
        history_total,
        status_text,
        status_color,
        selected_date,
        refresh_interval_ms: REFRESH_INTERVAL_MS,
        locks_file_path: locks_file_path.to_string_lossy().to_string(),
        xml_file_path: xml_file_path.to_string_lossy().to_string(),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            cache: Mutex::new(MonitorCache::default()),
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_monitor_snapshot])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
