import { useState } from 'react';
import { DoorOpen, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCategories, useRooms } from '@/hooks/useData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/contexts/ToastContext';
import { api, apiError } from '@/lib/api';
import type { Category, Room } from '@/types';

export default function AdminRooms() {
  const { data: rooms, isLoading: roomsLoading } = useRooms();
  const { data: categories, isLoading: catsLoading } = useCategories();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [roomDialog, setRoomDialog] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState({ name: '', location: '', capacity: 30 });
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);

  const [catDialog, setCatDialog] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({ name: '', color: '#84cc16' });
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['rooms'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['classes'] });
  };

  const saveRoom = useMutation({
    mutationFn: () => editingRoom
      ? api.put(`/admin/rooms/${editingRoom.id}`, roomForm)
      : api.post('/admin/rooms', roomForm),
    onSuccess: () => { invalidate(); setRoomDialog(false); setEditingRoom(null); toast({ variant: 'success', title: 'Room saved' }); },
    onError: (e) => toast({ variant: 'error', title: 'Could not save room', description: apiError(e) }),
  });
  const deleteRoom = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/rooms/${id}`),
    onSuccess: () => { invalidate(); setDeletingRoom(null); toast({ variant: 'success', title: 'Room deleted' }); },
    onError: (e) => { setDeletingRoom(null); toast({ variant: 'error', title: 'Could not delete room', description: apiError(e) }); },
  });
  const saveCat = useMutation({
    mutationFn: () => editingCat
      ? api.put(`/admin/categories/${editingCat.id}`, catForm)
      : api.post('/admin/categories', catForm),
    onSuccess: () => { invalidate(); setCatDialog(false); setEditingCat(null); toast({ variant: 'success', title: 'Category saved' }); },
    onError: (e) => toast({ variant: 'error', title: 'Could not save category', description: apiError(e) }),
  });
  const deleteCat = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/categories/${id}`),
    onSuccess: () => { invalidate(); setDeletingCat(null); toast({ variant: 'success', title: 'Category deleted' }); },
    onError: (e) => { setDeletingCat(null); toast({ variant: 'error', title: 'Could not delete category', description: apiError(e, 'Categories used by classes cannot be deleted') }); },
  });

  return (
    <div className="animate-fade-in space-y-10">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2.5 text-3xl font-black tracking-tight"><DoorOpen className="h-8 w-8 text-lime-600" /> Rooms</h1>
            <p className="mt-1 text-sm text-muted-foreground">Studios and spaces where classes run. Room double-booking is blocked automatically.</p>
          </div>
          <Button onClick={() => { setEditingRoom(null); setRoomForm({ name: '', location: '', capacity: 30 }); setRoomDialog(true); }}><Plus /> Add room</Button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {roomsLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />) : (rooms ?? []).map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold">{r.name}</p>
                  <p className="text-sm text-muted-foreground">{r.location || 'No location set'}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingRoom(r); setRoomForm({ name: r.name, location: r.location ?? '', capacity: r.capacity }); setRoomDialog(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => setDeletingRoom(r)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">Capacity <span className="font-bold text-foreground">{r.capacity}</span> · <span className="font-bold text-foreground">{r._count?.classes ?? 0}</span> classes scheduled</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2.5 text-2xl font-black tracking-tight"><Tags className="h-7 w-7 text-lime-600" /> Categories</h2>
            <p className="mt-1 text-sm text-muted-foreground">Class categories, colour-coded across explore, calendar and analytics.</p>
          </div>
          <Button onClick={() => { setEditingCat(null); setCatForm({ name: '', color: '#84cc16' }); setCatDialog(true); }}><Plus /> Add category</Button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {catsLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />) : (categories ?? []).map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-xl" style={{ background: c.color }} />
                  <div>
                    <p className="font-bold leading-tight">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c._count?.classes ?? 0} classes</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingCat(c); setCatForm({ name: c.name, color: c.color }); setCatDialog(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => setDeletingCat(c)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <Dialog open={roomDialog} onClose={() => setRoomDialog(false)} title={editingRoom ? 'Edit room' : 'Add room'}>
        <form onSubmit={(e) => { e.preventDefault(); saveRoom.mutate(); }} className="space-y-4">
          <div><Label>Name</Label><Input className="mt-1.5" required value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} placeholder="Studio A" /></div>
          <div><Label>Location</Label><Input className="mt-1.5" value={roomForm.location} onChange={(e) => setRoomForm({ ...roomForm, location: e.target.value })} placeholder="Ground floor" /></div>
          <div><Label>Capacity</Label><Input type="number" min={1} className="mt-1.5" value={roomForm.capacity} onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })} /></div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setRoomDialog(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saveRoom.isPending}>{saveRoom.isPending ? 'Saving…' : 'Save room'}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={catDialog} onClose={() => setCatDialog(false)} title={editingCat ? 'Edit category' : 'Add category'}>
        <form onSubmit={(e) => { e.preventDefault(); saveCat.mutate(); }} className="space-y-4">
          <div><Label>Name</Label><Input className="mt-1.5" required value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="Yoga" /></div>
          <div>
            <Label>Colour</Label>
            <div className="mt-1.5 flex items-center gap-3">
              <input type="color" value={catForm.color} onChange={(e) => setCatForm({ ...catForm, color: e.target.value })} className="h-10 w-16 cursor-pointer rounded-lg border bg-transparent" />
              <Input value={catForm.color} onChange={(e) => setCatForm({ ...catForm, color: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setCatDialog(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saveCat.isPending}>{saveCat.isPending ? 'Saving…' : 'Save category'}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog open={Boolean(deletingRoom)} onClose={() => setDeletingRoom(null)} onConfirm={() => deletingRoom && deleteRoom.mutate(deletingRoom.id)} title="Delete this room?" confirmLabel="Delete room" destructive busy={deleteRoom.isPending}>
        <p>Classes assigned to this room will keep running without a room. This cannot be undone.</p>
      </ConfirmDialog>
      <ConfirmDialog open={Boolean(deletingCat)} onClose={() => setDeletingCat(null)} onConfirm={() => deletingCat && deleteCat.mutate(deletingCat.id)} title="Delete this category?" confirmLabel="Delete category" destructive busy={deleteCat.isPending}>
        <p>Categories that still have classes cannot be deleted.</p>
      </ConfirmDialog>
    </div>
  );
}
