# Plano Slice

Aplicação Tauri + React para controle de corte CNC com operação em várias máquinas ao mesmo tempo.

## Pré-requisitos

- **Node.js** (v18+)
- **Rust** e dependências do Tauri
- **npm**

## Instalação e Execução

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Rode em modo de desenvolvimento:
   ```bash
   npm run tauri dev
   ```

3. Build para produção:
   ```bash
   npm run tauri build
   ```

## Implantação

Cada PC deve rodar com:

- `APP_ENV=production`
- `MACHINE_NAME` exclusivo por maquina
- `APP_SHARED_STORE_PATH` apontando para a mesma pasta de rede em todos os PCs

Exemplo pronto: `src-tauri/.env.example`


## Comportamento

- A tela principal mostra o historico somente do operador selecionado.
- O monitor mostra em tempo real o que todos os operadores estao cortando.
- O bloqueio de saida CNC e compartilhado entre os PCs pelo `store.json` na rede.

## Observacoes

- `APP_LOCAL_STORE_PATH` fica reservado para desenvolvimento.
- Em producao, o armazenamento compartilhado e obrigatorio para manter o monitor global consistente.

## Futuro e Evolução

Estamos planejando a evolução do Plano Slice para um modelo SaaS com integração nativa ao ERP TOTVS Protheus.
Para mais detalhes sobre a arquitetura proposta e o roadmap de integração, consulte:
- [Plano de Evolução: SaaS & Integração TOTVS Protheus](SAAS_INTEGRATION_PLAN.md)
