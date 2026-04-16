type MonitorHeaderProps = {
  activeCount: number;
  historyCount: number;
  currentTime: string;
  lastUpdate: string;
  onRefresh: () => void;
};

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <strong className="mt-4 block text-4xl font-bold text-zinc-100">{value}</strong>
    </div>
  );
}

export function MonitorHeader({
  activeCount,
  historyCount,
  currentTime,
  lastUpdate,
  onRefresh,
}: MonitorHeaderProps) {
  return (
    <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-xl backdrop-blur-sm md:col-span-2 xl:col-span-1">
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Monitor em tempo real
          </p>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold tracking-wider text-emerald-500">LIVE</span>
          </div>
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-100">
          Apps rodando agora
        </h1>
        <p className="mt-3 max-w-xl text-sm text-zinc-400">
          Acompanhe operacoes ativas, historico recente e disponibilidade do armazenamento.
        </p>
      </div>

      <SummaryCard label="Operacoes ativas" value={activeCount} />
      <SummaryCard label="Historico carregado" value={historyCount} />

      <div className="flex flex-col justify-between rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 text-right shadow-xl backdrop-blur-sm md:col-span-2 xl:col-span-1">
        <div className="flex flex-col items-end gap-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Agora</p>
          <strong className="block font-digital text-2xl font-bold leading-snug text-emerald-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">
            {currentTime}
          </strong>
        </div>
        <div className="mt-4 flex items-center justify-end gap-4">
          <p className="text-sm text-zinc-400">Atualizado em {lastUpdate}</p>
          <button
            onClick={onRefresh}
            className="flex h-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs font-bold tracking-wider text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 active:scale-95"
          >
            ATUALIZAR
          </button>
        </div>
      </div>
    </section>
  );
}
