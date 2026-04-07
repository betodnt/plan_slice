import type { FormEvent, RefObject } from 'react';
import type { FinishDialogState } from '../../types';

type FinishOperationModalProps = {
  open: boolean;
  loading: boolean;
  finishDialog: FinishDialogState;
  finishReasonRef: RefObject<HTMLTextAreaElement | null>;
  onClose: () => void;
  onChange: (patch: Partial<FinishDialogState>) => void;
  onSubmit: (event?: FormEvent) => void | Promise<void>;
};

const choiceButtonBaseClass =
  'flex-1 rounded-lg border px-4 py-3 text-sm font-semibold tracking-wide transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50';

const fieldClass =
  'w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-60';

const secondaryButtonClass =
  'inline-flex min-w-28 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition-colors duration-150 hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50';

const primaryButtonClass =
  'inline-flex min-w-28 items-center justify-center rounded-lg border border-emerald-500 bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors duration-150 hover:bg-emerald-400 hover:border-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50';

export function FinishOperationModal({
  open,
  loading,
  finishDialog,
  finishReasonRef,
  onClose,
  onChange,
  onSubmit,
}: FinishOperationModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 px-4 py-6"
      onClick={onClose}
      aria-hidden="true"
    >
      <section
        className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-100 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="finish-operation-modal-title"
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
          Finalizacao do plano
        </p>
        <h3 id="finish-operation-modal-title" className="text-xl font-semibold text-zinc-100">
          O plano foi cortado completo?
        </h3>
        <p className="mt-2 text-sm text-zinc-400">
          Confirme o status da operacao antes de concluir o registro.
        </p>

        <form className="mt-6 space-y-5" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              className={`${choiceButtonBaseClass} ${
                finishDialog.completedFull
                  ? 'border-emerald-500 bg-emerald-500 text-zinc-950'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800'
              }`}
              onClick={() =>
                onChange({
                  completedFull: true,
                  incompleteReason: '',
                })
              }
              disabled={loading}
              aria-pressed={finishDialog.completedFull}
            >
              SIM
            </button>
            <button
              type="button"
              className={`${choiceButtonBaseClass} ${
                !finishDialog.completedFull
                  ? 'border-amber-500 bg-amber-500 text-zinc-950'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800'
              }`}
              onClick={() =>
                onChange({
                  completedFull: false,
                })
              }
              disabled={loading}
              aria-pressed={!finishDialog.completedFull}
            >
              NAO
            </button>
          </div>

          {!finishDialog.completedFull ? (
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Por que?
              </span>
              <textarea
                ref={finishReasonRef}
                className={`${fieldClass} min-h-28 resize-y`}
                value={finishDialog.incompleteReason}
                onChange={(event) =>
                  onChange({
                    incompleteReason: event.target.value,
                  })
                }
                disabled={loading}
                placeholder="Descreva o motivo"
              />
            </label>
          ) : null}

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={onClose}
              disabled={loading}
            >
              CANCELAR
            </button>
            <button type="submit" className={primaryButtonClass} disabled={loading}>
              CONFIRMAR
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}