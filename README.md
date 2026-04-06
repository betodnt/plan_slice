# Plano Slice

Aplicacao Tauri + React para controle de corte CNC com operacao em varias maquinas ao mesmo tempo.

## Implantacao

Cada PC deve rodar com:

- `APP_ENV=production`
- `MACHINE_NAME` exclusivo por maquina
- `APP_SHARED_STORE_PATH` apontando para a mesma pasta de rede em todos os PCs

Exemplo pronto: `src-tauri/.env.example`

## Abrir 6 apps ao mesmo tempo

Para testar no mesmo PC com 6 instancias, use:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\open-6-apps.ps1
```

O script abre 6 processos com `MACHINE_NAME` diferente em cada janela e todos usando o mesmo `APP_SHARED_STORE_PATH`.

Se o executavel estiver em outro lugar:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\open-6-apps.ps1 -AppPath "C:\caminho\Plano de Corte.exe"
```

## Comportamento

- A tela principal mostra o historico somente do operador selecionado.
- O monitor mostra em tempo real o que todos os operadores estao cortando.
- O bloqueio de saida CNC e compartilhado entre os PCs pelo `store.json` na rede.

## Observacoes

- `APP_LOCAL_STORE_PATH` fica reservado para desenvolvimento.
- Em producao, o armazenamento compartilhado e obrigatorio para manter o monitor global consistente.
