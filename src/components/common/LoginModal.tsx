import { FormEvent, RefObject, useEffect, useState } from 'react';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import type { ConfigPaths, MonitorLoginForm } from '../../types';

type LoginModalProps = {
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
  title?: string;
  subtitle?: string;
};

const inputClass =
  'w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 transition-all';

const secondaryButtonClass =
  'inline-flex min-w-28 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition-all duration-150 hover:bg-zinc-700 hover:border-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/70 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97]';

const primaryButtonClass =
  'inline-flex min-w-28 items-center justify-center rounded-xl border border-emerald-500 bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-all duration-150 hover:border-emerald-400 hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97]';

const labelSpanClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500';

type TabType = 'caminhos' | 'avancado';

export function LoginModal({
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
  title = 'Configuracoes',
  subtitle = 'Gerencie os parametros e caminhos do sistema.',
}: LoginModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('caminhos');

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 px-4 py-6 backdrop-blur-[4px] animate-in fade-in duration-200"
      onClick={onClose}
      aria-hidden="true"
    >
      <section
        className="w-full max-w-3xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 text-zinc-100 shadow-2xl shadow-black/60 animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
      >
        {!isAdminAuthenticated ? (
          <div className="p-8">
            <div className="mb-6">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-500">
                Acesso Restrito
              </p>
              <h3 id="login-modal-title" className="text-2xl font-bold text-zinc-100">
                Login Administrativo
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Informe as credenciais para acessar as configuracoes do sistema.
              </p>
            </div>

            <form className="space-y-5" onSubmit={onConfirmMonitorLogin}>
              <div className="space-y-4">
                <label className="block">
                  <span className={labelSpanClass}>Usuario</span>
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
                    placeholder="Seu usuario"
                  />
                </label>

                <label className="block">
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
                    placeholder="••••••••"
                  />
                </label>
              </div>

              {monitorLoginError ? (
                <div
                  className="mt-4 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
                  role="alert"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {monitorLoginError}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
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
                  {monitorLoginLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      VALIDANDO...
                    </span>
                  ) : (
                    'ENTRAR'
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="border-b border-zinc-800 bg-zinc-900/50 p-6 pb-0">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 id="login-modal-title" className="text-2xl font-bold text-zinc-100">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    {subtitle}
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-1">
                  {(['caminhos', 'avancado'] as TabType[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`rounded-xl px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                        activeTab === tab
                          ? 'bg-emerald-500 text-zinc-950 shadow-lg'
                          : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'
                      }`}
                    >
                      {tab === 'caminhos' ? 'Caminhos' : 'Avancado'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-8 pt-6 custom-scrollbar">
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'caminhos' && (
                  <div className="space-y-6">
                    <label className="block">
                      <span className={labelSpanClass}>Armazenamento compartilhado (.plan_slice)</span>
                      <div className="flex gap-2">
                        <input
                          className={inputClass}
                          value={configPaths.shared_store}
                          onChange={(e) =>
                            onConfigPathsChange({
                              shared_store: e.target.value,
                            })
                          }
                        />
                        <button
                          type="button"
                          onClick={() => handleBrowse('shared_store')}
                          className="flex h-[42px] w-12 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 transition-colors hover:bg-zinc-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
                        </button>
                      </div>
                    </label>

                    <label className="block">
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
                          className="flex h-[42px] w-12 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 transition-colors hover:bg-zinc-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
                        </button>
                      </div>
                    </label>

                    <div className="grid grid-cols-1 gap-6 border-t border-zinc-800 pt-6 sm:grid-cols-2">
                      {[
                        { label: 'Servidor (Saidas)', key: 'server_path' },
                        { label: 'Saidas CNC', key: 'saidas_cnc_path' },
                        { label: 'Saidas Cortadas', key: 'saidas_cortadas_path' },
                        { label: 'PDF Planos', key: 'pdf_planos_path' },
                        { label: 'Pasta de Locks', key: 'lock_dir' },
                      ].map((item) => (
                        <label key={item.key} className="block">
                          <span className={labelSpanClass}>{item.label}</span>
                          <div className="flex gap-2">
                            <input
                              className={inputClass}
                              value={configPaths[item.key as keyof ConfigPaths] as string}
                              onChange={(e) =>
                                onConfigPathsChange({
                                  [item.key]: e.target.value,
                                })
                              }
                            />
                            <button
                              type="button"
                              onClick={() => handleBrowse(item.key as keyof ConfigPaths)}
                              className="flex h-[42px] w-10 flex-shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 transition-colors hover:bg-zinc-700"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
                            </button>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'avancado' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <label className="block">
                        <span className={labelSpanClass}>Nome da maquina</span>
                        <input
                          className={inputClass}
                          value={configPaths.machine_name}
                          onChange={(e) =>
                            onConfigPathsChange({
                              machine_name: e.target.value,
                            })
                          }
                          placeholder="Ex: SERRA-01"
                        />
                      </label>
                      <label className="block">
                        <span className={labelSpanClass}>Ambiente (APP_ENV)</span>
                        <select
                          className={inputClass}
                          value={configPaths.app_env}
                          onChange={(e) =>
                            onConfigPathsChange({
                              app_env: e.target.value,
                            })
                          }
                        >
                          <option value="production">Production</option>
                          <option value="development">Development</option>
                        </select>
                      </label>
                    </div>

                    <div className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-950/30 p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-500/80">Credenciais do Monitor</p>
                      <p className="text-sm text-zinc-300">Usuario padrao: <strong>PCPCARDEROLI</strong></p>
                      <p className="text-sm text-zinc-300">Senha padrao: <strong>pcp2026</strong></p>
                      <p className="text-[11px] text-zinc-500">
                        As credenciais administrativas ficaram fixas no backend para manter o mesmo acesso em qualquer instancia local.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 border-t border-zinc-800 pt-6 sm:grid-cols-2">
                      <label className="block">
                        <span className={labelSpanClass}>Lock Timeout (segundos)</span>
                        <input
                          type="number"
                          className={inputClass}
                          value={configPaths.lock_timeout_seconds}
                          onChange={(e) =>
                            onConfigPathsChange({
                              lock_timeout_seconds: parseInt(e.target.value, 10) || 0,
                            })
                          }
                        />
                        <p className="mt-1.5 text-[10px] text-zinc-500">Tempo maximo que um plano pode ficar travado.</p>
                      </label>
                      <label className="block">
                        <span className={labelSpanClass}>Lock Stale (segundos)</span>
                        <input
                          type="number"
                          className={inputClass}
                          value={configPaths.store_lock_stale_seconds}
                          onChange={(e) =>
                            onConfigPathsChange({
                              store_lock_stale_seconds: parseInt(e.target.value, 10) || 0,
                            })
                          }
                        />
                        <p className="mt-1.5 text-[10px] text-zinc-500">Intervalo para considerar um lock como obsoleto.</p>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 bg-zinc-900/50 p-6 sm:flex-row sm:justify-end">
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
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    SALVANDO...
                  </span>
                ) : (
                  'SALVAR ALTERACOES'
                )}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
