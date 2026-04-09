import type { FormEvent, RefObject } from 'react';
import type { ConfigPaths, MonitorLoginForm } from '../../types';

type MonitorAccessModalProps = {
  open: boolean;
  onClose: () => void;
  isAdminAuthenticated: boolean;
  monitorLoginLoading: boolean;
  monitorLoginError: string;
  monitorLoginForm: MonitorLoginForm;
  monitorUsernameRef: RefObject<HTMLInputElement | null>;
  onMonitorLoginFormChange: (patch: Partial<MonitorLoginForm>) => void;
  onConfirmMonitorLogin: (event?: FormEvent) => void | Promise<void>;
  configPaths: ConfigPaths;
  onConfigPathsChange: (patch: Partial<ConfigPaths>) => void;
  onSaveConfig: () => void | Promise<void>;
  loading: boolean;
};

const inputClass =
  'w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-60';

const secondaryButtonClass =
  'inline-flex min-w-28 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition-colors duration-150 hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50';

const primaryButtonClass =
  'inline-flex min-w-28 items-center justify-center rounded-lg border border-emerald-500 bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors duration-150 hover:border-emerald-400 hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50';

export function MonitorAccessModal({
  open,
  onClose,
  isAdminAuthenticated,
  monitorLoginLoading,
  monitorLoginError,
  monitorLoginForm,
  monitorUsernameRef,
  onMonitorLoginFormChange,
  onConfirmMonitorLogin,
  configPaths,
  onConfigPathsChange,
  onSaveConfig,
  loading,
}: MonitorAccessModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 px-4 py-6"
      onClick={onClose}
      aria-hidden="true"
    >
      <section
        className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-100 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="monitor-access-modal-title"
      >
        {!isAdminAuthenticated ? (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
              Acesso restrito
            </p>
            <h3 id="monitor-access-modal-title" className="text-xl font-semibold text-zinc-100">
              Login Administrativo
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              Informe as credenciais para acessar as configuracoes do monitor.
            </p>

            <form className="mt-6 space-y-5" onSubmit={onConfirmMonitorLogin}>
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Usuario
                </span>
                <input
                  ref={monitorUsernameRef}
                  className={inputClass}
                  value={monitorLoginForm.username}
                  onChange={(event) =>
                    onMonitorLoginFormChange({
                      username: event.target.value,
                    })
                  }
                  disabled={monitorLoginLoading}
                  autoComplete="username"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Senha
                </span>
                <input
                  type="password"
                  className={inputClass}
                  value={monitorLoginForm.password}
                  onChange={(event) =>
                    onMonitorLoginFormChange({
                      password: event.target.value,
                    })
                  }
                  disabled={monitorLoginLoading}
                  autoComplete="current-password"
                />
              </label>

              {monitorLoginError ? (
                <div
                  className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-300"
                  role="alert"
                >
                  {monitorLoginError}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={onClose}
                  disabled={monitorLoginLoading}
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className={primaryButtonClass}
                  disabled={monitorLoginLoading}
                >
                  {monitorLoginLoading ? 'VALIDANDO...' : 'ENTRAR'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-4 border-b border-zinc-800 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                  Configuracoes
                </p>
                <h3 id="monitor-access-modal-title" className="text-xl font-semibold text-zinc-100">
                  Caminhos do Sistema
                </h3>
                <p className="max-w-xl text-sm text-zinc-400">
                  Ajuste a maquina e o armazenamento compartilhado.
                </p>
              </div>
            </div>

            <div className="mt-6 h-[460px] space-y-5 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    APP_ENV
                  </span>
                  <select
                    className={inputClass}
                    value={configPaths.app_env}
                    onChange={(e) =>
                      onConfigPathsChange({
                        app_env: e.target.value,
                      })
                    }
                  >
                    <option value="production">production</option>
                    <option value="development">development</option>
                  </select>
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Nome da maquina
                  </span>
                  <input
                    className={inputClass}
                    value={configPaths.machine_name}
                    onChange={(e) =>
                      onConfigPathsChange({
                        machine_name: e.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Armazenamento compartilhado (.plan_slice)
                </span>
                <input
                  className={inputClass}
                  value={configPaths.shared_store}
                  onChange={(e) =>
                    onConfigPathsChange({
                      shared_store: e.target.value,
                    })
                  }
                  placeholder="Ex: V:\8. CONTROLE DE PRODUÇÃO\3. DADOS\.plan_slice"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Caminho Base (Production)
                </span>
                <input
                  className={inputClass}
                  value={configPaths.production_base_path}
                  onChange={(e) =>
                    onConfigPathsChange({
                      production_base_path: e.target.value,
                    })
                  }
                />
              </label>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Caminho Servidor (Saídas)
                  </span>
                  <input
                    className={inputClass}
                    value={configPaths.server_path}
                    onChange={(e) =>
                      onConfigPathsChange({
                        server_path: e.target.value,
                      })
                    }
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Caminho Saídas CNC
                  </span>
                  <input
                    className={inputClass}
                    value={configPaths.saidas_cnc_path}
                    onChange={(e) =>
                      onConfigPathsChange({
                        saidas_cnc_path: e.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Caminho Saídas Cortadas
                  </span>
                  <input
                    className={inputClass}
                    value={configPaths.saidas_cortadas_path}
                    onChange={(e) =>
                      onConfigPathsChange({
                        saidas_cortadas_path: e.target.value,
                      })
                    }
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Caminho PDF Planos
                  </span>
                  <input
                    className={inputClass}
                    value={configPaths.pdf_planos_path}
                    onChange={(e) =>
                      onConfigPathsChange({
                        pdf_planos_path: e.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 border-t border-zinc-800 pt-4">
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Lock Timeout (segundos)
                  </span>
                  <input
                    type="number"
                    className={inputClass}
                    value={configPaths.lock_timeout_seconds}
                    onChange={(e) =>
                      onConfigPathsChange({
                        lock_timeout_seconds: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Lock Stale (segundos)
                  </span>
                  <input
                    type="number"
                    className={inputClass}
                    value={configPaths.store_lock_stale_seconds}
                    onChange={(e) =>
                      onConfigPathsChange({
                        store_lock_stale_seconds: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-5 border-t border-zinc-800 sm:flex-row sm:justify-end">
              <button type="button" className={secondaryButtonClass} onClick={onClose}>
                FECHAR
              </button>
              <button
                type="button"
                className={primaryButtonClass}
                onClick={() => {
                  void onSaveConfig();
                }}
                disabled={loading}
              >
                {loading ? 'SALVANDO...' : 'SALVAR'}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}