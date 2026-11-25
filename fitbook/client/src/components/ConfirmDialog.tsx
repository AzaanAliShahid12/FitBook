import { ReactNode } from 'react';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';

export function ConfirmDialog({ open, onClose, onConfirm, title, children, confirmLabel = 'Confirm', busy = false, destructive = false }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; children: ReactNode;
  confirmLabel?: string; busy?: boolean; destructive?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>Go back</Button>
        <Button variant={destructive ? 'destructive' : 'default'} className="flex-1" onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
