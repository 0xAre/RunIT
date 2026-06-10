"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEventStore, type EventData } from "@/store/eventStore";
import {
  Plus,
  LayoutDashboard,
  GitBranch,
  ChevronRight,
  Calendar,
  Users,
  Globe,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { useLangStore } from "@/store/langStore";
import { dict } from "@/lib/i18n";
import DuplicateEventModal from "@/components/DuplicateEventModal";
import BrandLogo from "@/components/BrandLogo";

export default function WorkspaceDashboard() {
  const router = useRouter();
  const { events, loadUserEvents } = useEventStore();
  const [loading, setLoading] = useState(true);
  const [duplicatingEvent, setDuplicatingEvent] = useState<EventData | null>(null);

  const { lang, toggleLang } = useLangStore();
  const t = dict[lang];

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        await loadUserEvents();
      } catch (err) {
        console.error("Failed to load events", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [loadUserEvents]);

  const taskCount = (event: EventData) =>
    event.masterPlan
      ? event.masterPlan.divisions.reduce((acc, div) => acc + (div.tasks?.length || 0), 0)
      : 0;

  return (
    <div className="workspace-shell" style={{ position: "relative" }}>
      <div className="grid-bg" />

      <header className="workspace-topbar">
        <div className="workspace-inner workspace-topbar__row">
          <div className="workspace-breadcrumb">
            <BrandLogo variant="workspace" href="/workspace" size={28} />
            <span className="workspace-breadcrumb__sep hidden sm:inline">/</span>
            <span className="workspace-breadcrumb__trail hidden sm:inline">{t.navWorkspace}</span>
            <span className="workspace-breadcrumb__sep hidden sm:inline">/</span>
            <span className="workspace-breadcrumb__current hidden sm:inline">{t.dashTitle}</span>
          </div>
          <div className="workspace-topbar__actions">
            <button
              type="button"
              onClick={toggleLang}
              className="btn-ghost"
              style={{ padding: "0.35rem 0.55rem", gap: "0.3rem", fontSize: "0.8rem" }}
            >
              <Globe size={14} />
              {lang === "en" ? "EN" : "ID"}
            </button>
            <Link href="/workspace/new" className="btn-primary">
              <Plus size={15} strokeWidth={2} />
              <span className="hidden sm:inline">{t.navNewProject}</span>
              <span className="sm:hidden">Baru</span>
            </Link>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full border sm:h-9 sm:w-9"
              style={{ borderColor: "var(--color-border)", background: "var(--color-ground-2)" }}
            >
              <span className="font-heading text-[0.75rem] sm:text-body-sm" style={{ color: "var(--color-text-muted)" }}>
                U
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="workspace-main-body relative z-10 flex-1">
          <div className="workspace-inner">
            <header className="workspace-page-header">
              <h1 className="workspace-page-header__title">{t.dashTitle}</h1>
              <p className="workspace-page-header__subtitle">{t.dashSubtitle}</p>
            </header>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="spinner" />
              </div>
            ) : events.length === 0 ? (
              <div className="flex justify-center">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="colosseum-card w-full max-w-md p-10 text-center"
                >
                  <div
                    className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-sm border"
                    style={{
                      borderColor: "var(--color-border-accent)",
                      background: "var(--color-ground-3)",
                    }}
                  >
                    <LayoutDashboard size={22} style={{ color: "var(--color-mint)" }} strokeWidth={1.5} />
                  </div>
                  <h2 className="mb-2 font-heading text-lg font-medium" style={{ color: "var(--color-text)" }}>
                    {t.dashNoProjects}
                  </h2>
                  <p className="mb-6 text-body-sm" style={{ color: "var(--color-text-muted)" }}>
                    {t.dashNoProjectsDesc}
                  </p>
                  <Link href="/workspace/new" className="btn-primary">
                    <Plus size={15} strokeWidth={2} />
                    {t.dashCreateProjectBtn}
                  </Link>
                </motion.div>
              </div>
            ) : (
              <div className="workspace-project-grid">
                {events.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="colosseum-card colosseum-card--tile group cursor-pointer"
                    onClick={() => router.push(`/workspace/${event.id}/overview`)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/workspace/${event.id}/overview`);
                      }
                    }}
                  >
                    <div className="colosseum-card__head">
                      <div className="colosseum-card__icon" aria-hidden>
                        {event.name.trim().charAt(0).toUpperCase()}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDuplicatingEvent(event);
                        }}
                        title="Duplikasi event ini"
                        className="colosseum-card__dup"
                        aria-label="Duplikasi"
                      >
                        <Copy size={14} strokeWidth={1.5} />
                      </button>
                    </div>

                    <div className="colosseum-card__tags">
                      <span className="badge badge--neutral text-[10px] uppercase tracking-wide">
                        {event.type}
                      </span>
                      <span className="badge badge--success text-[10px] uppercase tracking-wide">
                        {event.stage}
                      </span>
                    </div>

                    <h3 className="colosseum-card__title">{event.name}</h3>

                    <p className="colosseum-card__meta">
                      <span className="colosseum-card__meta-item">
                        <Calendar size={12} strokeWidth={1.5} style={{ color: "var(--color-mint)", opacity: 0.7 }} />
                        {event.timeline}
                      </span>
                    </p>

                    <div className="colosseum-card__stats">
                      <div className="colosseum-card__stat">
                        <div className="colosseum-card__stat-label">
                          <Users size={10} strokeWidth={1.5} />
                          {t.dashPax}
                        </div>
                        <p className="colosseum-card__stat-value">{event.participants.toLocaleString()}</p>
                      </div>
                      <div className="colosseum-card__stat">
                        <div className="colosseum-card__stat-label">
                          <GitBranch size={10} strokeWidth={1.5} />
                          {t.dashTasks}
                        </div>
                        <p className="colosseum-card__stat-value">{taskCount(event)}</p>
                      </div>
                    </div>

                    <div className="colosseum-card__footer">
                      {t.dashOpenProject}
                      <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {duplicatingEvent && (
              <DuplicateEventModal
                sourceEvent={duplicatingEvent}
                onClose={() => setDuplicatingEvent(null)}
              />
            )}
          </div>
      </main>
    </div>
  );
}
