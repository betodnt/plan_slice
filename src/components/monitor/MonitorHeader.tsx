type MonitorHeaderProps = {
  activeCount: number;
  instanceCount: number;
  totalTodayCount: number;
  currentTime: string;
  lastUpdate: string;
  onRefresh: () => void | Promise<void>;
  minimal?: boolean;
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
  instanceCount,
  totalTodayCount,
  currentTime,
  lastUpdate,
  onRefresh,
  minimal = false,
}: MonitorHeaderProps) {
  if (minimal) {
    return (
      <div className="flex items-center gap-8 animate-in fade-in slide-in-from-left-4 duration-500">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Painel de Controle</h1>
            <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">{currentTime} • {lastUpdate}</p>
          </div>
        </div>

        <div className="hidden h-8 w-px bg-zinc-800 lg:block" />

        <div className="hidden items-center gap-6 lg:flex">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500">Ativas:</span>
            <span className="text-sm font-bold text-emerald-500">{activeCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500">Hoje:</span>
            <span className="text-sm font-bold text-blue-500">{totalTodayCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500">Instancias:</span>
            <span className={`text-sm font-bold ${instanceCount >= 6 ? 'text-emerald-500' : 'text-amber-400'}`}>{instanceCount}</span>
          </div>
          <button
            onClick={() => {
              void onRefresh();
            }}
            className="ml-2 flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-1.5 text-[10px] font-bold text-zinc-300 transition-colors hover:bg-zinc-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            ATUALIZAR
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl backdrop-blur-sm sm:col-span-2 xl:col-span-2 lg:p-8">
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
          Acompanhe operações ativas, histórico recente, disponibilidade do armazenamento e a quantidade de instâncias online.
        </p>
      </div>

      <SummaryCard label="Operacoes ativas" value={activeCount} />
      <SummaryCard label="Instancias online" value={instanceCount} />
      <SummaryCard label="Historico hoje" value={`${totalTodayCount}`} />

      <div className="flex flex-col justify-between rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 text-right shadow-xl backdrop-blur-sm sm:col-span-2 xl:col-span-5">
        <div className="flex flex-col items-end gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Agora</p>
          <strong className="block font-digital text-xl font-bold leading-snug text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] lg:text-2xl">
            {currentTime}
          </strong>
        </div>
        <div className="mt-4 flex items-center justify-end gap-4">
          <p className="text-sm text-zinc-500">Atualizado em {lastUpdate}</p>
          <button
            onClick={() => {
              void onRefresh();
            }}
            className="flex h-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-300 transition-all duration-150 hover:border-zinc-600 hover:bg-zinc-800 active:scale-95"
          >
            ATUALIZAR
          </button>
        </div>
      </div>
    </section>
  );
}
