use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct PathStatus {
    pub label: String,
    pub path: String,
    pub exists: bool,
    pub is_dir: bool,
}