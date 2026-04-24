import React from 'react';

type KpiCardProps = {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isUp: boolean;
  };
  color?: 'emerald' | 'blue' | 'amber' | 'rose';
};

export function KpiCard({ title, value, subtitle, icon, trend, color = 'emerald' }: KpiCardProps) {
  const colorClasses = {
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    rose: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
  };

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-xl transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/60">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{title}</p>
          <h3 className="mt-2 text-3xl font-bold text-zinc-100">{value}</h3>
          <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      
      {trend && (
        <div className="mt-4 flex items-center gap-2">
          <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${trend.isUp ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
            {trend.isUp ? '↑' : '↓'} {trend.value}
          </div>
          <span className="text-[10px] text-zinc-500">vs. ontem</span>
        </div>
      )}

      {/* Subtle Glow Effect */}
      <div className="absolute -bottom-12 -right-12 h-24 w-24 rounded-full bg-emerald-500/5 blur-3xl transition-all duration-500 group-hover:bg-emerald-500/10" />
    </div>
  );
}
