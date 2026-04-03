import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { createRoot } from "react-dom/client";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart,
} from "recharts";

// ─── THEME ────────────────────────────────────────────────────────────────────
const DARK_THEME = {
  bg: "#1a1208", surface: "#221a0f", card: "#2a1f10", border: "#3d2e1a",
  text: "#f5e6c8", muted: "#9a8060", primary: "#f59e0b", primaryDim: "rgba(245,158,11,0.12)",
  warning: "#ef4444", warningDim: "rgba(239,68,68,0.12)", success: "#22c55e",
  successDim: "rgba(34,197,94,0.12)", info: "#fb923c", infoDim: "rgba(251,146,60,0.12)",
  sidebar: "#150f07", sidebarBorder: "#2d2010", inputBg: "#1a1208",
};
const LIGHT_THEME = {
  bg: "#fef9f0", surface: "#fff8ed", card: "#ffffff", border: "#e8d5b0",
  text: "#1a0f00", muted: "#8a6830", primary: "#d97706", primaryDim: "rgba(217,119,6,0.10)",
  warning: "#dc2626", warningDim: "rgba(220,38,38,0.10)", success: "#16a34a",
  successDim: "rgba(22,163,74,0.10)", info: "#ea580c", infoDim: "rgba(234,88,12,0.10)",
  sidebar: "#fdf3e0", sidebarBorder: "#e2c98a", inputBg: "#fffbf2",
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const injectStyles = (t) => `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Mono:wght@300;400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${t.bg}; color: ${t.text}; font-family: 'DM Sans', sans-serif; transition: background 0.3s, color 0.3s; }

  .app-layout { display: flex; height: 100vh; overflow: hidden; }

  /* SIDEBAR */
  .sidebar { width: 240px; min-width: 240px; background: ${t.sidebar}; border-right: 1px solid ${t.sidebarBorder}; display: flex; flex-direction: column; transition: width 0.2s ease, min-width 0.2s ease; overflow: hidden; z-index: 100; }
  .sidebar.collapsed { width: 64px; min-width: 64px; }
  .sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 20px 16px; border-bottom: 1px solid ${t.sidebarBorder}; min-height: 65px; }
  .sidebar-logo-icon { width: 34px; height: 34px; background: ${t.primary}; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
  .sidebar-logo-text { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 15px; color: ${t.text}; white-space: nowrap; opacity: 1; transition: opacity 0.15s; }
  .sidebar.collapsed .sidebar-logo-text { opacity: 0; pointer-events: none; }
  .sidebar-nav { flex: 1; padding: 12px 8px; overflow-y: auto; overflow-x: hidden; }
  .nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 10px; border-radius: 8px; cursor: pointer; transition: all 0.15s; color: ${t.muted}; font-size: 14px; font-weight: 500; white-space: nowrap; margin-bottom: 2px; }
  .nav-item:hover { background: ${t.primaryDim}; color: ${t.text}; }
  .nav-item.active { background: ${t.primaryDim}; color: ${t.primary}; }
  .nav-item .nav-icon { font-size: 18px; flex-shrink: 0; width: 24px; text-align: center; }
  .nav-label { opacity: 1; transition: opacity 0.15s; }
  .sidebar.collapsed .nav-label { opacity: 0; pointer-events: none; }
  .sidebar-footer { padding: 12px 8px; border-top: 1px solid ${t.sidebarBorder}; }
  .sidebar-collapse-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px; border-radius: 8px; cursor: pointer; color: ${t.muted}; background: none; border: none; font-size: 14px; transition: all 0.15s; }
  .sidebar-collapse-btn:hover { background: ${t.primaryDim}; color: ${t.text}; }

  /* MAIN */
  .main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .topbar { height: 65px; min-height: 65px; background: ${t.surface}; border-bottom: 1px solid ${t.border}; display: flex; align-items: center; padding: 0 24px; gap: 16px; }
  .topbar-title { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 18px; color: ${t.text}; flex: 1; }
  .topbar-search { display: flex; align-items: center; gap: 8px; background: ${t.inputBg}; border: 1px solid ${t.border}; border-radius: 8px; padding: 6px 12px; flex: 1; max-width: 300px; }
  .topbar-search input { background: none; border: none; outline: none; color: ${t.text}; font-size: 14px; width: 100%; font-family: 'DM Sans', sans-serif; }
  .topbar-search input::placeholder { color: ${t.muted}; }
  .topbar-actions { display: flex; align-items: center; gap: 10px; }
  .icon-btn { width: 36px; height: 36px; border-radius: 8px; border: 1px solid ${t.border}; background: ${t.card}; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; color: ${t.muted}; transition: all 0.15s; position: relative; }
  .icon-btn:hover { border-color: ${t.primary}; color: ${t.primary}; }
  .notif-dot { position: absolute; top: 6px; right: 6px; width: 7px; height: 7px; border-radius: 50%; background: ${t.warning}; border: 2px solid ${t.surface}; }
  .avatar { width: 34px; height: 34px; border-radius: 50%; background: ${t.primary}; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #1a0a00; cursor: pointer; font-family: 'Space Grotesk', sans-serif; }
  .page-content { flex: 1; overflow-y: auto; padding: 28px; }

  /* PAGE TRANSITIONS */
  .page-enter { animation: pageEnter 0.2s ease forwards; }
  @keyframes pageEnter { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

  /* CARDS */
  .card { background: ${t.card}; border: 1px solid ${t.border}; border-radius: 12px; padding: 20px; transition: box-shadow 0.15s; }
  .card:hover { box-shadow: 0 0 0 1px ${t.primary}33; }
  .card-title { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 14px; color: ${t.muted}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
  .card-value { font-family: 'DM Mono', monospace; font-size: 28px; font-weight: 500; color: ${t.text}; }
  .card-sub { font-size: 13px; color: ${t.muted}; margin-top: 4px; }

  /* STAT GRID */
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  @media (max-width: 1100px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 640px) { .stat-grid { grid-template-columns: 1fr; } }

  /* STAT CARD */
  .stat-card { background: ${t.card}; border: 1px solid ${t.border}; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 8px; transition: box-shadow 0.15s; }
  .stat-card:hover { box-shadow: 0 0 0 1px ${t.primary}33; }
  .stat-card-header { display: flex; align-items: center; justify-content: space-between; }
  .stat-card-label { font-size: 13px; color: ${t.muted}; font-weight: 500; }
  .stat-card-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 17px; }
  .stat-card-value { font-family: 'DM Mono', monospace; font-size: 26px; font-weight: 500; color: ${t.text}; }
  .stat-card-change { font-size: 12px; color: ${t.muted}; }

  /* CHARTS */
  .chart-card { background: ${t.card}; border: 1px solid ${t.border}; border-radius: 12px; padding: 20px; }
  .chart-title { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 15px; color: ${t.text}; margin-bottom: 16px; }
  .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  @media (max-width: 900px) { .charts-row { grid-template-columns: 1fr; } }
  .charts-row-3 { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  @media (max-width: 1100px) { .charts-row-3 { grid-template-columns: 1fr 1fr; } }

  /* TABLES */
  .table-card { background: ${t.card}; border: 1px solid ${t.border}; border-radius: 12px; overflow: hidden; }
  .table-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid ${t.border}; }
  .table-title { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 15px; color: ${t.text}; }
  table { width: 100%; border-collapse: collapse; }
  th { background: ${t.surface}; padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 600; color: ${t.muted}; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
  td { padding: 12px 16px; font-size: 13px; color: ${t.text}; border-bottom: 1px solid ${t.border}; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: ${t.surface}11; }
  tr:hover td { background: ${t.primaryDim}; }
  .mono { font-family: 'DM Mono', monospace; font-size: 12px; }

  /* BADGES */
  .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
  .badge-critical { background: ${t.warningDim}; color: ${t.warning}; border: 1px solid ${t.warning}33; }
  .badge-low { background: ${t.infoDim}; color: ${t.info}; border: 1px solid ${t.info}33; }
  .badge-optimal { background: ${t.primaryDim}; color: ${t.primary}; border: 1px solid ${t.primary}33; }
  .badge-overstock { background: rgba(139,92,246,0.12); color: #a78bfa; border: 1px solid rgba(139,92,246,0.25); }
  .badge-good { background: ${t.successDim}; color: ${t.success}; border: 1px solid ${t.success}33; }

  /* BUTTONS */
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; border: none; font-family: 'DM Sans', sans-serif; }
  .btn-primary { background: ${t.primary}; color: #1a0a00; }
  .btn-primary:hover { background: #fbbf24; transform: translateY(-1px); }
  .btn-secondary { background: ${t.primaryDim}; color: ${t.primary}; border: 1px solid ${t.primary}33; }
  .btn-secondary:hover { background: ${t.primary}22; }
  .btn-danger { background: ${t.warningDim}; color: ${t.warning}; border: 1px solid ${t.warning}33; }
  .btn-danger:hover { background: ${t.warning}22; }
  .btn-ghost { background: transparent; color: ${t.muted}; border: 1px solid ${t.border}; }
  .btn-ghost:hover { color: ${t.text}; border-color: ${t.text}; }
  .btn-sm { padding: 5px 10px; font-size: 12px; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  /* INPUTS */
  .input { width: 100%; padding: 10px 12px; background: ${t.inputBg}; border: 1px solid ${t.border}; border-radius: 8px; color: ${t.text}; font-size: 14px; outline: none; transition: border-color 0.15s; font-family: 'DM Sans', sans-serif; }
  .input:focus { border-color: ${t.primary}; }
  .input::placeholder { color: ${t.muted}; }
  .input-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
  .input-label { font-size: 13px; font-weight: 500; color: ${t.muted}; }
  select.input { cursor: pointer; }

  /* MODAL */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
  .modal { background: ${t.card}; border: 1px solid ${t.border}; border-radius: 16px; padding: 28px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; animation: modalIn 0.2s ease; }
  @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(-10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  .modal-title { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 18px; color: ${t.text}; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
  .modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }

  /* TOAST */
  .toast-container { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 2000; display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .toast { display: flex; align-items: center; gap: 10px; padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 500; animation: toastIn 0.25s ease; min-width: 280px; max-width: 420px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
  .toast-success { background: ${t.card}; border: 1px solid ${t.primary}; color: ${t.text}; }
  .toast-error { background: ${t.card}; border: 1px solid ${t.warning}; color: ${t.text}; }
  .toast-info { background: ${t.card}; border: 1px solid ${t.info}; color: ${t.text}; }
  @keyframes toastIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

  /* PROGRESS BAR */
  .progress-bar { height: 6px; border-radius: 3px; background: ${t.border}; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 3px; transition: width 0.3s ease; }

  /* SPINNER */
  .spinner { width: 36px; height: 36px; border: 3px solid ${t.border}; border-top-color: ${t.primary}; border-radius: 50%; animation: spin 0.7s linear infinite; }
  .spinner-sm { width: 18px; height: 18px; border-width: 2px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-overlay { display: flex; align-items: center; justify-content: center; flex: 1; gap: 12px; color: ${t.muted}; font-size: 14px; }

  /* FILTERS */
  .filter-tabs { display: flex; gap: 4px; background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 10px; padding: 4px; }
  .filter-tab { padding: 6px 14px; border-radius: 7px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; color: ${t.muted}; border: none; background: transparent; font-family: 'DM Sans', sans-serif; }
  .filter-tab.active { background: ${t.primary}; color: #1a0a00; font-weight: 600; }
  .filter-tab:hover:not(.active) { color: ${t.text}; }

  /* SECTION HEADER */
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
  .section-title { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 22px; color: ${t.text}; }
  .section-sub { font-size: 14px; color: ${t.muted}; margin-top: 2px; }

  /* LOGIN */
  .auth-page { min-height: 100vh; background: ${t.bg}; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .auth-card { background: ${t.card}; border: 1px solid ${t.border}; border-radius: 20px; padding: 40px; width: 100%; max-width: 420px; }
  .auth-logo { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; justify-content: center; }
  .auth-logo-icon { width: 48px; height: 48px; background: ${t.primary}; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
  .auth-logo-text { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 22px; color: ${t.text}; }
  .auth-title { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 26px; color: ${t.text}; margin-bottom: 6px; text-align: center; }
  .auth-sub { font-size: 14px; color: ${t.muted}; text-align: center; margin-bottom: 28px; }
  .auth-divider { text-align: center; color: ${t.muted}; font-size: 13px; margin: 16px 0; }
  .auth-link { color: ${t.primary}; cursor: pointer; text-decoration: none; font-weight: 500; }
  .auth-link:hover { text-decoration: underline; }

  /* CHATBOT */
  .chat-btn { position: fixed; bottom: 28px; right: 28px; width: 54px; height: 54px; border-radius: 50%; background: ${t.primary}; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 22px; box-shadow: 0 4px 20px rgba(245,158,11,0.4); transition: all 0.2s; z-index: 900; }
  .chat-btn:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(245,158,11,0.5); }
  .chat-panel { position: fixed; bottom: 96px; right: 28px; width: 360px; height: 500px; background: ${t.card}; border: 1px solid ${t.border}; border-radius: 16px; display: flex; flex-direction: column; z-index: 900; box-shadow: 0 16px 48px rgba(0,0,0,0.5); animation: chatIn 0.2s ease; overflow: hidden; }
  @keyframes chatIn { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .chat-header { padding: 16px 18px; border-bottom: 1px solid ${t.border}; display: flex; align-items: center; justify-content: space-between; background: ${t.surface}; }
  .chat-header-title { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 15px; color: ${t.text}; display: flex; align-items: center; gap: 8px; }
  .chat-messages { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
  .chat-msg { max-width: 82%; border-radius: 12px; padding: 10px 13px; font-size: 13px; line-height: 1.5; }
  .chat-msg.user { align-self: flex-end; background: ${t.primary}; color: #1a0a00; border-radius: 12px 12px 3px 12px; }
  .chat-msg.assistant { align-self: flex-start; background: ${t.surface}; color: ${t.text}; border: 1px solid ${t.border}; border-radius: 12px 12px 12px 3px; }
  .chat-msg.assistant pre { white-space: pre-wrap; font-family: 'DM Mono', monospace; font-size: 11px; }
  .chat-quick-replies { padding: 8px 14px; display: flex; flex-wrap: wrap; gap: 6px; border-top: 1px solid ${t.border}; }
  .quick-reply-btn { padding: 5px 10px; border-radius: 20px; font-size: 12px; background: ${t.primaryDim}; color: ${t.primary}; border: 1px solid ${t.primary}33; cursor: pointer; transition: all 0.15s; }
  .quick-reply-btn:hover { background: ${t.primary}; color: #1a0a00; }
  .chat-input-row { display: flex; gap: 8px; padding: 12px 14px; border-top: 1px solid ${t.border}; }
  .chat-input { flex: 1; padding: 8px 12px; background: ${t.inputBg}; border: 1px solid ${t.border}; border-radius: 8px; color: ${t.text}; font-size: 13px; outline: none; font-family: 'DM Sans', sans-serif; }
  .chat-input:focus { border-color: ${t.primary}; }
  .chat-send-btn { padding: 8px 14px; background: ${t.primary}; color: #1a0a00; border: none; border-radius: 8px; cursor: pointer; font-size: 15px; transition: all 0.15s; }
  .chat-send-btn:hover { background: #fbbf24; }
  .typing-dot { width: 6px; height: 6px; border-radius: 50%; background: ${t.muted}; display: inline-block; animation: typingBounce 1.2s ease-in-out infinite; }
  .typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .typing-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes typingBounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-5px); } }

  /* ALERTS PAGE */
  .alerts-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
  @media (max-width: 1000px) { .alerts-grid { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 640px) { .alerts-grid { grid-template-columns: 1fr; } }
  .alert-column-title { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 14px; padding: 12px 16px; border-radius: 10px 10px 0 0; display: flex; align-items: center; gap: 8px; }
  .alert-column-critical { background: ${t.warningDim}; color: ${t.warning}; }
  .alert-column-low { background: ${t.infoDim}; color: ${t.info}; }
  .alert-column-overstock { background: rgba(139,92,246,0.12); color: #a78bfa; }
  .alert-item { background: ${t.surface}; border: 1px solid ${t.border}; border-top: none; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
  .alert-item:last-child { border-radius: 0 0 10px 10px; }
  .alert-item-name { font-weight: 600; font-size: 14px; color: ${t.text}; }
  .alert-item-details { font-size: 12px; color: ${t.muted}; font-family: 'DM Mono', monospace; }

  /* EXPORT PAGE */
  .export-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
  .export-card { background: ${t.card}; border: 2px dashed ${t.border}; border-radius: 16px; padding: 36px; text-align: center; cursor: pointer; transition: all 0.2s; }
  .export-card:hover { border-color: ${t.primary}; background: ${t.primaryDim}; }
  .export-card-icon { font-size: 48px; margin-bottom: 16px; }
  .export-card-title { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 18px; color: ${t.text}; margin-bottom: 8px; }
  .export-card-desc { font-size: 13px; color: ${t.muted}; line-height: 1.6; }

  /* SETTINGS PAGE */
  .settings-section { background: ${t.card}; border: 1px solid ${t.border}; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
  .settings-section-title { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 16px; color: ${t.text}; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid ${t.border}; }
  .settings-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid ${t.border}; }
  .settings-row:last-child { border-bottom: none; padding-bottom: 0; }
  .settings-row-label { font-size: 14px; font-weight: 500; color: ${t.text}; }
  .settings-row-sub { font-size: 12px; color: ${t.muted}; margin-top: 2px; }
  .toggle { position: relative; width: 44px; height: 24px; border-radius: 12px; cursor: pointer; transition: background 0.2s; }
  .toggle.on { background: ${t.primary}; }
  .toggle.off { background: ${t.border}; }
  .toggle-thumb { position: absolute; top: 3px; width: 18px; height: 18px; border-radius: 50%; background: white; transition: left 0.2s; }
  .toggle.on .toggle-thumb { left: 23px; }
  .toggle.off .toggle-thumb { left: 3px; }

  /* EOQ CALCULATOR */
  .calc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .calc-result { background: ${t.primaryDim}; border: 1px solid ${t.primary}33; border-radius: 12px; padding: 20px; margin-top: 16px; }
  .calc-result-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid ${t.primary}1a; }
  .calc-result-row:last-child { border-bottom: none; }
  .calc-result-label { font-size: 13px; color: ${t.muted}; }
  .calc-result-value { font-family: 'DM Mono', monospace; font-weight: 600; color: ${t.primary}; font-size: 15px; }

  /* ROP BANNER */
  .rop-banner { background: ${t.primaryDim}; border: 1px solid ${t.primary}33; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; display: flex; gap: 12px; align-items: flex-start; }
  .rop-banner-icon { font-size: 22px; flex-shrink: 0; margin-top: 1px; }
  .rop-banner-text { font-size: 13px; color: ${t.text}; line-height: 1.6; }

  /* MISC */
  .divider { height: 1px; background: ${t.border}; margin: 20px 0; }
  .text-primary { color: ${t.primary}; }
  .text-muted { color: ${t.muted}; }
  .text-warning { color: ${t.warning}; }
  .text-success { color: ${t.success}; }
  .text-info { color: ${t.info}; }
  .flex { display: flex; }
  .flex-center { display: flex; align-items: center; justify-content: center; }
  .gap-8 { gap: 8px; }
  .gap-12 { gap: 12px; }
  .mb-16 { margin-bottom: 16px; }
  .mb-24 { margin-bottom: 24px; }
  .w-full { width: 100%; }
  .recharts-tooltip-wrapper .recharts-default-tooltip { background: ${t.card} !important; border: 1px solid ${t.border} !important; border-radius: 8px !important; }
  .recharts-tooltip-wrapper .recharts-default-tooltip .recharts-tooltip-label { color: ${t.text} !important; font-family: 'DM Sans', sans-serif !important; }
  .recharts-cartesian-axis-tick-value { fill: ${t.muted} !important; font-family: 'DM Sans', sans-serif !important; font-size: 11px !important; }
  .recharts-legend-item-text { color: ${t.muted} !important; font-family: 'DM Sans', sans-serif !important; font-size: 12px !important; }
`;

// ─── API HELPER ────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = async (path, options = {}) => {
  const token = localStorage.getItem("ss_token");
  const isFormData = options.body instanceof URLSearchParams;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    if (!path.includes("/auth/login") && !path.includes("/auth/signup")) {
      localStorage.removeItem("ss_token");
      localStorage.removeItem("ss_user");
      // Dispatch custom event so App component can update React state
      // instead of doing a hard reload which causes the blank screen
      window.dispatchEvent(new Event("ss-unauthorized"));
      return;
    }
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
};

