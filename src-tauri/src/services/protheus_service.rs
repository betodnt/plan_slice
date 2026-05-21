use serde::{Deserialize, Serialize};
use crate::error::AppError;
use crate::services::config_service::ConfigService;

#[derive(Debug, Serialize, Deserialize)]
pub struct ProtheusOp {
    pub numero: String,
    pub produto: String,
    pub quantidade: f64,
    pub status: String,
}

pub struct ProtheusService;

impl ProtheusService {
    pub async fn fetch_op_data(op_number: &str) -> Result<ProtheusOp, AppError> {
        // Exemplo de integração baseada na documentação da TOTVS (REST API)
        // Para SOAP, seria necessário utilizar uma crate como `xml-rs` ou `reqwest` com envelopes XML.

        let config = ConfigService::load()?;
        let base_url = &config.protheus_url;
        let url = format!("{}/api/v1/ops/{}", base_url, op_number);

        let client = reqwest::Client::new();
        let response = client
            .get(&url)
            .basic_auth("usuario", Some("senha")) // Credenciais configuradas no Protheus
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
            Err(AppError::Config(format!("Protheus retornou erro: {}", response.status())))
        }
    }
}
