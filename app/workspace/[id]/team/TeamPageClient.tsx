'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useEventStore, type EventMemberRole } from '@/store/eventStore';
import { Users, UserPlus, Copy, Check, Trash2, Shield, Loader2 } from 'lucide-react';

const ROLE_LABELS: Record<EventMemberRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
};

export default function TeamPageClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.id as string;
  const inviteOwner = searchParams.get('owner');

  const { user } = useAuth();
  const { currentEvent, addMember, removeMember, updateMemberRole, acceptTeamInvite } = useEventStore();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<EventMemberRole>('editor');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');

  const members = currentEvent?.members || [];
  const isOwner = members.some(m => m.role === 'owner' && (m.uid === user?.uid || m.email === user?.email));
  const canEdit = isOwner || members.some(m => m.uid === user?.uid && m.role === 'editor');
  const pendingInvite = inviteOwner && user?.email && members.some(
    m => m.email.toLowerCase() === user.email!.toLowerCase() && !m.uid
  );

  useEffect(() => {
    if (pendingInvite && inviteOwner) {
      setInviteMsg('You have a pending invite for this event.');
    }
  }, [pendingInvite, inviteOwner]);

  const inviteLink =
    typeof window !== 'undefined' && currentEvent
      ? `${window.location.origin}/workspace/${eventId}/team?owner=${currentEvent.ownerId || user?.uid}`
      : '';

  const handleAdd = async () => {
    if (!email.trim() || !canEdit) return;
    setBusy(true);
    try {
      await addMember({ email: email.trim(), role });
      setEmail('');
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async () => {
    if (!inviteOwner) return;
    setBusy(true);
    try {
      const ok = await acceptTeamInvite(eventId, inviteOwner);
      setInviteMsg(ok ? 'Invite accepted! You now have access to this event.' : 'Could not accept invite.');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!currentEvent) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-mint)' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Users size={22} color="var(--color-mint)" />
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Team & Roles</h1>
        </div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          Invite collaborators by email. Editors can update the event; viewers have read-only access.
        </p>
      </div>

      {pendingInvite && inviteOwner && (
        <div style={{ padding: '1rem', borderRadius: 10, border: '1px solid rgba(37,208,171,0.4)', background: 'rgba(37,208,171,0.08)' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>{inviteMsg || 'Accept invite to join this event workspace.'}</p>
          <button
            onClick={handleAccept}
            disabled={busy}
            style={{ padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: 'var(--color-mint)', color: '#04312C', fontWeight: 700, cursor: 'pointer' }}
          >
            Accept Invite
          </button>
        </div>
      )}

      {canEdit && (
        <div style={{ padding: '1.25rem', background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <UserPlus size={14} /> Invite member
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ flex: 1, minWidth: 200, padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-ground-0)', color: 'var(--color-text-primary)', fontSize: '0.85rem' }}
            />
            <select
              value={role}
              onChange={e => setRole(e.target.value as EventMemberRole)}
              style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-ground-0)', color: 'var(--color-text-primary)', fontSize: '0.85rem' }}
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={handleAdd}
              disabled={busy || !email.trim()}
              style={{ padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: 'var(--color-mint)', color: '#04312C', fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.7 : 1 }}
            >
              Add
            </button>
          </div>
          <div style={{ marginTop: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={copyLink}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-ground-0)', color: 'var(--color-text-secondary)', fontSize: '0.78rem', cursor: 'pointer' }}
            >
              {copied ? <Check size={13} color="var(--color-mint)" /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy invite link'}
            </button>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>Share after adding their email</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {members.map(m => (
          <div
            key={m.email}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 10 }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--color-ground-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={16} color={m.role === 'owner' ? 'var(--color-mint)' : 'var(--color-text-muted)'} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>{m.email}</p>
              <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', margin: '0.1rem 0 0' }}>
                {ROLE_LABELS[m.role]}
                {m.uid ? ' · joined' : ' · pending'}
                {m.divisionId ? ` · ${m.divisionId}` : ''}
              </p>
            </div>
            {canEdit && m.role !== 'owner' && (
              <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                <select
                  value={m.role}
                  onChange={e => updateMemberRole(m.email, e.target.value as EventMemberRole)}
                  style={{ padding: '0.25rem 0.5rem', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-ground-0)', fontSize: '0.72rem' }}
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  onClick={() => removeMember(m.email)}
                  style={{ padding: '0.25rem', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                  aria-label="Remove member"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
