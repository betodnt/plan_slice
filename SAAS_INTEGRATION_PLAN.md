# Plano de Evolução: SaaS & Integração TOTVS Protheus

Este documento descreve a estratégia para transformar o **Plano Slice** em uma plataforma SaaS (Software as a Service) multi-inquilino com integração nativa ao ERP **TOTVS Protheus**.

## 1. Evolução da Arquitetura

Atualmente, o sistema utiliza um modelo descentralizado com um arquivo `store.json` compartilhado em rede local. Para migrar para o modelo SaaS, propomos a seguinte transição:

### De: Local Shared Store
- Armazenamento em arquivo JSON.
- Dependência de mapeamento de rede (VPN ou LAN).
- Sem controle de acesso granular ou multi-tenancy.

### Para: Cloud Centralized Backend
- **Banco de Dados:** Migração para MySQL/PostgreSQL gerenciado (AWS RDS, Google Cloud SQL).
- **API Layer:** Criação de uma API REST/GraphQL em Rust (Axum) para gerenciar as operações.
- **Multi-tenancy:** Introdução de um `tenant_id` em todas as tabelas para isolar os dados de diferentes clientes/fábricas.

## 2. Integração com TOTVS Protheus

A integração será focada em eliminar o input manual e garantir a rastreabilidade entre o chão de fábrica e o ERP.

### Fluxo A: Importação de OPs (Protheus → Plano Slice)
- **Origem:** Tabelas `SC2` (Ordens de Produção) e `SG1` (Estrutura de Produtos).
- **Método:** O Backend do Plano Slice consome a API REST padrão do Protheus ou um WebService Customizado (AdvPL).
- **Benefício:** O operador seleciona o pedido diretamente de uma lista de OPs abertas, reduzindo erros de digitação no campo `pedido`.

### Fluxo B: Apontamento de Produção (Plano Slice → Protheus)
- **Gatilho:** Ao finalizar uma operação (`finish_operation`) no Plano Slice.
- **Método:** Chamada automática à rotina automática `MATA681` (Apontamento de Produção) via REST.
- **Dados enviados:**
    - Código do Produto.
    - Quantidade Produzida.
    - Recurso (Máquina).
    - Tempo Real de Execução (calculado pelo sistema).
- **Benefício:** Atualização do estoque e custos no ERP em tempo real sem intervenção humana.

## 3. Modelo Híbrido (Local Agent + Web Dashboard)

Como as máquinas CNC dependem de arquivos locais e conexão física, manteremos o **Tauri** como um "Agente Local":

1.  **Tauri App (Local Agent):** Continua sendo usado no PC da máquina para:
    - Movimentação de arquivos CNC físicos.
    - Visualização de PDFs técnicos.
    - Interface de baixa latência para o operador.
    - *Mudança:* Em vez de ler o `store.json`, ele se comunica via HTTPS com o Cloud Backend.

2.  **Web Dashboard (Plano Monitor SaaS):**
    - Uma interface web (React) acessível de qualquer lugar.
    - Gestores podem monitorar várias fábricas ou máquinas sem precisar do app instalado.
    - Relatórios de produtividade (OEE) consolidados.

## 4. Roadmap de Implementação

1.  **Fase 1: Cloud API:** Implementar o backend Rust com autenticação JWT e suporte a MySQL (iniciando pelos repositórios já existentes em `src-tauri/src/db`).
2.  **Fase 2: Conector Protheus:** Desenvolver o middleware para traduzir as requisições do Plano Slice para o formato esperado pelo REST do Protheus.
3.  **Fase 3: Refatoração do Client:** Atualizar o frontend React para consumir a nova API em vez de comandos locais do Tauri para persistência de dados.
4.  **Fase 4: Portal Web:** Publicar o monitor em um domínio web para acesso remoto.

---
Este plano visa aumentar o valor agregado do produto, permitindo escala e integração profunda com o ecossistema corporativo dos clientes.
