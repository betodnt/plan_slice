type MonitorHeaderProps = {
  activeCount: number;
  historyCount: number;
  currentTime: string;
  lastUpdate: string;
};

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl">
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
}: MonitorHeaderProps) {
  return (
    <section className="grid grid-cols-[minmax(320px,1.3fr)_220px_220px_minmax(280px,auto)] gap-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
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

      <div className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-right shadow-xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Agora</p>
          <strong className="mt-3 block text-lg font-semibold leading-snug text-zinc-100">
            {currentTime}
          </strong>
        </div>
        <p className="mt-6 text-sm text-zinc-400">Atualizado em {lastUpdate}</p>
      </div>
    </section>
  );
}
