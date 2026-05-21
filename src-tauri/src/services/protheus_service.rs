use serde::{Deserialize, Serialize};
use crate::error::AppError;
use crate::services::config_service::ConfigService;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;
use once_cell::sync::Lazy;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProtheusOp {
    pub numero: String,
    pub produto: String,
    pub quantidade: f64,
    pub status: String,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    expires_in: u64,
}

struct AuthState {
    token: Option<String>,
    expires_at: Option<Instant>,
}

static AUTH_STATE: Lazy<Mutex<AuthState>> = Lazy::new(|| {
    Mutex::new(AuthState {
        token: None,
        expires_at: None,
    })
});

pub struct ProtheusService;

impl ProtheusService {
    async fn get_token() -> Result<String, AppError> {
        let mut state = AUTH_STATE.lock().await;

        if let (Some(token), Some(expires_at)) = (&state.token, state.expires_at) {
            if Instant::now() < expires_at {
                return Ok(token.clone());
            }
        }

        let config = ConfigService::load()?;
        let client = reqwest::Client::new();

        // POST /api/oauth2/v1/token?grant_type=client_credentials&client_id={id}&client_secret={secret}
        let url = format!(
            "{}/api/oauth2/v1/token",
            config.protheus_url.trim_end_matches('/')
        );

        let response = client
            .post(&url)
            .query(&[
                ("grant_type", "client_credentials"),
                ("client_id", &config.protheus_client_id),
                ("client_secret", &config.protheus_client_secret),
            ])
            .send()
            .await
            .map_err(|e| AppError::Io(format!("Falha ao obter token Protheus: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AppError::Config(format!(
                "Erro Protheus Auth ({}): {}",
                status, body
            )));
        }

        let data: TokenResponse = response
            .json()
            .await
            .map_err(|e| AppError::Internal(format!("Erro ao parsear token Protheus: {}", e)))?;

        state.token = Some(data.access_token.clone());
        state.expires_at = Some(Instant::now() + Duration::from_secs(data.expires_in.saturating_sub(60)));

        Ok(data.access_token)
    }

    pub async fn fetch_op_data(op_number: &str) -> Result<ProtheusOp, AppError> {
        let token = Self::get_token().await?;
        let config = ConfigService::load()?;

        let url = format!(
            "{}/api/v1/ops/{}",
            config.protheus_url.trim_end_matches('/'),
            op_number
        );

        let client = reqwest::Client::new();
        let response = client
            .get(&url)
            .bearer_auth(token)
            .header("tenantId", &config.protheus_tenant_id) // Ex: "01,01"
            .send()
            .await
            .map_err(|e| AppError::Io(format!("Falha ao conectar com Protheus: {}", e)))?;

        if response.status().is_success() {
            let op: ProtheusOp = response
                .json()
                .await
                .map_err(|e| AppError::Internal(format!("Erro ao processar resposta do Protheus: {}", e)))?;
            Ok(op)
        } else {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            Err(AppError::Config(format!("Protheus retornou erro ({}): {}", status, body)))
        }
    }
}
