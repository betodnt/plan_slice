import type { FormEvent } from 'react';
import { SettingsGlyph } from './Icons';
import type { OperatorSummary, StartOperationInput } from '../../types';

type ControlPanelProps = {
  form: StartOperationInput;
  operatorOptions: OperatorSummary[];
  runtimeMachineName?: string;
  isFormDisabled: boolean;
  availableSaidas: string[];
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

const labelClass = 'mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400';

const inputClass =
  'h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm font-medium text-zinc-100 outline-none transition focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60';

const buttonBaseClass =
  'inline-flex items-center justify-center rounded-xl px-4 text-sm font-semibold uppercase tracking-[0.18em] transition disabled:cursor-not-allowed disabled:opacity-50';

export function ControlPanel({
  form,
  operatorOptions,
  runtimeMachineName,
  isFormDisabled,
  availableSaidas,
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
  return (
    <section className="flex min-h-0 flex-col rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-sm">
      <form className="flex min-h-full flex-col" onSubmit={onSubmit}>
        <div className="mb-10 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-6">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className={labelClass}>Operador</span>
              <input
                className={inputClass}
                list="operator-options"
                value={form.operador}
                onChange={(e) => onFormChange({ operador: e.target.value })}
                disabled={isFormDisabled}
                placeholder="Digite o nome do operador"
              />
            </label>

            <label className="block">
              <span className={labelClass}>Nome da maquina</span>
              <input
                className={inputClass}
                value={form.maquina}
                onChange={(e) => onFormChange({ maquina: e.target.value })}
                disabled={isFormDisabled}
                placeholder={runtimeMachineName || 'Digite o nome da maquina'}
              />
            </label>

            <datalist id="operator-options">
              {operatorOptions.map((operator) => (
                <option key={operator.id} value={operator.name} />
              ))}
            </datalist>
          </div>

          <button
            type="button"
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 transition hover:border-zinc-700 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            title="Configuracoes e monitor"
            onClick={onOpenMonitorLogin}
          >
            <SettingsGlyph />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-[minmax(220px,0.88fr)_minmax(360px,1.22fr)]">
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
            <span className={labelClass}>Saida CNC a cortar</span>
            <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
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

              <button
                type="button"
                className={`${buttonBaseClass} h-12 border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:border-amber-400/40 hover:bg-amber-500/20`}
                onClick={() => {
                  void onOpenPdf();
                }}
                disabled={!form.saida}
              >
                PDF
              </button>
            </div>
          </div>
        </div>

        <div className="mt-auto grid grid-cols-1 items-end gap-x-6 gap-y-8 pt-10 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div
            className={`max-w-xl text-sm font-semibold ${
              storageOk ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {storageOk
              ? 'Pastas e gravacao compartilhada OK'
              : 'Preparando armazenamento compartilhado...'}
          </div>

          <div className="justify-self-end font-digital text-right text-6xl font-bold tracking-widest text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]">
            {timerString}
          </div>

          <div className="col-start-2 flex gap-3">
            <button
              type="submit"
              className={`${buttonBaseClass} h-12 min-w-40 border border-emerald-500 bg-emerald-500 text-zinc-950 hover:bg-emerald-400`}
              disabled={loading || activeOperationId !== ''}
            >
              Iniciar
            </button>
            <button
              type="button"
              className={`${buttonBaseClass} h-12 min-w-40 border border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700`}
              disabled={activeOperationId === '' || loading}
              onClick={onOpenFinishDialog}
            >
              Finalizar
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
