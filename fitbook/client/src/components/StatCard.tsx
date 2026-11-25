import { ReactNode } from 'react';
import { Card } from './ui/card';

export function StatCard({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-black tracking-tight">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-500/15 text-lime-700 dark:text-lime-400">{icon}</span>
      </div>
    </Card>
  );
}