const apiDownload = async (path, filename) => {
  const token = localStorage.getItem("ss_token");
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── MOCK DATA ─────────────────────────────────────────────────────────────────
const MOCK_PRODUCTS = [
  { id: 1, name: "Wireless Headphones Pro", sku: "WHP-001", category: "Electronics", price: 89.99, supplier: "TechSupply Co", stock: 3, reorder_level: 20, optimal_stock: 100, eoq: 47.1, status: "critical" },
  { id: 2, name: "Ergonomic Office Chair", sku: "EOC-042", category: "Furniture", price: 349.99, supplier: "OfficePlus", stock: 8, reorder_level: 15, optimal_stock: 50, eoq: 16.9, status: "low" },
  { id: 3, name: "Mechanical Keyboard RGB", sku: "MKR-007", category: "Electronics", price: 129.99, supplier: "TechSupply Co", stock: 45, reorder_level: 25, optimal_stock: 80, eoq: 27.7, status: "optimal" },
  { id: 4, name: "Standing Desk Converter", sku: "SDC-019", category: "Furniture", price: 199.99, supplier: "OfficePlus", stock: 180, reorder_level: 30, optimal_stock: 100, eoq: 22.4, status: "overstock" },
  { id: 5, name: "USB-C Hub 7-Port", sku: "UCH-033", category: "Accessories", price: 49.99, supplier: "GadgetWorld", stock: 62, reorder_level: 40, optimal_stock: 120, eoq: 63.2, status: "optimal" },
  { id: 6, name: "Noise-Cancelling Earbuds", sku: "NCE-088", category: "Electronics", price: 159.99, supplier: "AudioMax", stock: 2, reorder_level: 30, optimal_stock: 90, eoq: 31.6, status: "critical" },
  { id: 7, name: "Monitor Arm Single", sku: "MAS-055", category: "Accessories", price: 79.99, supplier: "DeskGear Inc", stock: 33, reorder_level: 20, optimal_stock: 60, eoq: 35.4, status: "optimal" },
  { id: 8, name: "Webcam 4K Ultra", sku: "WC4-011", category: "Electronics", price: 199.99, supplier: "TechSupply Co", stock: 14, reorder_level: 18, optimal_stock: 55, eoq: 22.4, status: "low" },
];

const MOCK_SALES = [
  { sale_id: 1, product_id: 3, product_name: "Mechanical Keyboard RGB", sku: "MKR-007", quantity: 2, total_amount: 259.98, sale_time: new Date(Date.now() - 3600000).toISOString(), day_of_week: "Friday", hour_of_day: 14, notes: null, refunded: false },
  { sale_id: 2, product_id: 5, product_name: "USB-C Hub 7-Port", sku: "UCH-033", quantity: 5, total_amount: 249.95, sale_time: new Date(Date.now() - 7200000).toISOString(), day_of_week: "Friday", hour_of_day: 11, notes: "Bulk order", refunded: false },
  { sale_id: 3, product_id: 7, product_name: "Monitor Arm Single", sku: "MAS-055", quantity: 1, total_amount: 79.99, sale_time: new Date(Date.now() - 86400000).toISOString(), day_of_week: "Thursday", hour_of_day: 10, notes: null, refunded: true },
  { sale_id: 4, product_id: 1, product_name: "Wireless Headphones Pro", sku: "WHP-001", quantity: 3, total_amount: 269.97, sale_time: new Date(Date.now() - 172800000).toISOString(), day_of_week: "Wednesday", hour_of_day: 15, notes: null, refunded: false },
];

const MOCK_STATS = { total_skus: 8, stock_value: 32487.50, low_alerts: 4, total_revenue: 18329.44, total_products: 8 };

const MOCK_FORECAST = {
  data: [
    { period: "2024-09", revenue: 12340, predicted: false, transactions: 45 },
    { period: "2024-10", revenue: 14820, predicted: false, transactions: 53 },
    { period: "2024-11", revenue: 13900, predicted: false, transactions: 49 },
    { period: "2024-12", revenue: 18200, predicted: false, transactions: 68 },
    { period: "2025-01", revenue: 15400, predicted: false, transactions: 57 },
    { period: "2025-02", revenue: 16100, predicted: false, transactions: 61 },
    { period: "2025-03", revenue: 17900, predicted: true, transactions: null },
    { period: "2025-04", revenue: 19200, predicted: true, transactions: null },
    { period: "2025-05", revenue: 20100, predicted: true, transactions: null },
    { period: "2025-06", revenue: 21400, predicted: true, transactions: null },
  ],
};

const MOCK_DAY_TRENDS = [
  { day: "Monday", count: 23, revenue: 4120 },
  { day: "Tuesday", count: 31, revenue: 5830 },
  { day: "Wednesday", count: 28, revenue: 5200 },
  { day: "Thursday", count: 35, revenue: 6740 },
  { day: "Friday", count: 48, revenue: 9320 },
  { day: "Saturday", count: 19, revenue: 3410 },
  { day: "Sunday", count: 12, revenue: 2100 },
];

const MOCK_PEAK_HOURS = Array.from({ length: 24 }, (_, h) => ({
  hour: h, label: `${h.toString().padStart(2, "0")}:00`,
  count: h >= 9 && h <= 17 ? Math.floor(Math.random() * 20 + 10) : Math.floor(Math.random() * 5),
  revenue: h >= 9 && h <= 17 ? Math.floor(Math.random() * 2000 + 500) : Math.floor(Math.random() * 200),
}));

const MOCK_ALERTS = {
  critical: MOCK_PRODUCTS.filter(p => p.status === "critical").map(p => ({ ...p, suggested_order: Math.round(p.eoq) })),
  low: MOCK_PRODUCTS.filter(p => p.status === "low").map(p => ({ ...p, suggested_order: Math.round(p.eoq) })),
  overstock: MOCK_PRODUCTS.filter(p => p.status === "overstock").map(p => ({ ...p, suggested_order: 0 })),
  optimal_count: MOCK_PRODUCTS.filter(p => p.status === "optimal").length,
  total_products: MOCK_PRODUCTS.length,
};

// ─── TOAST CONTEXT ─────────────────────────────────────────────────────────────
const ToastCtx = createContext(null);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3800);
  }, []);
  return (
    <ToastCtx.Provider value={add}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span>{t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}</span>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
const useToast = () => useContext(ToastCtx);

// ─── UTILS ─────────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
const fmtMoney = (n) => "$" + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const fmtDateTime = (d) => d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const initials = (name = "") => name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
const stockPct = (p) => Math.min(100, Math.round((p.stock / (p.optimal_stock || 1)) * 100));

function StatusBadge({ status }) {
  const map = { critical: "badge-critical", low: "badge-low", optimal: "badge-optimal", overstock: "badge-overstock", good: "badge-good" };
  const icons = { critical: "🔴", low: "🟡", optimal: "🟢", overstock: "🟣" };
  return <span className={`badge ${map[status] || "badge-optimal"}`}>{icons[status] || ""} {status}</span>;
}

function StockBar({ product, t }) {
  const pct = stockPct(product);
  const color = product.status === "critical" ? t.warning : product.status === "low" ? t.info : product.status === "overstock" ? "#a78bfa" : t.success;
  return (
    <div style={{ minWidth: 80 }}>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div style={{ fontSize: 11, color: color, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{fmt(product.stock)} / {fmt(product.optimal_stock)}</div>
    </div>
  );
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
function DashboardPage({ t }) {
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [s, p, a] = await Promise.all([
          api("/inventory/stats"),
          api("/inventory/products"),
          api("/alerts/"),
        ]);
        setStats(s); setProducts(p); setAlerts(a);
      } catch {
        setStats(MOCK_STATS); setProducts(MOCK_PRODUCTS); setAlerts(MOCK_ALERTS);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="loading-overlay"><div className="spinner" /><span>Loading dashboard...</span></div>;

  // Category chart data
  const cats = {};
  products.forEach(p => { cats[p.category || "Other"] = (cats[p.category || "Other"] || 0) + p.stock; });
  const catData = Object.entries(cats).map(([cat, qty]) => ({ cat, qty })).sort((a, b) => b.qty - a.qty);

  // Status donut
  const statusCount = { critical: 0, low: 0, optimal: 0, overstock: 0 };
  products.forEach(p => { statusCount[p.status] = (statusCount[p.status] || 0) + 1; });
  const donutData = Object.entries(statusCount).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  const DONUT_COLORS = { critical: t.warning, low: t.info, optimal: t.success, overstock: "#a78bfa" };

  // Mini sparkline from products stock
  const sparkData = products.slice(0, 6).map((p, i) => ({ name: p.sku, stock: p.stock, value: p.price * p.stock }));

  const topProducts = [...products].sort((a, b) => b.price * b.stock - a.price * a.stock).slice(0, 6);

  const criticalAlerts = alerts?.critical || [];
  const lowAlerts = alerts?.low || [];

  return (
    <div className="page-enter">
      <div className="section-header mb-24">
        <div>
          <h2 className="section-title">Dashboard</h2>
          <p className="section-sub">Your inventory at a glance</p>
        </div>
        <span style={{ fontSize: 13, color: t.muted }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
      </div>

      {/* KPI CARDS */}
      <div className="stat-grid">
        {[
          { label: "Total SKUs", value: fmt(stats?.total_skus || 0), icon: "📦", color: t.primary, bg: t.primaryDim, sub: "Active products" },
          { label: "Stock Value", value: fmtMoney(stats?.stock_value || 0), icon: "💰", color: t.success, bg: t.successDim, sub: "Total inventory worth" },
          { label: "Low Alerts", value: fmt(stats?.low_alerts || 0), icon: "⚠️", color: t.warning, bg: t.warningDim, sub: "Need attention" },
          { label: "Total Revenue", value: fmtMoney(stats?.total_revenue || 0), icon: "📈", color: t.info, bg: t.infoDim, sub: "All-time sales" },
        ].map(card => (
          <div key={card.label} className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">{card.label}</span>
              <div className="stat-card-icon" style={{ background: card.bg, color: card.color }}>{card.icon}</div>
            </div>
            <div className="stat-card-value">{card.value}</div>
            <div className="stat-card-change">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* CHARTS ROW */}
      <div className="charts-row mb-24">
        <div className="chart-card">
          <div className="chart-title">Stock by Category</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={catData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} horizontal={false} />
              <XAxis type="number" tick={{ fill: t.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="cat" tick={{ fill: t.muted, fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip contentStyle={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 8 }} labelStyle={{ color: t.text }} itemStyle={{ color: t.primary }} />
              <Bar dataKey="qty" fill={t.primary} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <div className="chart-title">Status Distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                {donutData.map((entry) => <Cell key={entry.name} fill={DONUT_COLORS[entry.name] || t.primary} />)}
              </Pie>
              <Tooltip contentStyle={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 8 }} labelStyle={{ color: t.text }} itemStyle={{ color: t.text }} />
              <Legend iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* STOCK VALUE TREND (using product data as proxy) */}
      <div className="chart-card mb-24">
        <div className="chart-title">Product Stock Value Overview</div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={sparkData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={t.primary} stopOpacity={0.3} />
                <stop offset="95%" stopColor={t.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="name" tick={{ fill: t.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: t.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtMoney(v)} />
            <Tooltip contentStyle={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 8 }} formatter={(v) => [fmtMoney(v), "Value"]} itemStyle={{ color: t.primary }} />
            <Area type="monotone" dataKey="value" stroke={t.primary} fill="url(#stockGrad)" strokeWidth={2} dot={{ fill: t.primary, strokeWidth: 0, r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* BOTTOM ROW: table + alerts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        {/* OVERVIEW TABLE */}
        <div className="table-card">
          <div className="table-header">
            <span className="table-title">Top Products by Value</span>
          </div>
          <table>
            <thead><tr><th>Product</th><th>Stock</th><th>Price</th><th>Status</th></tr></thead>
            <tbody>
              {topProducts.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.name}</div>
                    <div className="mono" style={{ color: t.muted }}>{p.sku}</div>
                  </td>
                  <td><StockBar product={p} t={t} /></td>
                  <td><span className="mono">{fmtMoney(p.price)}</span></td>
                  <td><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SMART ALERTS */}
        <div className="chart-card" style={{ maxHeight: 480, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div className="chart-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            ⚠️ Smart Alerts
            <span className="badge badge-critical">{(criticalAlerts.length + lowAlerts.length)} issues</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {[...criticalAlerts, ...lowAlerts].slice(0, 5).map(item => (
              <div key={item.id} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</span>
                  <StatusBadge status={item.status} />
                </div>
                <div style={{ fontSize: 12, color: t.muted, fontFamily: "'DM Mono', monospace" }}>
                  Stock: {item.stock} / ROP: {item.reorder_level}
                </div>
                <div style={{ fontSize: 12, color: t.success, marginTop: 4 }}>Suggest order: {item.suggested_order} units</div>
              </div>
            ))}
            {criticalAlerts.length === 0 && lowAlerts.length === 0 && (
              <div style={{ textAlign: "center", color: t.muted, padding: "20px 0", fontSize: 14 }}>
                ✅ All stock levels are healthy
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PRODUCTS PAGE ─────────────────────────────────────────────────────────────
function ProductsPage({ t }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", category: "", price: "", supplier: "", stock: "", reorder_level: "10", optimal_stock: "100" });
  const toast = useToast();

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      if (search) params.set("search", search);
      const data = await api(`/inventory/products?${params}`);
      setProducts(data);
    } catch {
      setProducts(MOCK_PRODUCTS);
    }
  };

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [filter]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await api("/inventory/products", {
        method: "POST",
        body: JSON.stringify({ ...form, price: parseFloat(form.price), stock: parseInt(form.stock), reorder_level: parseInt(form.reorder_level), optimal_stock: parseInt(form.optimal_stock) }),
      });
      setProducts(prev => [data, ...prev]);
      setShowModal(false);
      setForm({ name: "", sku: "", category: "", price: "", supplier: "", stock: "", reorder_level: "10", optimal_stock: "100" });
      toast("Product added successfully!", "success");
    } catch (err) {
      toast(err.message, "error");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await api(`/inventory/products/${id}`, { method: "DELETE" });
      setProducts(prev => prev.filter(p => p.id !== id));
      toast("Product deleted", "success");
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const upd = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-enter">
      <div className="section-header">
        <div>
          <h2 className="section-title">Products</h2>
          <p className="section-sub">{products.length} items in inventory</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Product</button>
      </div>

      {/* FILTERS */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div className="filter-tabs">
          {["all", "critical", "low", "optimal", "overstock"].map(s => (
            <button key={s} className={`filter-tab ${filter === s ? "active" : ""}`} onClick={() => setFilter(s)}>
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="topbar-search" style={{ maxWidth: 240 }}>
          <span style={{ color: t.muted }}>🔍</span>
          <input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="spinner" /><span>Loading products...</span></div>
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Product</th><th>Category</th><th>Stock Level</th><th>ROP</th><th>EOQ</th><th>Price</th><th>Supplier</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div className="mono" style={{ color: t.muted, fontSize: 11 }}>{p.sku}</div>
                  </td>
                  <td style={{ color: t.muted, fontSize: 13 }}>{p.category || "—"}</td>
                  <td style={{ minWidth: 130 }}><StockBar product={p} t={t} /></td>
                  <td><span className="mono">{fmt(p.reorder_level)}</span></td>
                  <td><span className="mono" style={{ color: t.primary }}>{fmt(p.eoq)}</span></td>
                  <td><span className="mono">{fmtMoney(p.price)}</span></td>
                  <td style={{ color: t.muted, fontSize: 13 }}>{p.supplier || "—"}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id, p.name)}>🗑</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: "center", color: t.muted, padding: "32px" }}>No products found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">📦 Add New Product</div>
            <form onSubmit={handleAdd}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <div className="input-group"><label className="input-label">Product Name*</label><input className="input" placeholder="e.g. Wireless Mouse" value={form.name} onChange={upd("name")} required /></div>
                <div className="input-group"><label className="input-label">SKU*</label><input className="input" placeholder="e.g. WM-001" value={form.sku} onChange={upd("sku")} required /></div>
                <div className="input-group"><label className="input-label">Category</label><input className="input" placeholder="Electronics" value={form.category} onChange={upd("category")} /></div>
                <div className="input-group"><label className="input-label">Price ($)*</label><input className="input" type="number" step="0.01" placeholder="0.00" value={form.price} onChange={upd("price")} required /></div>
                <div className="input-group"><label className="input-label">Supplier</label><input className="input" placeholder="Supplier name" value={form.supplier} onChange={upd("supplier")} /></div>
                <div className="input-group"><label className="input-label">Current Stock*</label><input className="input" type="number" placeholder="0" value={form.stock} onChange={upd("stock")} required /></div>
                <div className="input-group"><label className="input-label">Reorder Level</label><input className="input" type="number" placeholder="10" value={form.reorder_level} onChange={upd("reorder_level")} /></div>
                <div className="input-group"><label className="input-label">Optimal Stock</label><input className="input" type="number" placeholder="100" value={form.optimal_stock} onChange={upd("optimal_stock")} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <><span className="spinner spinner-sm" /> Adding...</> : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SALES PAGE ────────────────────────────────────────────────────────────────
function SalesPage({ t }) {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ product_id: "", quantity: "1", notes: "" });
  const toast = useToast();

  const load = async () => {
    try {
      const [s, p] = await Promise.all([api("/sales/history?limit=100"), api("/inventory/products")]);
      setSales(s); setProducts(p);
    } catch {
      setSales(MOCK_SALES); setProducts(MOCK_PRODUCTS);
    }
  };

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, []);

  const handleSale = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await api("/sales/record", {
        method: "POST",
        body: JSON.stringify({ product_id: parseInt(form.product_id), quantity: parseInt(form.quantity), notes: form.notes || null }),
      });
      const msg = `Sale recorded! ${result.product_name} × ${result.quantity} = ${fmtMoney(result.total_amount)}. Stock: ${result.remaining_stock}`;
      toast(msg, "success");
      if (result.alert_triggered) setTimeout(() => toast("⚠️ " + result.alert_triggered, "error"), 800);
      setShowModal(false);
      setForm({ product_id: "", quantity: "1", notes: "" });
      load();
    } catch (err) {
      toast(err.message, "error");
    }
    setSubmitting(false);
  };

  const handleRefund = async (saleId, productName) => {
    if (!confirm(`Process refund for sale #${saleId} (${productName})?`)) return;
    try {
      const result = await api(`/sales/refund/${saleId}`, { method: "POST", body: JSON.stringify({ reason: "Customer request" }) });
      toast(`Refund processed! ${result.product_name} — ${fmtMoney(result.refund_amount)} returned. New stock: ${result.new_stock}`, "success");
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const totalRevenue = sales.reduce((s, x) => s + (x.refunded ? 0 : x.total_amount), 0);
  const avgOrderValue = sales.length > 0 ? totalRevenue / sales.filter(s => !s.refunded).length : 0;
  const topSku = sales.length > 0 ? sales.reduce((a, b) => a.total_amount > b.total_amount ? a : b).sku : "—";

  return (
    <div className="page-enter">
      <div className="section-header">
        <div>
          <h2 className="section-title">Sales</h2>
          <p className="section-sub">{sales.length} transactions recorded</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Record Sale</button>
      </div>

      {/* STATS */}
      <div className="stat-grid">
        {[
          { label: "Total Revenue", value: fmtMoney(totalRevenue), icon: "💵", color: t.success, bg: t.successDim },
          { label: "Transactions", value: fmt(sales.length), icon: "🧾", color: t.primary, bg: t.primaryDim },
          { label: "Avg Order Value", value: fmtMoney(avgOrderValue), icon: "📊", color: t.info, bg: t.infoDim },
          { label: "Top SKU", value: topSku, icon: "🏆", color: t.warning, bg: t.warningDim },
        ].map(card => (
          <div key={card.label} className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">{card.label}</span>
              <div className="stat-card-icon" style={{ background: card.bg }}>{card.icon}</div>
            </div>
            <div className="stat-card-value" style={{ fontSize: card.label === "Top SKU" ? 18 : 26 }}>{card.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="spinner" /><span>Loading sales...</span></div>
      ) : (
        <div className="table-card">
          <div className="table-header">
            <span className="table-title">Sales History</span>
            <span style={{ fontSize: 13, color: t.muted }}>{sales.length} records</span>
          </div>
          <table>
            <thead>
              <tr><th>Sale ID</th><th>Product</th><th>SKU</th><th>Qty</th><th>Total</th><th>Date</th><th>Day</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.sale_id}>
                  <td><span className="mono" style={{ color: t.muted }}>#{s.sale_id}</span></td>
                  <td style={{ fontWeight: 500 }}>{s.product_name}</td>
                  <td><span className="mono">{s.sku}</span></td>
                  <td><span className="mono">{s.quantity}</span></td>
                  <td><span className="mono" style={{ color: s.refunded ? t.muted : t.success }}>{fmtMoney(s.total_amount)}</span></td>
                  <td style={{ color: t.muted, fontSize: 12 }}>{fmtDateTime(s.sale_time)}</td>
                  <td style={{ color: t.muted, fontSize: 12 }}>{s.day_of_week || "—"}</td>
                  <td>{s.refunded ? <span className="badge badge-critical">Refunded</span> : <span className="badge badge-good">Completed</span>}</td>
                  <td>
                    {!s.refunded && (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleRefund(s.sale_id, s.product_name)}>↩ Refund</button>
                    )}
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: "center", color: t.muted, padding: "32px" }}>No sales recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* RECORD SALE MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">🧾 Record Sale</div>
            <form onSubmit={handleSale}>
              <div className="input-group">
                <label className="input-label">Product*</label>
                <select className="input" value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} required>
                  <option value="">— Select product —</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku}) — Stock: {p.stock}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Quantity*</label>
                <input className="input" type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required />
              </div>
              <div className="input-group">
                <label className="input-label">Notes (optional)</label>
                <input className="input" placeholder="e.g. Bulk order, returns..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              {form.product_id && (
                <div style={{ background: t.primaryDim, border: `1px solid ${t.primary}33`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
                  <span style={{ color: t.muted }}>Estimated total: </span>
                  <span className="mono" style={{ color: t.primary }}>
                    {fmtMoney((products.find(p => p.id === parseInt(form.product_id))?.price || 0) * parseInt(form.quantity || 1))}
                  </span>
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <><span className="spinner spinner-sm" /> Recording...</> : "Record Sale"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LOGIN PAGE ────────────────────────────────────────────────────────────────
function LoginPage({ onLogin, switchToSignup, t }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const form = new URLSearchParams();
      form.append("username", email);
      form.append("password", password);
      const data = await api("/auth/login", {
        method: "POST",
        body: form,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      localStorage.setItem("ss_token", data.access_token);
      localStorage.setItem("ss_user", JSON.stringify(data.user));
      onLogin(data.user);
      toast("Welcome back, " + data.user.name + "!", "success");
    } catch (err) {
      toast(err.message || "Incorrect email or password", "error");
    }
    setLoading(false);
  };

  return (
    <div className="auth-page" style={{ background: t.bg }}>
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">📦</div>
          <span className="auth-logo-text">SmartStock Pro</span>
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to manage your inventory</p>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", padding: "12px 16px", fontSize: 15, marginTop: 8 }}
          >
            {loading ? <><span className="spinner spinner-sm" /> Signing in...</> : "Sign In →"}
          </button>
        </form>
        <p className="auth-divider">
          Don't have an account? <span className="auth-link" onClick={switchToSignup}>Create one</span>
        </p>
      </div>
    </div>
  );
}

// ─── SIGNUP PAGE ───────────────────────────────────────────────────────────────
function SignupPage({ onLogin, switchToLogin, t }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", role: "staff", company: "" });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast("Passwords do not match", "error"); return; }
    setLoading(true);
    try {
      const data = await api("/auth/signup", { method: "POST", body: JSON.stringify({ name: form.name, email: form.email, password: form.password, role: form.role, company: form.company }) });
      localStorage.setItem("ss_token", data.access_token);
      localStorage.setItem("ss_user", JSON.stringify(data.user));
      onLogin(data.user);
      toast("Account created! Welcome to SmartStock Pro 🎉", "success");
    } catch (err) {
      toast(err.message, "error");
    }
    setLoading(false);
  };

  const upd = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">📦</div>
          <span className="auth-logo-text">SmartStock Pro</span>
        </div>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Start optimizing your inventory today</p>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input className="input" placeholder="Jane Smith" value={form.name} onChange={upd("name")} required />
            </div>
            <div className="input-group">
              <label className="input-label">Company</label>
              <input className="input" placeholder="Acme Corp" value={form.company} onChange={upd("company")} />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input className="input" type="email" placeholder="you@company.com" value={form.email} onChange={upd("email")} required />
          </div>
          <div className="input-group">
            <label className="input-label">Role</label>
            <select className="input" value={form.role} onChange={upd("role")}>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
            <div className="input-group">
              <label className="input-label">Password</label>
              <input className="input" type="password" placeholder="Min 8 chars" value={form.password} onChange={upd("password")} required />
            </div>
            <div className="input-group">
              <label className="input-label">Confirm</label>
              <input className="input" type="password" placeholder="Repeat password" value={form.confirm} onChange={upd("confirm")} required />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "12px 16px", fontSize: 15, marginTop: 8 }}>
            {loading ? <><span className="spinner spinner-sm" /> Creating...</> : "Create Account →"}
          </button>
        </form>
        <p className="auth-divider">Already have an account? <span className="auth-link" onClick={switchToLogin}>Sign in</span></p>
      </div>
    </div>
  );
}

// ─── ANALYTICS PAGE ───────────────────────────────────────────────────────────
function AnalyticsPage({ t }) {
  const [forecast, setForecast] = useState(null);
  const [dayTrends, setDayTrends] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calc, setCalc] = useState({ demand: 1000, ordering: 50, holding: 10, leadTime: 7, dailySales: 15, safety: 50 });
  const upd = (k) => (e) => setCalc(c => ({ ...c, [k]: parseFloat(e.target.value) || 0 }));

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [f, d, p] = await Promise.all([
          api("/analytics/forecast"),
          api("/sales/trends/day-of-week"),
          api("/analytics/peak-hours"),
        ]);
        setForecast(f); setDayTrends(d); setPeakHours(p);
      } catch {
        setForecast(MOCK_FORECAST);
        setDayTrends(MOCK_DAY_TRENDS);
        setPeakHours(MOCK_PEAK_HOURS);
      }
      setLoading(false);
    })();
  }, []);

  const eoq = calc.holding > 0 ? Math.sqrt((2 * calc.demand * calc.ordering) / calc.holding) : 0;
  const rop = calc.leadTime * calc.dailySales + calc.safety;
  const ordersPerYear = eoq > 0 ? calc.demand / eoq : 0;
  const cycleDays = ordersPerYear > 0 ? 365 / ordersPerYear : 0;
  const totalCost = eoq > 0 ? (calc.demand / eoq) * calc.ordering + (eoq / 2) * calc.holding : 0;

  if (loading) return <div className="loading-overlay"><div className="spinner" /><span>Loading analytics...</span></div>;

  const fcData = forecast?.data || MOCK_FORECAST.data;

  return (
    <div className="page-enter">
      <div className="section-header mb-24">
        <div><h2 className="section-title">Analytics</h2><p className="section-sub">Forecast, trends & optimization</p></div>
      </div>

      {/* DEMAND FORECAST */}
      <div className="chart-card mb-24">
        <div className="chart-title">📈 Demand Forecast — Actual vs Predicted</div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={fcData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={t.primary} stopOpacity={0.3} />
                <stop offset="95%" stopColor={t.primary} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="predictGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={t.info} stopOpacity={0.3} />
                <stop offset="95%" stopColor={t.info} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="period" tick={{ fill: t.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: t.muted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => "$" + (v / 1000).toFixed(0) + "k"} />
            <Tooltip contentStyle={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 8 }} formatter={(v, n) => [fmtMoney(v), n]} itemStyle={{ color: t.text }} />
            <Legend />
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke={t.primary} fill="url(#actualGrad)" strokeWidth={2} dot={(props) => {
              const { cx, cy, payload } = props;
              if (payload.predicted) return null;
              return <circle key={cx} cx={cx} cy={cy} r={3} fill={t.primary} strokeWidth={0} />;
            }} />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: t.muted }}>
            <span style={{ color: t.primary }}>━</span> Actual ({fcData.filter(d => !d.predicted).length} months)
          </span>
          <span style={{ fontSize: 12, color: t.muted }}>
            <span style={{ color: t.info }}>╌</span> Predicted ({fcData.filter(d => d.predicted).length} months ahead)
          </span>
          {forecast?.message && <span style={{ fontSize: 12, color: t.muted }}>ℹ️ {forecast.message}</span>}
        </div>
      </div>

      {/* DAY OF WEEK + PEAK HOURS */}
      <div className="charts-row mb-24">
        <div className="chart-card">
          <div className="chart-title">📅 Sales by Day of Week</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dayTrends} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis dataKey="day" tick={{ fill: t.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={d => d.slice(0, 3)} />
              <YAxis tick={{ fill: t.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 8 }} itemStyle={{ color: t.text }} formatter={(v, n) => [n === "revenue" ? fmtMoney(v) : v, n]} />
              <Bar dataKey="count" name="Sales" fill={t.primary} radius={[4, 4, 0, 0]} />
              <Bar dataKey="revenue" name="Revenue" fill={t.info} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <div className="chart-title">🕐 Peak Hours Distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={peakHours.filter(h => h.count > 0 || (h.hour >= 8 && h.hour <= 20))} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis dataKey="label" tick={{ fill: t.muted, fontSize: 9 }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fill: t.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 8 }} itemStyle={{ color: t.text }} />
              <Bar dataKey="count" name="Sales" fill={t.success} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* EOQ CALCULATOR */}
      <div className="chart-card">
        <div className="chart-title">🧮 EOQ & ROP Interactive Calculator</div>
        <div className="calc-grid">
          {[
            { label: "Annual Demand (units)", key: "demand", placeholder: "1000" },
            { label: "Ordering Cost ($/order)", key: "ordering", placeholder: "50" },
            { label: "Holding Cost ($/unit/year)", key: "holding", placeholder: "10" },
            { label: "Lead Time (days)", key: "leadTime", placeholder: "7" },
            { label: "Daily Sales Velocity", key: "dailySales", placeholder: "15" },
            { label: "Safety Stock (units)", key: "safety", placeholder: "50" },
          ].map(({ label, key, placeholder }) => (
            <div key={key} className="input-group" style={{ marginBottom: 12 }}>
              <label className="input-label">{label}</label>
              <input className="input" type="number" placeholder={placeholder} value={calc[key]} onChange={upd(key)} />
            </div>
          ))}
        </div>
        <div className="calc-result">
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: t.primary, marginBottom: 12, fontSize: 15 }}>📊 Results</div>
          {[
            { label: "Economic Order Quantity (EOQ)", value: `${Math.round(eoq)} units` },
            { label: "Reorder Point (ROP)", value: `${Math.round(rop)} units` },
            { label: "Orders Per Year", value: `${ordersPerYear.toFixed(1)} times` },
            { label: "Order Cycle Time", value: `${Math.round(cycleDays)} days` },
            { label: "Total Annual Inventory Cost", value: fmtMoney(totalCost) },
          ].map(row => (
            <div key={row.label} className="calc-result-row">
              <span className="calc-result-label">{row.label}</span>
              <span className="calc-result-value">{row.value}</span>
            </div>
          ))}
          <div style={{ marginTop: 12, fontSize: 13, color: t.muted, lineHeight: 1.6 }}>
            💡 Order <strong style={{ color: t.primary }}>{Math.round(eoq)} units</strong> each time. Place new orders when stock hits <strong style={{ color: t.warning }}>{Math.round(rop)} units</strong>.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ALERTS PAGE ──────────────────────────────────────────────────────────────
function AlertsPage({ t }) {
  const [alertData, setAlertData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = async () => {
    try {
      const data = await api("/alerts/");
      setAlertData(data);
    } catch {
      setAlertData(MOCK_ALERTS);
    }
  };

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, []);

  const sendEmail = async (productId, productName) => {
    try {
      await api(`/alerts/send-email/${productId}`, { method: "POST" });
      toast(`Alert email sent for ${productName}!`, "success");
    } catch (err) {
      toast(err.message || "Email send failed", "error");
    }
  };

  const placeOrder = (product) => {
    toast(`Purchase order queued for ${product.name} (${product.suggested_order} units)`, "info");
  };

  if (loading) return <div className="loading-overlay"><div className="spinner" /><span>Scanning inventory...</span></div>;

  const { critical = [], low = [], overstock = [], optimal_count = 0, total_products = 0 } = alertData || {};

  const AlertColumn = ({ items, title, colorClass, badgeClass, emptyText, showEmail = true }) => (
    <div>
      <div className={`alert-column-title ${colorClass}`}>{title} <span className="badge" style={{ background: "rgba(0,0,0,0.15)", fontSize: 11, padding: "1px 7px" }}>{items.length}</span></div>
      {items.length === 0 ? (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderTop: "none", padding: "20px 16px", borderRadius: "0 0 10px 10px", color: t.muted, fontSize: 13, textAlign: "center" }}>
          ✅ {emptyText}
        </div>
      ) : items.map((item, i) => (
        <div key={item.id} className="alert-item" style={{ borderRadius: i === items.length - 1 ? "0 0 10px 10px" : 0 }}>
          <div className="alert-item-name">{item.name}</div>
          <div className="alert-item-details">
            {item.sku} · Stock: {item.stock} · ROP: {item.reorder_level}
          </div>
          {item.suggested_order > 0 && (
            <div style={{ fontSize: 12, color: t.success }}>Suggested order: {item.suggested_order} units ({fmtMoney(item.price * item.suggested_order)})</div>
          )}
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {showEmail && <button className="btn btn-danger btn-sm" onClick={() => sendEmail(item.id, item.name)}>📧 Alert</button>}
            {item.suggested_order > 0 && <button className="btn btn-secondary btn-sm" onClick={() => placeOrder(item)}>🛒 Order</button>}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="page-enter">
      <div className="section-header mb-24">
        <div><h2 className="section-title">Alerts</h2><p className="section-sub">{total_products} products monitored</p></div>
        <div className="flex gap-8">
          <span className="badge badge-critical">{critical.length} Critical</span>
          <span className="badge badge-low">{low.length} Low</span>
          <span className="badge" style={{ background: "rgba(139,92,246,0.12)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.25)" }}>{overstock.length} Overstock</span>
          <span className="badge badge-good">{optimal_count} Optimal</span>
        </div>
      </div>

      <div className="rop-banner">
        <span className="rop-banner-icon">📐</span>
        <div className="rop-banner-text">
          <strong>Reorder Point (ROP) = Lead Time × Daily Sales + Safety Stock.</strong>{" "}
          Critical = stock below 25% of ROP · Low = stock below ROP · Overstock = stock above 120% of optimal · Optimal = everything else.
          Email alerts are sent automatically when items become critical.
        </div>
      </div>

      <div className="alerts-grid">
        <AlertColumn items={critical} title="🔴 Critical" colorClass="alert-column-critical" emptyText="No critical items" showEmail={true} />
        <AlertColumn items={low} title="🟡 Low Stock" colorClass="alert-column-low" emptyText="No low stock items" showEmail={true} />
        <AlertColumn items={overstock} title="🟣 Overstock" colorClass="alert-column-overstock" emptyText="No overstocked items" showEmail={false} />
      </div>

      {/* SUGGESTED PURCHASE ORDERS */}
      {[...critical, ...low].length > 0 && (
        <div className="table-card">
          <div className="table-header">
            <span className="table-title">🛒 Suggested Purchase Orders</span>
          </div>
          <table>
            <thead><tr><th>Product</th><th>SKU</th><th>Current Stock</th><th>Order Qty (EOQ)</th><th>Est. Cost</th><th>Supplier</th><th>Action</th></tr></thead>
            <tbody>
              {[...critical, ...low].map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{item.name}</td>
                  <td><span className="mono">{item.sku}</span></td>
                  <td><span className="mono" style={{ color: item.status === "critical" ? t.warning : t.info }}>{item.stock}</span></td>
                  <td><span className="mono" style={{ color: t.primary }}>{item.suggested_order}</span></td>
                  <td><span className="mono">{fmtMoney(item.price * item.suggested_order)}</span></td>
                  <td style={{ color: t.muted, fontSize: 13 }}>{item.supplier || "—"}</td>
                  <td><button className="btn btn-primary btn-sm" onClick={() => placeOrder(item)}>Place Order</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── EXPORT PAGE ──────────────────────────────────────────────────────────────
function ExportPage({ t }) {
  const [lastExport, setLastExport] = useState({ inventory: null, sales: null });
  const toast = useToast();

  const doExport = async (type) => {
    try {
      await apiDownload(`/export/${type}`, `smartstock_${type}_${new Date().toISOString().slice(0, 10)}.csv`);
      setLastExport(prev => ({ ...prev, [type]: new Date() }));
      toast(`${type.charAt(0).toUpperCase() + type.slice(1)} CSV exported!`, "success");
    } catch (err) {
      toast("Export failed: " + err.message, "error");
    }
  };

  return (
    <div className="page-enter">
      <div className="section-header mb-24">
        <div><h2 className="section-title">Export</h2><p className="section-sub">Download your data as CSV</p></div>
      </div>

      <div className="export-grid">
        <div className="export-card" onClick={() => doExport("inventory")}>
          <div className="export-card-icon">📦</div>
          <div className="export-card-title">Export Inventory</div>
          <div className="export-card-desc">
            Download all products with SKU, category, price, supplier, stock levels, reorder points, EOQ, and current status.
          </div>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={e => { e.stopPropagation(); doExport("inventory"); }}>
            ⬇ Download Inventory CSV
          </button>
          {lastExport.inventory && (
            <div style={{ fontSize: 12, color: t.muted, marginTop: 10 }}>
              Last export: {fmtDateTime(lastExport.inventory)}
            </div>
          )}
        </div>

        <div className="export-card" onClick={() => doExport("sales")}>
          <div className="export-card-icon">🧾</div>
          <div className="export-card-title">Export Sales</div>
          <div className="export-card-desc">
            Download complete sales history with product details, quantities, totals, timestamps, day of week, hour, and refund status.
          </div>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={e => { e.stopPropagation(); doExport("sales"); }}>
            ⬇ Download Sales CSV
          </button>
          {lastExport.sales && (
            <div style={{ fontSize: 12, color: t.muted, marginTop: 10 }}>
              Last export: {fmtDateTime(lastExport.sales)}
            </div>
          )}
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-title">📋 Export Reference</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 8 }}>Inventory CSV Columns</div>
            {["ID", "Name", "SKU", "Category", "Price", "Supplier", "Stock", "Reorder Level", "Optimal Stock", "EOQ", "Status", "Created At", "Updated At"].map(col => (
              <div key={col} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${t.border}`, fontSize: 13 }}>
                <span style={{ color: t.primary, fontFamily: "'DM Mono', monospace", fontSize: 11 }}>›</span>
                <span style={{ color: t.muted }}>{col}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 8 }}>Sales CSV Columns</div>
            {["Sale ID", "Product", "SKU", "Quantity", "Total Amount", "Date", "Day of Week", "Hour", "Notes", "Refunded"].map(col => (
              <div key={col} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${t.border}`, fontSize: 13 }}>
                <span style={{ color: t.info, fontFamily: "'DM Mono', monospace", fontSize: 11 }}>›</span>
                <span style={{ color: t.muted }}>{col}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SETTINGS PAGE ────────────────────────────────────────────────────────────
function SettingsPage({ t, isDark, setIsDark, user, onLogout }) {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [leadTime, setLeadTime] = useState("7");
  const toast = useToast();

  const handleLogout = () => {
    localStorage.removeItem("ss_token");
    localStorage.removeItem("ss_user");
    onLogout();
    toast("Signed out successfully", "success");
  };

  return (
    <div className="page-enter">
      <div className="section-header mb-24">
        <div><h2 className="section-title">Settings</h2><p className="section-sub">Account and application preferences</p></div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">👤 Account</div>
        <div className="settings-row">
          <div><div className="settings-row-label">Name</div><div className="settings-row-sub">{user?.name}</div></div>
          <span style={{ fontSize: 13, color: t.muted, fontFamily: "'DM Mono', monospace" }}>{user?.id}</span>
        </div>
        <div className="settings-row">
          <div><div className="settings-row-label">Email</div><div className="settings-row-sub">{user?.email}</div></div>
          <span className={`badge ${user?.role === "admin" ? "badge-critical" : "badge-good"}`}>{user?.role}</span>
        </div>
        <div className="settings-row">
          <div><div className="settings-row-label">Company</div><div className="settings-row-sub">{user?.company || "Not set"}</div></div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">🎨 Appearance</div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Dark Theme</div>
            <div className="settings-row-sub">Warm dark amber interface</div>
          </div>
          <div className={`toggle ${isDark ? "on" : "off"}`} onClick={() => setIsDark(d => !d)}>
            <div className="toggle-thumb" />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">🔔 Notifications</div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Email Alerts</div>
            <div className="settings-row-sub">Receive Gmail alerts for critical stock levels</div>
          </div>
          <div className={`toggle ${emailAlerts ? "on" : "off"}`} onClick={() => setEmailAlerts(e => !e)}>
            <div className="toggle-thumb" />
          </div>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Default Lead Time</div>
            <div className="settings-row-sub">Days used in ROP calculations</div>
          </div>
          <input className="input" type="number" value={leadTime} onChange={e => setLeadTime(e.target.value)} style={{ width: 80, textAlign: "center" }} />
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">🔌 API Configuration</div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Backend URL</div>
            <div className="settings-row-sub">FastAPI server endpoint</div>
          </div>
          <span className="mono" style={{ fontSize: 12, color: t.muted }}>{API_BASE}</span>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Auth Token</div>
            <div className="settings-row-sub">Current JWT session</div>
          </div>
          <span className="mono" style={{ fontSize: 12, color: t.muted }}>
            {localStorage.getItem("ss_token")?.slice(0, 16)}...
          </span>
        </div>
      </div>

      <button className="btn btn-danger" style={{ marginTop: 8 }} onClick={handleLogout}>
        🚪 Sign Out
      </button>
    </div>
  );
}

// ─── CHATBOT ──────────────────────────────────────────────────────────────────
function Chatbot({ t }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "👋 Hi! I'm **SmartStock AI**. Ask me about EOQ, reorder points, stock alerts, or demand forecasting!" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const QUICK_REPLIES = ["Low stock?", "Calculate EOQ", "Sales trend", "Help"];

  useEffect(() => { if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput("");
    const newHistory = [...messages, { role: "user", content: msg }];
    setMessages(newHistory);
    setTyping(true);
    try {
      const historyForApi = newHistory.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const res = await api("/chat/message", {
        method: "POST",
        body: JSON.stringify({ message: msg, history: historyForApi.slice(0, -1) }),
      });
      setMessages(prev => [...prev, { role: "assistant", content: res.response }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Connection error. Check that the backend is running." }]);
    }
    setTyping(false);
  };

  const renderMsg = (content) => {
    // Simple markdown-ish render: bold, newlines
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <>
      <button className="chat-btn" onClick={() => setOpen(o => !o)} title="SmartStock AI">
        {open ? "✕" : "🤖"}
      </button>
      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <div className="chat-header-title">
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.success, display: "inline-block" }} />
              SmartStock AI
            </div>
            <button className="icon-btn" style={{ width: 28, height: 28, fontSize: 14 }} onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                <div dangerouslySetInnerHTML={{ __html: renderMsg(m.content) }} />
              </div>
            ))}
            {typing && (
              <div className="chat-msg assistant" style={{ display: "flex", gap: 4, alignItems: "center", padding: "10px 14px" }}>
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-quick-replies">
            {QUICK_REPLIES.map(r => (
              <button key={r} className="quick-reply-btn" onClick={() => sendMessage(r)}>{r}</button>
            ))}
          </div>
          <div className="chat-input-row">
            <input
              className="chat-input"
              placeholder="Ask about inventory..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            />
            <button className="chat-send-btn" onClick={() => sendMessage()}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard", icon: "⚡", label: "Dashboard" },
  { id: "products", icon: "📦", label: "Products" },
  { id: "sales", icon: "🧾", label: "Sales" },
  { id: "analytics", icon: "📈", label: "Analytics" },
  { id: "alerts", icon: "⚠️", label: "Alerts" },
  { id: "export", icon: "⬇", label: "Export" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

function Sidebar({ collapsed, setCollapsed, page, setPage, t }) {
  return (
    <nav className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">📦</div>
        <span className="sidebar-logo-text">SmartStock Pro</span>
      </div>
      <div className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <div key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => setPage(item.id)}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="sidebar-footer">
        <button className="sidebar-collapse-btn" onClick={() => setCollapsed(c => !c)}>
          {collapsed ? "→" : "← Collapse"}
        </button>
      </div>
    </nav>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function App() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem("ss_theme") !== "light");
  const [user, setUser] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("ss_user"));
      const tok = localStorage.getItem("ss_token");
      // Only restore session if we have a real JWT (starts with "ey")
      // Discard any old demo tokens that would cause immediate 401s
      if (u && tok && tok.startsWith("ey")) return u;
      // Clean up any stale demo session
      localStorage.removeItem("ss_token");
      localStorage.removeItem("ss_user");
      return null;
    } catch { return null; }
  });
  const [page, setPage] = useState("dashboard");
  const [authPage, setAuthPage] = useState("login");
  const [collapsed, setCollapsed] = useState(false);
  const [topSearch, setTopSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const searchRef = useRef(null);

  const t = isDark ? DARK_THEME : LIGHT_THEME;

  // Listen for 401s fired from the api() helper and handle them in React state
  useEffect(() => {
    const handle = () => { setUser(null); setAuthPage("login"); setPage("dashboard"); };
    window.addEventListener("ss-unauthorized", handle);
    return () => window.removeEventListener("ss-unauthorized", handle);
  }, []);

  const handleLogin = (u) => { setUser(u); setPage("dashboard"); setAuthPage("login"); };

  useEffect(() => {
    let el = document.getElementById("ss-styles");
    if (!el) { el = document.createElement("style"); el.id = "ss-styles"; document.head.appendChild(el); }
    el.textContent = injectStyles(t);
  }, [isDark, t]);

  useEffect(() => {
    localStorage.setItem("ss_theme", isDark ? "dark" : "light");
    document.body.style.background = t.bg;
    document.body.style.color = t.text;
  }, [isDark]);

  if (!user) {
    if (authPage === "login") return <ToastProvider><LoginPage onLogin={handleLogin} switchToSignup={() => setAuthPage("signup")} t={t} /></ToastProvider>;
    return <ToastProvider><SignupPage onLogin={handleLogin} switchToLogin={() => setAuthPage("login")} t={t} /></ToastProvider>;
  }

  const PAGE_TITLES = { dashboard: "Dashboard", products: "Products", sales: "Sales", analytics: "Analytics", alerts: "Alerts", export: "Export", settings: "Settings" };

  // Global search — searches products by name/SKU and nav items
  const handleGlobalSearch = useCallback(async (query) => {
    setTopSearch(query);
    if (!query.trim()) { setSearchResults([]); setShowSearchDrop(false); return; }

    const q = query.toLowerCase();

    // Nav matches
    const navMatches = NAV_ITEMS
      .filter(n => n.label.toLowerCase().includes(q))
      .map(n => ({ type: "page", icon: n.icon, label: n.label, id: n.id }));

    // Product matches — try API first, fall back to mock
    let productMatches = [];
    try {
      const products = await api(`/inventory/products?search=${encodeURIComponent(query)}`);
      productMatches = products.slice(0, 5).map(p => ({
        type: "product", icon: "📦",
        label: p.name, sub: `${p.sku} · ${p.status} · Stock: ${p.stock}`,
        status: p.status, id: p.id,
      }));
    } catch {
      productMatches = MOCK_PRODUCTS
        .filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
        .slice(0, 5)
        .map(p => ({
          type: "product", icon: "📦",
          label: p.name, sub: `${p.sku} · ${p.status} · Stock: ${p.stock}`,
          status: p.status, id: p.id,
        }));
    }

    const results = [...navMatches, ...productMatches];
    setSearchResults(results);
    setShowSearchDrop(results.length > 0);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearchDrop(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const renderPage = () => {
    const props = { t };
    switch (page) {
      case "dashboard": return <DashboardPage {...props} />;
      case "products": return <ProductsPage {...props} />;
      case "sales": return <SalesPage {...props} />;
      case "analytics": return <AnalyticsPage {...props} />;
      case "alerts": return <AlertsPage {...props} />;
      case "export": return <ExportPage {...props} />;
      case "settings": return <SettingsPage {...props} isDark={isDark} setIsDark={setIsDark} user={user} onLogout={() => { setUser(null); setAuthPage("login"); setPage("dashboard"); }} />;
      default: return <DashboardPage {...props} />;
    }
  };

  return (
    <ToastProvider>
      <div className="app-layout">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} page={page} setPage={setPage} t={t} />
        <div className="main-content">
          <header className="topbar">
            <span className="topbar-title">{PAGE_TITLES[page]}</span>

            {/* GLOBAL SEARCH */}
            <div ref={searchRef} style={{ position: "relative", flex: 1, maxWidth: 320 }}>
              <div className="topbar-search">
                <span style={{ color: t.muted }}>🔍</span>
                <input
                  placeholder="Search products, pages..."
                  value={topSearch}
                  onChange={e => handleGlobalSearch(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowSearchDrop(true)}
                />
                {topSearch && (
                  <span style={{ cursor: "pointer", color: t.muted, fontSize: 12 }}
                    onClick={() => { setTopSearch(""); setSearchResults([]); setShowSearchDrop(false); }}>✕</span>
                )}
              </div>
              {showSearchDrop && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                  background: t.card, border: `1px solid ${t.border}`, borderRadius: 10,
                  zIndex: 500, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                }}>
                  {searchResults.map((r, i) => (
                    <div key={i}
                      onClick={() => {
                        if (r.type === "page") setPage(r.id);
                        else setPage("products");
                        setTopSearch(""); setSearchResults([]); setShowSearchDrop(false);
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                        cursor: "pointer", borderBottom: i < searchResults.length - 1 ? `1px solid ${t.border}` : "none",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = t.primaryDim}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <span style={{ fontSize: 16, width: 22, textAlign: "center" }}>{r.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</div>
                        {r.sub && <div style={{ fontSize: 11, color: t.muted, marginTop: 1 }}>{r.sub}</div>}
                      </div>
                      {r.type === "page" && <span style={{ fontSize: 11, color: t.primary, background: t.primaryDim, padding: "2px 6px", borderRadius: 4 }}>Page</span>}
                      {r.type === "product" && r.status && <StatusBadge status={r.status} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="topbar-actions">
              <div className="icon-btn" onClick={() => setIsDark(d => !d)} title="Toggle theme">
                {isDark ? "☀️" : "🌙"}
              </div>
              <div className="icon-btn" onClick={() => setPage("alerts")} title="Alerts">
                🔔
                <span className="notif-dot" />
              </div>
              <div className="avatar" title={user.name} onClick={() => setPage("settings")}>
                {initials(user.name)}
              </div>
            </div>
          </header>
          <main className="page-content">
            {renderPage()}
          </main>
        </div>
      </div>
      <Chatbot t={t} />
    </ToastProvider>
  );
}

// ─── ENTRY POINT ──────────────────────────────────────────────────────────────
const root = createRoot(document.getElementById("root"));
root.render(<App />);