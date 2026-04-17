import { FormEvent, RefObject, useEffect } from 'react';
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
  'flex-1 rounded-xl border px-4 py-3 text-sm font-semibold tracking-wide transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97]';

const fieldClass =
  'w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50';

const secondaryButtonClass =
  'inline-flex min-w-28 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition-all duration-150 hover:bg-zinc-700 hover:border-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/70 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97]';

const primaryButtonClass =
  'inline-flex min-w-28 items-center justify-center rounded-xl border border-emerald-500 bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-all duration-150 hover:bg-emerald-400 hover:border-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97]';

export function FinishOperationModal({
  open,
  loading,
  finishDialog,
  finishReasonRef,
  onClose,
  onChange,
  onSubmit,
}: FinishOperationModalProps) {

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, loading, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 px-4 py-6 backdrop-blur-[2px]"
      onClick={onClose}
      aria-hidden="true"
    >
      <section
        className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-100 shadow-2xl shadow-black/40"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="finish-operation-modal-title"
      >
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Finalização do plano
        </p>
        <h3 id="finish-operation-modal-title" className="text-xl font-semibold text-zinc-100">
          O plano foi cortado completo?
        </h3>
        <p className="mt-2 text-sm text-zinc-400">
          Confirme o status da operação antes de concluir o registro.
        </p>

        <form className="mt-6 space-y-5" onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className={`${choiceButtonBaseClass} ${
                finishDialog.completedFull
                  ? 'border-emerald-500 bg-emerald-500 text-zinc-950'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800'
              }`}
              onClick={() => {
                onChange({
                  completedFull: true,
                  incompleteReason: '',
                });
                onSubmit();
              }}
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
              NÃO
            </button>
          </div>

          {!finishDialog.completedFull ? (
            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Por quê?
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
                  required
                />
              </label>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={onClose}
                  disabled={loading}
                >
                  CANCELAR
                </button>
                <button type="submit" className={primaryButtonClass} disabled={loading}>
                  {loading ? 'CONFIRMANDO...' : 'CONFIRMAR'}
                </button>
              </div>
            </div>
          ) : null}
        </form>
      </section>
    </div>
  );
}