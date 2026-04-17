import { FormEvent, RefObject, useEffect } from 'react';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
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
  'w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50';

const secondaryButtonClass =
  'inline-flex min-w-28 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition-all duration-150 hover:bg-zinc-700 hover:border-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/70 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97]';

const primaryButtonClass =
  'inline-flex min-w-28 items-center justify-center rounded-xl border border-emerald-500 bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-all duration-150 hover:border-emerald-400 hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97]';

const labelSpanClass = 'text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500';

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
  const handleBrowse = async (key: keyof ConfigPaths) => {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        title: 'Selecionar Pasta',
      });
      if (selected && typeof selected === 'string') {
        onConfigPathsChange({ [key]: selected });
      }
    } catch (err) {
      console.error('Falha ao abrir seletor de pastas:', err);
    }
  };

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !monitorLoginLoading && !loading) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, monitorLoginLoading, loading, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 px-4 py-6 backdrop-blur-[2px]"
      onClick={onClose}
      aria-hidden="true"
    >
      <section
        className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-100 shadow-2xl shadow-black/40"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="monitor-access-modal-title"
      >
        {!isAdminAuthenticated ? (
          <>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Acesso restrito
            </p>
            <h3 id="monitor-access-modal-title" className="text-xl font-semibold text-zinc-100">
              Login Administrativo
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              Informe as credenciais para acessar as configurações do monitor.
            </p>

            <form className="mt-6 space-y-5" onSubmit={onConfirmMonitorLogin}>
              <label className="block space-y-2">
                <span className={labelSpanClass}>Usuário</span>
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
                <span className={labelSpanClass}>Senha</span>
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
                  className="rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-2.5 text-sm text-red-300"
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
            <div className="flex flex-col gap-3 border-b border-zinc-800 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Configurações
                </p>
                <h3 id="monitor-access-modal-title" className="text-xl font-semibold text-zinc-100">
                  Caminhos do Sistema
                </h3>
                <p className="max-w-xl text-sm text-zinc-400">
                  Ajuste a máquina e o armazenamento compartilhado.
                </p>
              </div>
            </div>

            <div className="mt-5 max-h-[460px] space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {/* APP_ENV + Máquina */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className={labelSpanClass}>APP_ENV</span>
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
                <label className="block space-y-1.5">
                  <span className={labelSpanClass}>Nome da máquina</span>
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

              {/* Armazenamento */}
              <label className="block space-y-1.5">
                <span className={labelSpanClass}>
                  Armazenamento compartilhado (.plan_slice)
                </span>
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    value={configPaths.shared_store}
                    onChange={(e) =>
                      onConfigPathsChange({
                        shared_store: e.target.value,
                      })
                    }
                    placeholder={'Ex: V:\\8. CONTROLE DE PRODUÇÃO\\3. DADOS\\.plan_slice'}
                  />
                  <button
                    type="button"
                    onClick={() => handleBrowse('shared_store')}
                    className={secondaryButtonClass + " !min-w-12 !px-0"}
                    title="Procurar pasta"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                    </svg>
                  </button>
                </div>
              </label>

              {/* Caminho Base */}
              <label className="block space-y-1.5">
                <span className={labelSpanClass}>Caminho Base (Production)</span>
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    value={configPaths.production_base_path}
                    onChange={(e) =>
                      onConfigPathsChange({
                        production_base_path: e.target.value,
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => handleBrowse('production_base_path')}
                    className={secondaryButtonClass + " !min-w-12 !px-0"}
                    title="Procurar pasta"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                    </svg>
                  </button>
                </div>
              </label>

              {/* Servidor + CNC */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className={labelSpanClass}>Caminho Servidor (Saídas)</span>
                  <div className="flex gap-2">
                    <input
                      className={inputClass}
                      value={configPaths.server_path}
                      onChange={(e) =>
                        onConfigPathsChange({
                          server_path: e.target.value,
                        })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => handleBrowse('server_path')}
                      className={secondaryButtonClass + " !min-w-10 !px-0 flex-shrink-0"}
                      title="Procurar pasta"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                      </svg>
                    </button>
                  </div>
                </label>
                <label className="block space-y-1.5">
                  <span className={labelSpanClass}>Caminho Saídas CNC</span>
                  <div className="flex gap-2">
                    <input
                      className={inputClass}
                      value={configPaths.saidas_cnc_path}
                      onChange={(e) =>
                        onConfigPathsChange({
                          saidas_cnc_path: e.target.value,
                        })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => handleBrowse('saidas_cnc_path')}
                      className={secondaryButtonClass + " !min-w-10 !px-0 flex-shrink-0"}
                      title="Procurar pasta"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                      </svg>
                    </button>
                  </div>
                </label>
              </div>

              {/* Cortadas + PDF */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className={labelSpanClass}>Caminho Saídas Cortadas</span>
                  <div className="flex gap-2">
                    <input
                      className={inputClass}
                      value={configPaths.saidas_cortadas_path}
                      onChange={(e) =>
                        onConfigPathsChange({
                          saidas_cortadas_path: e.target.value,
                        })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => handleBrowse('saidas_cortadas_path')}
                      className={secondaryButtonClass + " !min-w-10 !px-0 flex-shrink-0"}
                      title="Procurar pasta"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                      </svg>
                    </button>
                  </div>
                </label>
                <label className="block space-y-1.5">
                  <span className={labelSpanClass}>Caminho PDF Planos</span>
                  <div className="flex gap-2">
                    <input
                      className={inputClass}
                      value={configPaths.pdf_planos_path}
                      onChange={(e) =>
                        onConfigPathsChange({
                          pdf_planos_path: e.target.value,
                        })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => handleBrowse('pdf_planos_path')}
                      className={secondaryButtonClass + " !min-w-10 !px-0 flex-shrink-0"}
                      title="Procurar pasta"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                      </svg>
                    </button>
                  </div>
                </label>
              </div>

              {/* Lock Timeout + Stale */}
              <div className="grid grid-cols-1 gap-4 border-t border-zinc-800 pt-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className={labelSpanClass}>Lock Timeout (segundos)</span>
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
                <label className="block space-y-1.5">
                  <span className={labelSpanClass}>Lock Stale (segundos)</span>
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

              {/* Login Monitor */}
              <div className="grid grid-cols-1 gap-4 border-t border-zinc-800 pt-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className={labelSpanClass}>Usuário Monitor (Login)</span>
                  <input
                    className={inputClass}
                    value={configPaths.monitor_username || ''}
                    onChange={(e) =>
                      onConfigPathsChange({
                        monitor_username: e.target.value,
                      })
                    }
                    placeholder="Deixe em branco para usar o .env ou padrão"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className={labelSpanClass}>Senha Monitor (Login)</span>
                  <input
                    type="password"
                    className={inputClass}
                    value={configPaths.monitor_password || ''}
                    onChange={(e) =>
                      onConfigPathsChange({
                        monitor_password: e.target.value,
                      })
                    }
                    placeholder="Deixe em branco para usar o .env ou padrão"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:justify-end">
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