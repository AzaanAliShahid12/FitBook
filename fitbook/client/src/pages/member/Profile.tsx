import { useEffect, useRef, useState } from 'react';
import { Camera, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/ui/badge';
import { api, apiError } from '@/lib/api';

export default function Profile() {
  const { user, refreshUser, setUser } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '', phone: '', goals: '', gender: '', emergencyContact: '', dateOfBirth: '',
    bio: '', specialties: '', experienceYears: 0,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name ?? '',
      phone: user.phone ?? '',
      goals: user.memberProfile?.goals ?? '',
      gender: user.memberProfile?.gender ?? '',
      emergencyContact: user.memberProfile?.emergencyContact ?? '',
      dateOfBirth: user.memberProfile?.dateOfBirth ? user.memberProfile.dateOfBirth.slice(0, 10) : '',
      bio: user.instructorProfile?.bio ?? '',
      specialties: (user.instructorProfile?.specialties ?? []).join(', '),
      experienceYears: user.instructorProfile?.experienceYears ?? 0,
    });
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { name: form.name, phone: form.phone || undefined };
      if (user?.role === 'MEMBER') {
        payload.goals = form.goals;
        payload.gender = form.gender || undefined;
        payload.emergencyContact = form.emergencyContact || undefined;
        payload.dateOfBirth = form.dateOfBirth || undefined;
      }
      if (user?.role === 'INSTRUCTOR') {
        payload.bio = form.bio;
        payload.specialties = form.specialties.split(',').map((s) => s.trim()).filter(Boolean);
        payload.experienceYears = Number(form.experienceYears) || 0;
      }
      const res = await api.put('/auth/me', payload);
      setUser(res.data.data);
      await refreshUser();
      toast({ variant: 'success', title: 'Profile updated' });
    } catch (err) {
      toast({ variant: 'error', title: 'Could not save profile', description: apiError(err) });
    } finally { setSaving(false); }
  };

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await api.post('/auth/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUser(res.data.data);
      await refreshUser();
      toast({ variant: 'success', title: 'Profile picture updated' });
    } catch (err) {
      toast({ variant: 'error', title: 'Upload failed', description: apiError(err) });
    } finally { setUploading(false); }
  };

  if (!user) return null;

  return (
    <div className="animate-fade-in mx-auto max-w-3xl">
      <h1 className="text-3xl font-black tracking-tight">Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your account details and preferences.</p>

      <Card className="mt-6 p-6">
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative">
            <Avatar name={user.name} src={user.profileImage} className="h-24 w-24 text-2xl" />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-lime-500 text-zinc-950 shadow hover:bg-lime-400"
              aria-label="Change profile picture"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          </div>
          <div>
            <p className="text-xl font-black">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-2 flex gap-2">
              <Badge variant="lime" className="capitalize">{user.role.toLowerCase()}</Badge>
              <Badge variant={user.emailVerified ? 'sky' : 'amber'}>{user.emailVerified ? 'Email verified' : 'Email not verified'}</Badge>
            </div>
            {uploading && <p className="mt-2 text-xs text-muted-foreground">Uploading picture…</p>}
          </div>
        </div>

        <form onSubmit={save} className="mt-7 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Full name</Label>
            <Input className="mt-1.5" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <Label>Email</Label>
            <Input className="mt-1.5" value={user.email} disabled />
          </div>
          <div>
            <Label>Phone</Label>
            <Input className="mt-1.5" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="03xx xxxxxxx" />
          </div>
          {user.role === 'MEMBER' && (
            <>
              <div>
                <Label>Gender</Label>
                <Input className="mt-1.5" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} placeholder="Optional" />
              </div>
              <div>
                <Label>Date of birth</Label>
                <Input type="date" className="mt-1.5" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
              </div>
              <div>
                <Label>Emergency contact</Label>
                <Input className="mt-1.5" value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} placeholder="Name / phone" />
              </div>
              <div className="sm:col-span-2">
                <Label>Fitness goals</Label>
                <Textarea className="mt-1.5" value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} placeholder="e.g. Build strength, improve flexibility, train 3x a week" />
              </div>
            </>
          )}
          {user.role === 'INSTRUCTOR' && (
            <>
              <div>
                <Label>Experience (years)</Label>
                <Input type="number" min={0} max={60} className="mt-1.5" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Specialties (comma separated)</Label>
                <Input className="mt-1.5" value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} placeholder="Yoga, Pilates" />
              </div>
              <div className="sm:col-span-2">
                <Label>Bio</Label>
                <Textarea className="mt-1.5" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell members about your coaching style" />
              </div>
            </>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}><Save /> {saving ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
