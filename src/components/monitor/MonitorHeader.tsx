type MonitorHeaderProps = {
  activeCount: number;
  totalTodayCount: number;
  currentTime: string;
  lastUpdate: string;
  onRefresh: () => void;
};

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <strong className="mt-3 block text-4xl font-bold tabular-nums text-zinc-100">{value}</strong>
    </div>
  );
}

export function MonitorHeader({
  activeCount,
  totalTodayCount,
  currentTime,
  lastUpdate,
  onRefresh,
}: MonitorHeaderProps) {
  return (
    <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl backdrop-blur-sm sm:col-span-2 xl:col-span-1 lg:p-8">
        <div className="flex items-center gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
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
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-100 lg:text-4xl">
          Apps rodando agora
        </h1>
        <p className="mt-3 max-w-xl text-sm text-zinc-400">
          Acompanhe operações ativas, histórico recente e disponibilidade do armazenamento.
        </p>
      </div>

      <SummaryCard label="Operações ativas" value={activeCount} />
      <SummaryCard 
        label="Histórico hoje" 
        value={`${totalTodayCount}`} 
      />

      <div className="flex flex-col justify-between rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 text-right shadow-xl backdrop-blur-sm sm:col-span-2 xl:col-span-1">
        <div className="flex flex-col items-end gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Agora</p>
          <strong className="block font-digital text-xl font-bold leading-snug text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] lg:text-2xl">
            {currentTime}
          </strong>
        </div>
        <div className="mt-4 flex items-center justify-end gap-4">
          <p className="text-sm text-zinc-500">Atualizado em {lastUpdate}</p>
          <button
            onClick={onRefresh}
            className="flex h-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-300 transition-all duration-150 hover:border-zinc-600 hover:bg-zinc-800 active:scale-95"
          >
            ATUALIZAR
          </button>
        </div>
      </div>
    </section>
  );
}
