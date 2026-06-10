'use client';

import { useState, useMemo, useRef, useEffect, useCallback, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

interface DateRangePickerProps {
  value?: string;
  onChange: (value: string, formatted: string) => void;
  placeholder?: string;
  label?: string;
  minDate?: Date;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const CALENDAR_EST_HEIGHT = 360;

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${y}-${m}-${d}`;
}

function formatDisplay(date: Date): string {
  const daysUntil = Math.ceil((date.getTime() - Date.now()) / 86400000);
  const label = daysUntil > 0 ? `H-${daysUntil}` : daysUntil === 0 ? 'Hari ini' : 'Sudah lewat';
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()} (${label})`;
}

function parseDateSafe(val: string | undefined): Date | null {
  if (!val) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-');
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }

  const iso = new Date(val);
  if (!isNaN(iso.getTime())) return iso;

  const match = val.match(/(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/);
  if (match) {
    const monthIdx = MONTH_NAMES.indexOf(match[2]);
    if (monthIdx >= 0) return new Date(parseInt(match[3]), monthIdx, parseInt(match[1]));
  }
  return null;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export default function DateRangePicker({
  value,
  onChange,
  placeholder = 'Pilih tanggal acara',
  label,
  minDate,
}: DateRangePickerProps) {
  const today = new Date();
  const selected = parseDateSafe(value);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());
  const [dropUp, setDropUp] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sel = parseDateSafe(value);
    if (sel) {
      setViewYear(sel.getFullYear());
      setViewMonth(sel.getMonth());
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = containerRef.current?.contains(target);
      const insideCalendar = calendarRef.current?.contains(target);
      if (!insideTrigger && !insideCalendar) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const updateDropdownPosition = useCallback(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(Math.max(rect.width, 280), window.innerWidth - margin * 2);
    const left = Math.min(Math.max(rect.left, margin), window.innerWidth - width - margin);

    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const shouldDropUp = spaceBelow < CALENDAR_EST_HEIGHT && spaceAbove > spaceBelow;
    setDropUp(shouldDropUp);

    let top = shouldDropUp ? rect.top - CALENDAR_EST_HEIGHT - 6 : rect.bottom + 6;
    top = Math.max(margin, Math.min(top, window.innerHeight - CALENDAR_EST_HEIGHT - margin));

    setDropdownStyle({
      position: 'fixed',
      left,
      width,
      top,
      zIndex: 10000,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);
    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [open, viewYear, viewMonth, updateDropdownPosition]);

  const days = useMemo(() => {
    const totalDays = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const cells: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const minDay = startOfDay(minDate || today);

  const handleSelect = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    if (startOfDay(date) < minDay) return;
    onChange(formatDate(date), formatDisplay(date));
    setOpen(false);
  };

  const isSelected = (day: number) => {
    if (!selected) return false;
    return selected.getFullYear() === viewYear &&
      selected.getMonth() === viewMonth &&
      selected.getDate() === day;
  };

  const isToday = (day: number) =>
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;

  const isPast = (day: number) => startOfDay(new Date(viewYear, viewMonth, day)) < minDay;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {label && (
        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 500 }}>
          <Calendar size={13} style={{ marginRight: '0.3rem', color: 'var(--text-muted)' }} />
          {label}
        </label>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.6rem 0.875rem', borderRadius: 8,
          background: 'var(--bg-primary, var(--color-ground-1))',
          border: `1px solid ${open ? 'var(--accent-blue, #00ADB5)' : 'var(--border, var(--color-border))'}`,
          color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'var(--font-sans)',
          transition: 'border-color 0.15s',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={14} color="var(--text-muted)" />
          {selected ? formatDisplay(selected) : placeholder}
        </span>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {selected && (
            <span
              role="button"
              onClick={e => { e.stopPropagation(); onChange('', ''); }}
              style={{ padding: '0.1rem', color: 'var(--text-muted)', lineHeight: 1 }}
            >
              <X size={12} />
            </span>
          )}
          <ChevronRight size={14} color="var(--text-muted)" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
        </div>
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={calendarRef}
              initial={{ opacity: 0, y: dropUp ? 8 : -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: dropUp ? 8 : -8, scale: 0.98 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              style={{
                ...dropdownStyle,
                background: 'var(--bg-primary, #14161C)',
                border: '1px solid var(--border, rgba(255,255,255,0.08))',
                borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
                padding: '1rem', minWidth: 280, userSelect: 'none',
                maxHeight: `min(${CALENDAR_EST_HEIGHT}px, calc(100vh - 16px))`,
                overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                <button type="button" onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', borderRadius: 6, display: 'flex' }}>
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <button type="button" onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', borderRadius: 6, display: 'flex' }}>
                  <ChevronRight size={16} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.125rem', marginBottom: '0.375rem' }}>
                {DAY_NAMES.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', padding: '0.2rem 0' }}>
                    {d}
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.125rem' }}>
                {days.map((day, i) => {
                  if (day === null) return <div key={i} />;
                  const sel = isSelected(day);
                  const past = isPast(day);
                  const tod = isToday(day);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => !past && handleSelect(day)}
                      disabled={past}
                      style={{
                        padding: '0.4rem 0', borderRadius: 6, border: 'none', cursor: past ? 'not-allowed' : 'pointer',
                        background: sel ? 'var(--accent-blue, #00ADB5)' : tod ? 'rgba(0,173,181,0.12)' : 'transparent',
                        color: sel ? '#000' : past ? 'rgba(255,255,255,0.2)' : tod ? 'var(--accent-blue, #00ADB5)' : 'var(--text-primary)',
                        fontWeight: sel || tod ? 700 : 400,
                        fontSize: '0.82rem',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => { if (!past && !sel) e.currentTarget.style.background = 'var(--bg-elevated, rgba(255,255,255,0.06))'; }}
                      onMouseLeave={e => { if (!past && !sel) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.875rem', paddingTop: '0.75rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {[7, 14, 30, 60, 90].map(offsetDays => {
                  const d = new Date(today.getTime() + offsetDays * 86400000);
                  return (
                    <button
                      key={offsetDays}
                      type="button"
                      onClick={() => { onChange(formatDate(d), formatDisplay(d)); setOpen(false); }}
                      style={{
                        padding: '0.25rem 0.6rem', borderRadius: 20, border: '1px solid var(--border)',
                        background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.72rem',
                        cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--accent-blue)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      +{offsetDays} Hari
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
