import React from 'react';
import { KpiCard } from './KpiCard';

type DashboardViewProps = {
  activeCount: number;
  totalTodayCount: number;
  efficiency?: string;
};

export function DashboardView({ activeCount, totalTodayCount, efficiency = '84%' }: DashboardViewProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-100">Visão Geral</h2>
        <p className="mt-1 text-sm text-zinc-400">Status em tempo real da produção de hoje.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          title="Máquinas Ativas" 
          value={activeCount} 
          subtitle="Processando agora" 
          color="emerald"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/><circle cx="12" cy="12" r="3"/></svg>}
        />
        <KpiCard 
          title="Planos Concluídos" 
          value={totalTodayCount} 
          subtitle="Total no dia de hoje" 
          color="blue"
          trend={{ value: '12%', isUp: true }}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
        />
        <KpiCard 
          title="Eficiência Global" 
          value={efficiency} 
          subtitle="OEE da planta" 
          color="amber"
          trend={{ value: '5%', isUp: false }}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
        />
        <KpiCard 
          title="Alertas de Produção" 
          value="02" 
          subtitle="Ações requeridas" 
          color="rose"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 lg:p-8">
           <h3 className="text-lg font-semibold text-zinc-100">Tendência de Produção</h3>
           <div className="mt-8 flex h-48 items-end gap-3 px-2">
              {[40, 65, 45, 90, 55, 75, 40, 60, 85, 30, 45, 70].map((h, i) => (
                <div key={i} className="group relative flex-1">
                   <div 
                     className="w-full rounded-t-md bg-emerald-500/20 transition-all duration-300 hover:bg-emerald-500/40" 
                     style={{ height: `${h}%` }}
                   />
                   <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100">
                     {h}
                   </div>
                </div>
              ))}
           </div>
           <div className="mt-4 flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-600">
             <span>06:00</span>
             <span>12:00</span>
             <span>18:00</span>
             <span>00:00</span>
           </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 lg:p-8">
           <h3 className="text-lg font-semibold text-zinc-100">Distribuição por Máquina</h3>
           <div className="mt-6 space-y-5">
              {[
                { name: 'Bodor1 (12K)', val: 75, color: 'bg-emerald-500' },
                { name: 'HSG G3015', val: 45, color: 'bg-blue-500' },
                { name: 'Trumpf 3030', val: 92, color: 'bg-amber-500' },
              ].map((m, i) => (
                <div key={i}>
                  <div className="mb-1.5 flex justify-between text-xs font-medium">
                    <span className="text-zinc-300">{m.name}</span>
                    <span className="text-zinc-500">{m.val}% Eficiência</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div className={`h-full ${m.color} transition-all duration-1000`} style={{ width: `${m.val}%` }} />
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
