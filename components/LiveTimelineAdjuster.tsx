'use client';

import { useState } from 'react';
import { Clock, Play, Pause, SkipForward, AlertTriangle, RotateCw } from 'lucide-react';

interface TimelineItem {
  time: string;
  activity: string;
  pic: string;
  duration: number;
  status: 'pending' | 'running' | 'done' | 'delayed';
}

interface LiveTimelineProps {
  items: TimelineItem[];
  onUpdateItem: (index: number, updates: Partial<TimelineItem>) => void;
  onShiftTimeline: (minutes: number) => void;
}

export default function LiveTimelineAdjuster({ items, onUpdateItem, onShiftTimeline }: LiveTimelineProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [delayMinutes, setDelayMinutes] = useState('15');
  const [shifting, setShifting] = useState(false);

  const runningCount = items.filter(i => i.status === 'running').length;
  const delayedCount = items.filter(i => i.status === 'delayed').length;
  const doneCount = items.filter(i => i.status === 'done').length;

  const nextPending = items.findIndex(i => i.status === 'pending');
  const currentRunning = items.findIndex(i => i.status === 'running');

  const handleStartNext = () => {
    if (nextPending >= 0) {
      onUpdateItem(nextPending, { status: 'running' });
      setActiveIndex(nextPending);
    }
  };

  const handleCompleteCurrent = () => {
    if (currentRunning >= 0) {
      onUpdateItem(currentRunning, { status: 'done' });
      setActiveIndex(null);
      if (runningCount <= 1 || delayedCount > 0) {
        handleStartNext();
      }
    }
  };

  const handleMarkDelayed = (index: number) => {
    const mins = parseInt(delayMinutes) || 15;
    onUpdateItem(index, { status: 'delayed', duration: (items[index]?.duration || 30) + mins });
    onShiftTimeline(mins);
    setShifting(true);
    setTimeout(() => setShifting(false), 1200);
  };

  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (m: number) => {
    const h = Math.floor(m / 60).toString().padStart(2, '0');
    const min = (m % 60).toString().padStart(2, '0');
    return `${h}:${min}`;
  };

  const baseTime = items.length > 0 ? timeToMinutes(items[0]?.time || '07:00') : 420;
  let currentTime = baseTime;

  return (
    <div style={{
      background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 12,
      padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Clock size={14} color="#00ADB5" /> Live Timeline
          {shifting && (
            <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem', borderRadius: 10, background: 'rgba(255,99,105,0.1)', color: '#FF6369' }}>
              <RotateCw size={9} style={{ animation: 'spin 1s linear infinite', marginRight: '0.2rem', verticalAlign: 'middle' }} />
              Shifting +{delayMinutes}m
            </span>
          )}
        </p>
        <div style={{ display: 'flex', gap: '0.35rem', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
          <span style={{ color: '#25D0AB' }}>{doneCount} done</span>
          <span>·</span>
          <span style={{ color: '#00ADB5' }}>{runningCount} running</span>
          <span>·</span>
          <span style={{ color: delayedCount > 0 ? '#FF6369' : 'var(--color-text-muted)' }}>{delayedCount} delayed</span>
        </div>
      </div>

      {/* Timeline items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: 280, overflow: 'auto' }}>
        {items.map((item, idx) => {
          const itemTime = currentTime;
          const isActive = idx === activeIndex;
          const endTime = itemTime + item.duration;
          const result = item.time;
          currentTime += item.duration;

          const borderColor =
            item.status === 'done' ? '#25D0AB' :
            item.status === 'running' ? '#00ADB5' :
            item.status === 'delayed' ? '#FF6369' :
            'var(--color-border)';

          const bgColor =
            item.status === 'done' ? 'rgba(37,208,171,0.04)' :
            item.status === 'running' ? 'rgba(0,173,181,0.06)' :
            item.status === 'delayed' ? 'rgba(255,99,105,0.06)' :
            'transparent';

          return (
            <div key={idx}
              onClick={() => item.status === 'pending' && onUpdateItem(idx, { status: 'running' })}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.4rem 0.6rem', background: bgColor,
                borderLeft: `3px solid ${borderColor}`, borderRadius: 6,
                cursor: item.status === 'pending' ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}
            >
              {/* Time */}
              <span style={{
                fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-primary)',
                fontFamily: 'monospace', width: 42, flexShrink: 0,
              }}>
                {minutesToTime(itemTime)}
              </span>

              {/* Activity */}
              <span style={{
                flex: 1, fontSize: '0.75rem', color: item.status === 'done' ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                textDecoration: item.status === 'done' ? 'line-through' : 'none',
              }}>
                {item.activity}
              </span>

              {/* PIC */}
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', width: 60, textAlign: 'right' }}>
                {item.pic}
              </span>

              {/* Duration */}
              <span style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', width: 35, textAlign: 'right' }}>
                {item.duration}m
              </span>

              {/* Actions */}
              {item.status === 'running' && (
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCompleteCurrent(); }}
                    title="Mark done"
                    style={{
                      padding: '0.15rem 0.3rem', borderRadius: 4, border: '1px solid #25D0AB',
                      background: 'rgba(37,208,171,0.1)', color: '#25D0AB', cursor: 'pointer', fontSize: '0.6rem',
                    }}
                  >
                    Done
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMarkDelayed(idx); }}
                    title="Mark delayed"
                    style={{
                      padding: '0.15rem 0.3rem', borderRadius: 4, border: '1px solid #FF6369',
                      background: 'rgba(255,99,105,0.1)', color: '#FF6369', cursor: 'pointer', fontSize: '0.6rem',
                    }}
                  >
                    Delay
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={handleStartNext}
          disabled={nextPending < 0}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', borderRadius: 6,
            background: nextPending >= 0 ? 'rgba(0,173,181,0.1)' : 'var(--color-ground-2)',
            border: `1px solid ${nextPending >= 0 ? '#00ADB5' : 'var(--color-border)'}`,
            color: nextPending >= 0 ? '#00ADB5' : 'var(--color-text-muted)',
            cursor: nextPending >= 0 ? 'pointer' : 'not-allowed', fontSize: '0.72rem', fontWeight: 600,
          }}
        >
          <Play size={11} /> Start Next
        </button>

        {currentRunning >= 0 && (
          <button
            onClick={handleCompleteCurrent}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', borderRadius: 6,
              background: 'rgba(37,208,171,0.1)', border: '1px solid #25D0AB', color: '#25D0AB',
              cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600,
            }}
          >
            <SkipForward size={11} /> Complete
          </button>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Delay:</span>
          <input
            value={delayMinutes}
            onChange={e => setDelayMinutes(e.target.value)}
            style={{
              width: 40, padding: '0.2rem 0.3rem', background: 'var(--color-ground-2)',
              border: '1px solid var(--color-border)', borderRadius: 4, color: 'var(--color-text-primary)',
              fontSize: '0.7rem', textAlign: 'center', outline: 'none',
            }}
          />
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>min</span>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export type { TimelineItem };
