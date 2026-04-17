import { FormEvent, useEffect, useState } from 'react';
import { SettingsGlyph } from './Icons';
import type { OperatorSummary, StartOperationInput } from '../../types';

type ControlPanelProps = {
  form: StartOperationInput;
  operatorOptions: OperatorSummary[];
  runtimeMachineName?: string;
  isFormDisabled: boolean;
  availableSaidas: string[];
  pdfUrl: string | null;
  pdfTotalPages: number;
  storageOk: boolean;
  timerString: string;
  loading: boolean;
  activeOperationId: string;
  onSubmit: (event?: FormEvent) => void | Promise<void>;
  onFormChange: (patch: Partial<StartOperationInput>) => void;
  onOpenMonitorLogin: () => void;
  onPedidoLookup: () => void | Promise<void>;
  onOpenPdf: () => void | Promise<void>;
  onOpenFinishDialog: () => void;
};

const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500';

const inputClass =
  'h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm font-medium text-zinc-100 outline-none transition-colors duration-150 focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50';

const buttonBaseClass =
  'inline-flex items-center justify-center rounded-xl px-5 text-sm font-semibold uppercase tracking-[0.14em] transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97]';

export function ControlPanel({
  form,
  operatorOptions,
  runtimeMachineName,
  isFormDisabled,
  availableSaidas,
  pdfUrl,
  pdfTotalPages,
  storageOk,
  timerString,
  loading,
  activeOperationId,
  onSubmit,
  onFormChange,
  onOpenMonitorLogin,
  onPedidoLookup,
  onOpenPdf,
  onOpenFinishDialog,
}: ControlPanelProps) {
  const [previewPage, setPreviewPage] = useState(1);

  useEffect(() => {
    setPreviewPage(1);
  }, [pdfUrl]);

  return (
    <section className="flex h-full min-h-0 flex-col rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5 shadow-2xl backdrop-blur-sm lg:p-6">
      <form className="flex h-full min-h-0 flex-col" onSubmit={onSubmit}>

        {/* ── Operador + Máquina + Settings ── */}
        <div className="mb-5 flex items-end gap-3">
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Operador</span>
              <input
                className={inputClass}
                list="operator-options"
                value={form.operador}
                onChange={(e) => onFormChange({ operador: e.target.value })}
                disabled={isFormDisabled}
                placeholder="Nome do operador"
              />
            </label>

            <div className="block">
              <span className={labelClass}>Nome da máquina</span>
              <div className={`${inputClass} flex items-center bg-zinc-950/50 font-semibold text-emerald-400 cursor-default select-none`}>
                {runtimeMachineName || 'Carregando...'}
              </div>
            </div>

            <datalist id="operator-options">
              {operatorOptions.map((operator) => (
                <option key={operator.id} value={operator.name} />
              ))}
            </datalist>
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 transition-colors duration-150 hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            title="Configurações e monitor"
            onClick={onOpenMonitorLogin}
          >
            <SettingsGlyph />
          </button>
        </div>

        {/* ── Campos do formulário — grid 2×2 simétrico ── */}
        <div className="mb-5 grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Tipo</span>
            <select
              className={inputClass}
              value={form.tipo}
              onChange={(e) => onFormChange({ tipo: e.target.value })}
              disabled={isFormDisabled}
            >
              <option value="Avulso">Avulso</option>
              <option value="Estoque">Estoque</option>
              <option value="Pedido">Pedido</option>
              <option value="Reforma">Reforma</option>
              <option value="PPD">PPD</option>
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>Pedido</span>
            <input
              className={inputClass}
              value={form.pedido}
              onChange={(e) => onFormChange({ pedido: e.target.value })}
              onBlur={() => {
                void onPedidoLookup();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isFormDisabled) {
                  e.preventDefault();
                  void onPedidoLookup();
                }
              }}
              disabled={isFormDisabled}
              placeholder="Número do pedido"
            />
          </label>

          <label className="block">
            <span className={labelClass}>Chapa / Retalho</span>
            <select
              className={inputClass}
              value={form.retalho}
              onChange={(e) => onFormChange({ retalho: e.target.value })}
              disabled={isFormDisabled}
            >
              <option value="Chapa Inteira">Chapa Inteira</option>
              <option value="Retalho">Retalho</option>
            </select>
          </label>

          <div className="block">
            <span className={labelClass}>Saída CNC a cortar</span>
            <select
              className={inputClass}
              value={form.saida}
              onChange={(e) => onFormChange({ saida: e.target.value })}
              disabled={isFormDisabled || availableSaidas.length === 0}
            >
              <option value="" />
              {availableSaidas.map((saida) => (
                <option key={saida} value={saida}>
                  {saida}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Preview do PDF ── */}
        <div className="flex min-h-0 flex-1 flex-col">
          <span className={labelClass}>Miniatura do PDF</span>
          <div className="group relative mx-auto aspect-[297/210] w-full max-w-[520px] flex-1 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 transition-colors duration-200 hover:border-zinc-600" style={{ maxHeight: '38vh' }}>
            {pdfUrl ? (
              <>
                <iframe
                  key={`${pdfUrl}-${previewPage}`}
                  src={`${pdfUrl}#page=${previewPage}&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                  className="pointer-events-none absolute inset-0 h-full w-[110%] border-none no-scrollbar"
                  style={{ overflow: 'hidden', left: '0' }}
                  scrolling="no"
                  title="PDF Preview"
                />
                
                {/* Página atual */}
                <div className="absolute top-2.5 left-2.5 z-10 rounded-md bg-zinc-900/85 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400 border border-zinc-700/50 backdrop-blur-sm">
                  Página {previewPage}{pdfTotalPages > 0 ? ` de ${pdfTotalPages}` : ''}
                </div>

                {/* Navegação ← → */}
                {previewPage > 1 && (
                  <div className="absolute inset-y-0 left-0 flex items-center px-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <button
                      type="button"
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900/90 text-white shadow-xl transition-colors hover:bg-zinc-700 border border-zinc-700/60"
                      onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                  </div>
                )}

                {(pdfTotalPages === 0 || previewPage < pdfTotalPages) && (
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <button
                      type="button"
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900/90 text-white shadow-xl transition-colors hover:bg-zinc-700 border border-zinc-700/60"
                      onClick={() => setPreviewPage(p => p + 1)}
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600 italic">Aguardando plano de corte</span>
              </div>
            )}
          </div>

          {/* Botão Abrir PDF — abaixo da miniatura */}
          {pdfUrl ? (
            <div className="mx-auto mt-3 w-full max-w-[520px]">
              <button
                type="button"
                className="w-full rounded-xl border border-emerald-500/40 bg-emerald-600 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg transition-all duration-150 hover:bg-emerald-500 hover:border-emerald-400 active:scale-[0.98]"
                onClick={() => { void onOpenPdf(); }}
              >
                Abrir PDF
              </button>
            </div>
          ) : null}
        </div>

        {/* ── Barra inferior: Status + Timer + Botões ── */}
        <div className="mt-auto border-t border-zinc-800/60 pt-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div
              className={`text-sm font-semibold ${
                storageOk ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {storageOk
                ? '● Pastas e gravação compartilhada OK'
                : '○ Preparando armazenamento compartilhado...'}
            </div>

            <div className="flex items-center gap-5">
              <div className="font-digital text-4xl font-bold tracking-widest text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.25)] xl:text-5xl">
                {timerString}
              </div>
              <div className="flex gap-2.5">
                <button
                  type="submit"
                  className={`${buttonBaseClass} h-11 min-w-[7rem] border border-emerald-500 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 hover:border-emerald-400`}
                  disabled={loading || activeOperationId !== ''}
                >
                  Iniciar
                </button>
                <button
                  type="button"
                  className={`${buttonBaseClass} h-11 min-w-[7rem] border border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 hover:border-zinc-600`}
                  disabled={activeOperationId === '' || loading}
                  onClick={onOpenFinishDialog}
                >
                  Finalizar
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
