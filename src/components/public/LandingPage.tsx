import React, { useEffect, useState } from 'react';

interface LandingPageProps {
  navigate: (route: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    // Count-up animation for stats
    const counters = document.querySelectorAll<HTMLElement>('[data-count]');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          const target = parseFloat(el.dataset.count || '0');
          const suffix = el.dataset.suffix || '';
          const dec = el.dataset.decimal ? 1 : 0;
          let start: number | null = null;
          const dur = 1400;

          function step(ts: number) {
            if (!start) start = ts;
            const p = Math.min((ts - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent =
              (target * eased).toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix;
            if (p < 1) requestAnimationFrame(step);
          }

          requestAnimationFrame(step);
          io.unobserve(el);
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach((c) => io.observe(c));

    return () => {
      counters.forEach((c) => io.unobserve(c));
      io.disconnect();
    };
  }, []);

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setMobileNavOpen(false);
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="aic-landing-wrapper">
      <style>{`
        .aic-landing-wrapper {
          --ink: #0a0a0a;
          --paper: #fafafa;
          --card: #ffffff;
          --muted: #71717a;
          --faint: #a1a1aa;
          --border: #e4e4e7;
          --green: #15803d;
          --amber: #b45309;
          --radius: 10px;
          --mono: 'JetBrains Mono', monospace;
          --sans: 'Inter', sans-serif;
          --display: 'Space Grotesk', sans-serif;
          background: var(--paper);
          color: var(--ink);
          font-family: var(--sans);
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
        }

        .aic-landing-wrapper * {
          box-sizing: border-box;
        }

        .aic-landing-wrapper a {
          color: inherit;
          text-decoration: none;
        }

        .aic-landing-wrapper .wrap {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .aic-landing-wrapper .mono {
          font-family: var(--mono);
        }

        .aic-landing-wrapper .eyebrow {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: var(--muted);
        }

        /* ---------- NAV ---------- */
        .aic-landing-wrapper nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(250, 250, 250, .85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
        }

        .aic-landing-wrapper .nav-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
        }

        .aic-landing-wrapper .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--display);
          font-weight: 700;
          font-size: 15px;
          letter-spacing: -.01em;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
        }

        .aic-landing-wrapper .nav-links {
          display: flex;
          gap: 28px;
          font-size: 14px;
          color: var(--muted);
        }

        .aic-landing-wrapper .nav-links a:hover {
          color: var(--ink);
        }

        .aic-landing-wrapper .nav-cta {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .aic-landing-wrapper .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--mono);
          font-size: 12px;
          font-weight: 500;
          letter-spacing: .06em;
          text-transform: uppercase;
          padding: 11px 20px;
          border-radius: 8px;
          border: 1px solid var(--ink);
          cursor: pointer;
          transition: .18s;
          background: transparent;
        }

        .aic-landing-wrapper .btn-dark {
          background: var(--ink);
          color: #fff;
        }

        .aic-landing-wrapper .btn-dark:hover {
          background: #262626;
        }

        .aic-landing-wrapper .btn-ghost {
          background: transparent;
          color: var(--ink);
        }

        .aic-landing-wrapper .btn-ghost:hover {
          background: var(--ink);
          color: #fff;
        }

        .aic-landing-wrapper .hamburger {
          display: none;
          background: none;
          border: none;
          font-size: 22px;
          cursor: pointer;
          color: var(--ink);
        }

        /* ---------- HERO ---------- */
        .aic-landing-wrapper .hero {
          padding: 88px 0 72px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .aic-landing-wrapper .hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 56px 56px;
          opacity: .35;
          mask-image: radial-gradient(ellipse 70% 60% at 50% 0%, #000 30%, transparent 75%);
          pointer-events: none;
        }

        .aic-landing-wrapper .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--border);
          background: #fff;
          border-radius: 999px;
          padding: 6px 14px;
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 28px;
          position: relative;
        }

        .aic-landing-wrapper .hero-badge .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--green);
          animation: aic-pulse 2s infinite;
        }

        @keyframes aic-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .35; }
        }

        .aic-landing-wrapper .hero h1 {
          font-family: var(--display);
          font-size: clamp(40px, 6vw, 68px);
          line-height: 1.05;
          letter-spacing: -.03em;
          font-weight: 700;
          max-width: 820px;
          margin: 0 auto 22px;
        }

        .aic-landing-wrapper .hero h1 .thin {
          color: var(--faint);
        }

        .aic-landing-wrapper .hero p.sub {
          font-size: 18px;
          color: var(--muted);
          max-width: 560px;
          margin: 0 auto 36px;
        }

        .aic-landing-wrapper .hero-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .aic-landing-wrapper .hero-note {
          font-family: var(--mono);
          font-size: 11px;
          color: var(--faint);
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        /* ---------- DASHBOARD PREVIEW ---------- */
        .aic-landing-wrapper .preview {
          margin: 56px auto 0;
          max-width: 1040px;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--card);
          box-shadow: 0 24px 60px -20px rgba(0,0,0,.15), 0 4px 12px rgba(0,0,0,.04);
          overflow: hidden;
          text-align: left;
        }

        .aic-landing-wrapper .preview-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          background: #fcfcfc;
        }

        .aic-landing-wrapper .preview-bar .chip {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--border);
        }

        .aic-landing-wrapper .preview-bar .url {
          margin-left: 12px;
          font-family: var(--mono);
          font-size: 11px;
          color: var(--faint);
          background: var(--paper);
          border: 1px solid var(--border);
          padding: 4px 14px;
          border-radius: 6px;
        }

        .aic-landing-wrapper .preview-body {
          display: grid;
          grid-template-columns: 200px 1fr;
          min-height: 460px;
        }

        @media(max-width:900px){
          .aic-landing-wrapper .preview-body {
            grid-template-columns: 1fr;
          }
          .aic-landing-wrapper .pv-side {
            display: none !important;
          }
        }

        .aic-landing-wrapper .pv-side {
          border-right: 1px solid var(--border);
          padding: 16px 12px;
          background: #fcfcfc;
          font-size: 12px;
        }

        .aic-landing-wrapper .pv-side .label {
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: .14em;
          color: var(--faint);
          text-transform: uppercase;
          margin: 14px 6px 6px;
        }

        .aic-landing-wrapper .pv-side .item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          border-radius: 7px;
          color: var(--muted);
        }

        .aic-landing-wrapper .pv-side .item.active {
          background: #efefef;
          color: var(--ink);
          font-weight: 500;
        }

        .aic-landing-wrapper .pv-side .item .ic {
          width: 14px;
          text-align: center;
          font-size: 11px;
        }

        .aic-landing-wrapper .pv-main {
          padding: 22px;
        }

        .aic-landing-wrapper .pv-toprow {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .aic-landing-wrapper .pv-toprow h3 {
          font-family: var(--display);
          font-size: 22px;
          letter-spacing: -.02em;
        }

        .aic-landing-wrapper .pv-toprow .date {
          font-family: var(--mono);
          font-size: 10px;
          color: var(--faint);
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        .aic-landing-wrapper .pv-btnrow {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .aic-landing-wrapper .pv-btn {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: .06em;
          text-transform: uppercase;
          padding: 8px 14px;
          border-radius: 7px;
          border: 1px solid var(--border);
          background: #fff;
          color: var(--ink);
          white-space: nowrap;
          cursor: pointer;
        }

        .aic-landing-wrapper .pv-btn.primary {
          background: var(--ink);
          color: #fff;
          border-color: var(--ink);
        }

        .aic-landing-wrapper .kpis {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 14px;
        }

        @media(max-width:700px){
          .aic-landing-wrapper .kpis {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .aic-landing-wrapper .kpi {
          border: 1px solid var(--border);
          border-radius: 9px;
          padding: 14px;
          background: #fff;
        }

        .aic-landing-wrapper .kpi .t {
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: var(--faint);
          margin-bottom: 8px;
        }

        .aic-landing-wrapper .kpi .v {
          font-family: var(--mono);
          font-size: 17px;
          font-weight: 600;
          letter-spacing: -.02em;
        }

        .aic-landing-wrapper .kpi .s {
          font-family: var(--mono);
          font-size: 9px;
          color: var(--muted);
          margin-top: 6px;
        }

        .aic-landing-wrapper .kpi .v.green {
          color: var(--green);
        }

        .aic-landing-wrapper .pv-grid {
          display: grid;
          grid-template-columns: 1.7fr 1fr;
          gap: 10px;
        }

        @media(max-width:700px){
          .aic-landing-wrapper .pv-grid {
            grid-template-columns: 1fr;
          }
        }

        .aic-landing-wrapper .panel {
          border: 1px solid var(--border);
          border-radius: 9px;
          padding: 14px;
          background: #fff;
        }

        .aic-landing-wrapper .panel .ph {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: .1em;
          text-transform: uppercase;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .aic-landing-wrapper .panel .ps {
          font-size: 11px;
          color: var(--faint);
          margin-bottom: 10px;
        }

        .aic-landing-wrapper .donut-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .aic-landing-wrapper .donut {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: conic-gradient(var(--ink) 0 65%, #b9bcc4 65% 92%, #e4e4e7 92% 100%);
          display: grid;
          place-items: center;
          position: relative;
        }

        .aic-landing-wrapper .donut::after {
          content: '';
          position: absolute;
          width: 66px;
          height: 66px;
          background: #fff;
          border-radius: 50%;
        }

        .aic-landing-wrapper .donut .center {
          position: relative;
          z-index: 1;
          text-align: center;
          font-family: var(--mono);
        }

        .aic-landing-wrapper .donut .center .l {
          font-size: 8px;
          letter-spacing: .14em;
          color: var(--faint);
        }

        .aic-landing-wrapper .donut .center .v {
          font-size: 12px;
          font-weight: 600;
        }

        .aic-landing-wrapper .legend {
          width: 100%;
          font-size: 11px;
        }

        .aic-landing-wrapper .legend .row {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          border-top: 1px solid var(--border);
        }

        .aic-landing-wrapper .legend .row span:first-child {
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--muted);
        }

        .aic-landing-wrapper .sw {
          width: 8px;
          height: 8px;
          border-radius: 2px;
          display: inline-block;
        }

        /* ---------- STATS BAND ---------- */
        .aic-landing-wrapper .stats {
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          background: #fff;
          padding: 44px 0;
        }

        .aic-landing-wrapper .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          text-align: center;
        }

        @media(max-width:800px){
          .aic-landing-wrapper .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .aic-landing-wrapper .stat .n {
          font-family: var(--mono);
          font-size: 30px;
          font-weight: 600;
          letter-spacing: -.02em;
        }

        .aic-landing-wrapper .stat .d {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: var(--muted);
          margin-top: 6px;
        }

        /* ---------- SECTIONS ---------- */
        .aic-landing-wrapper section {
          padding: 88px 0;
        }

        .aic-landing-wrapper .sec-head {
          max-width: 640px;
          margin-bottom: 48px;
        }

        .aic-landing-wrapper .sec-head h2 {
          font-family: var(--display);
          font-size: clamp(28px, 4vw, 40px);
          letter-spacing: -.025em;
          line-height: 1.12;
          margin: 12px 0 14px;
        }

        .aic-landing-wrapper .sec-head p {
          color: var(--muted);
          font-size: 16px;
        }

        .aic-landing-wrapper .center {
          margin-left: auto;
          margin-right: auto;
          text-align: center;
        }

        .aic-landing-wrapper .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        @media(max-width:900px){
          .aic-landing-wrapper .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media(max-width:600px){
          .aic-landing-wrapper .features-grid {
            grid-template-columns: 1fr;
          }
        }

        .aic-landing-wrapper .fcard {
          border: 1px solid var(--border);
          border-radius: var(--radius);
          background: #fff;
          padding: 26px;
          transition: .2s;
        }

        .aic-landing-wrapper .fcard:hover {
          border-color: var(--ink);
          transform: translateY(-3px);
          box-shadow: 0 12px 28px -12px rgba(0,0,0,.12);
        }

        .aic-landing-wrapper .fcard .fic {
          width: 38px;
          height: 38px;
          border: 1px solid var(--border);
          border-radius: 9px;
          display: grid;
          place-items: center;
          font-size: 16px;
          margin-bottom: 18px;
          background: var(--paper);
        }

        .aic-landing-wrapper .fcard h3 {
          font-family: var(--display);
          font-size: 16px;
          letter-spacing: -.01em;
          margin-bottom: 8px;
        }

        .aic-landing-wrapper .fcard p {
          font-size: 13.5px;
          color: var(--muted);
        }

        .aic-landing-wrapper .fcard .tag {
          display: inline-block;
          margin-top: 14px;
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: var(--faint);
          border: 1px solid var(--border);
          border-radius: 5px;
          padding: 3px 8px;
        }

        /* ledger section */
        .aic-landing-wrapper .split {
          display: grid;
          grid-template-columns: 1fr 1.15fr;
          gap: 56px;
          align-items: center;
        }

        @media(max-width:900px){
          .aic-landing-wrapper .split {
            grid-template-columns: 1fr;
            gap: 36px;
          }
        }

        .aic-landing-wrapper .split h2 {
          font-family: var(--display);
          font-size: clamp(26px, 3.5vw, 36px);
          letter-spacing: -.02em;
          line-height: 1.15;
          margin: 12px 0 16px;
        }

        .aic-landing-wrapper .split p {
          color: var(--muted);
          font-size: 15px;
          margin-bottom: 22px;
        }

        .aic-landing-wrapper .checklist {
          list-style: none;
          display: grid;
          gap: 12px;
          font-size: 14px;
        }

        .aic-landing-wrapper .checklist li {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }

        .aic-landing-wrapper .checklist .tick {
          font-family: var(--mono);
          color: var(--green);
          font-weight: 600;
        }

        .aic-landing-wrapper .ledger {
          border: 1px solid var(--border);
          border-radius: 12px;
          background: #fff;
          overflow: hidden;
          box-shadow: 0 16px 40px -18px rgba(0,0,0,.12);
        }

        .aic-landing-wrapper .ledger .lh {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          border-bottom: 1px solid var(--border);
        }

        .aic-landing-wrapper .ledger .lh b {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .aic-landing-wrapper .ledger .lh a {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: .08em;
          color: var(--ink);
          text-transform: uppercase;
          cursor: pointer;
        }

        .aic-landing-wrapper .ltable {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
        }

        .aic-landing-wrapper .ltable th {
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: var(--faint);
          text-align: left;
          padding: 10px 18px;
          border-bottom: 1px solid var(--border);
        }

        .aic-landing-wrapper .ltable td {
          padding: 12px 18px;
          border-bottom: 1px solid var(--border);
        }

        .aic-landing-wrapper .ltable tr:last-child td {
          border-bottom: none;
        }

        .aic-landing-wrapper .ltable .amt {
          font-family: var(--mono);
          text-align: right;
          font-weight: 500;
        }

        .aic-landing-wrapper .pill {
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: .1em;
          text-transform: uppercase;
          padding: 3px 9px;
          border-radius: 5px;
        }

        .aic-landing-wrapper .pill.pending {
          background: #fef3c7;
          color: var(--amber);
        }

        .aic-landing-wrapper .pill.draft {
          background: #f4f4f5;
          color: var(--muted);
        }

        .aic-landing-wrapper .pill.posted {
          background: #dcfce7;
          color: var(--green);
        }

        .aic-landing-wrapper .ltable .desc {
          font-weight: 500;
        }

        .aic-landing-wrapper .ltable .dtt {
          font-family: var(--mono);
          color: var(--faint);
          font-size: 11px;
        }

        .aic-landing-wrapper .ltable .typ {
          font-family: var(--mono);
          font-size: 10px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: .06em;
        }

        /* OCR band */
        .aic-landing-wrapper .ocr {
          background: var(--ink);
          color: #fff;
          border-radius: 16px;
          padding: 64px 56px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: center;
        }

        @media(max-width:900px){
          .aic-landing-wrapper .ocr {
            grid-template-columns: 1fr;
            padding: 44px 28px;
          }
        }

        .aic-landing-wrapper .ocr .eyebrow {
          color: #8b8b93;
        }

        .aic-landing-wrapper .ocr h2 {
          font-family: var(--display);
          font-size: clamp(26px, 3.5vw, 36px);
          letter-spacing: -.02em;
          line-height: 1.15;
          margin: 12px 0 16px;
        }

        .aic-landing-wrapper .ocr p {
          color: #a1a1aa;
          font-size: 15px;
          margin-bottom: 26px;
        }

        .aic-landing-wrapper .scan-demo {
          background: #161618;
          border: 1px solid #2a2a2e;
          border-radius: 12px;
          padding: 20px;
          font-family: var(--mono);
          font-size: 12px;
        }

        .aic-landing-wrapper .scan-demo .row {
          display: flex;
          justify-content: space-between;
          padding: 9px 4px;
          border-bottom: 1px dashed #2a2a2e;
          color: #c8c8cd;
        }

        .aic-landing-wrapper .scan-demo .row:last-child {
          border: none;
        }

        .aic-landing-wrapper .scan-demo .lbl {
          color: #71717a;
          font-size: 10px;
          letter-spacing: .1em;
          text-transform: uppercase;
        }

        .aic-landing-wrapper .scan-demo .ok {
          color: #4ade80;
        }

        .aic-landing-wrapper .scan-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .aic-landing-wrapper .scan-head .t {
          font-size: 10px;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: #71717a;
        }

        /* pricing section */
        .aic-landing-wrapper .pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          max-width: 1040px;
          margin: 0 auto;
        }

        @media(max-width:900px){
          .aic-landing-wrapper .pricing-grid {
            grid-template-columns: 1fr;
            max-width: 440px;
          }
        }

        .aic-landing-wrapper .pcard {
          border: 1px solid var(--border);
          border-radius: var(--radius);
          background: #fff;
          padding: 32px 26px;
          display: flex;
          flex-direction: column;
          position: relative;
          transition: .2s;
        }

        .aic-landing-wrapper .pcard:hover {
          border-color: var(--ink);
          box-shadow: 0 12px 28px -12px rgba(0,0,0,.12);
        }

        .aic-landing-wrapper .pcard.featured {
          border-color: var(--ink);
          box-shadow: 0 16px 40px -16px rgba(0,0,0,.16);
          transform: translateY(-4px);
        }

        .aic-landing-wrapper .pcard .pop {
          position: absolute;
          top: -11px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--ink);
          color: #fff;
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: .12em;
          text-transform: uppercase;
          padding: 3px 10px;
          border-radius: 999px;
          white-space: nowrap;
        }

        .aic-landing-wrapper .pcard .pname {
          font-family: var(--display);
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -.01em;
          margin-bottom: 6px;
        }

        .aic-landing-wrapper .pcard .price {
          font-family: var(--mono);
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -.02em;
          margin-bottom: 8px;
        }

        .aic-landing-wrapper .pcard .price small {
          font-size: 13px;
          font-weight: 400;
          color: var(--muted);
          letter-spacing: normal;
        }

        .aic-landing-wrapper .pcard .pdesc {
          font-size: 13px;
          color: var(--muted);
          margin-bottom: 22px;
          min-height: 38px;
        }

        .aic-landing-wrapper .pcard ul {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 11px;
          font-size: 13px;
          margin-bottom: 28px;
          flex: 1;
        }

        .aic-landing-wrapper .pcard ul li {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .aic-landing-wrapper .pcard ul .tick {
          font-family: var(--mono);
          color: var(--green);
          font-weight: 600;
        }

        .aic-landing-wrapper .pcard .btn {
          justify-content: center;
          text-align: center;
          width: 100%;
        }

        /* CTA */
        .aic-landing-wrapper .final {
          background: #fff;
          border-top: 1px solid var(--border);
          text-align: center;
        }

        .aic-landing-wrapper .final h2 {
          font-family: var(--display);
          font-size: clamp(30px, 5vw, 48px);
          letter-spacing: -.03em;
          line-height: 1.08;
          max-width: 700px;
          margin: 14px auto 20px;
        }

        .aic-landing-wrapper .final p {
          color: var(--muted);
          margin-bottom: 34px;
        }

        /* footer */
        .aic-landing-wrapper footer {
          border-top: 1px solid var(--border);
          background: var(--paper);
          padding: 56px 0 32px;
        }

        .aic-landing-wrapper .foot-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 32px;
          margin-bottom: 44px;
        }

        @media(max-width:800px){
          .aic-landing-wrapper .foot-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        .aic-landing-wrapper .foot-grid h4 {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: var(--faint);
          margin-bottom: 14px;
        }

        .aic-landing-wrapper .foot-grid a {
          display: block;
          font-size: 13px;
          color: var(--muted);
          padding: 4px 0;
          cursor: pointer;
        }

        .aic-landing-wrapper .foot-grid a:hover {
          color: var(--ink);
        }

        .aic-landing-wrapper .foot-bottom {
          border-top: 1px solid var(--border);
          padding-top: 24px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          font-family: var(--mono);
          font-size: 11px;
          color: var(--faint);
        }

        /* mobile menu */
        .aic-landing-wrapper .mnav {
          display: none;
          flex-direction: column;
          gap: 4px;
          padding: 12px 24px 20px;
          border-top: 1px solid var(--border);
          background: #fff;
        }

        .aic-landing-wrapper .mnav a {
          padding: 10px 4px;
          font-size: 15px;
          border-bottom: 1px solid var(--border);
          cursor: pointer;
        }

        .aic-landing-wrapper .mnav.open {
          display: flex;
        }

        @media(max-width:820px){
          .aic-landing-wrapper .nav-links {
            display: none;
          }
          .aic-landing-wrapper .nav-cta .btn-ghost {
            display: none;
          }
          .aic-landing-wrapper .hamburger {
            display: block;
          }
        }
      `}</style>

      {/* ================= NAV ================= */}
      <nav>
        <div className="wrap nav-inner">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="logo"
            id="landing-logo-btn"
          >
            <img src="/logo.png" alt="AICounts Logo" className="h-8 w-auto object-contain" />
          </button>

          <div className="nav-links">
            <a href="#features" onClick={(e) => handleAnchorClick(e, 'features')}>
              Features
            </a>
            <a href="#ledger" onClick={(e) => handleAnchorClick(e, 'ledger')}>
              Ledger
            </a>
            <a href="#ocr" onClick={(e) => handleAnchorClick(e, 'ocr')}>
              OCR
            </a>
            <a href="#pricing" onClick={(e) => handleAnchorClick(e, 'pricing')}>
              Pricing
            </a>
          </div>

          <div className="nav-cta">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="btn btn-ghost"
              id="landing-signin-btn"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="btn btn-dark"
              id="landing-startfree-btn"
            >
              Start free
            </button>
            <button
              type="button"
              className="hamburger"
              aria-label="Toggle Navigation Menu"
              onClick={() => setMobileNavOpen((prev) => !prev)}
            >
              ☰
            </button>
          </div>
        </div>

        <div className={`mnav ${mobileNavOpen ? 'open' : ''}`}>
          <a href="#features" onClick={(e) => handleAnchorClick(e, 'features')}>
            Features
          </a>
          <a href="#ledger" onClick={(e) => handleAnchorClick(e, 'ledger')}>
            Ledger
          </a>
          <a href="#ocr" onClick={(e) => handleAnchorClick(e, 'ocr')}>
            OCR
          </a>
          <a href="#pricing" onClick={(e) => handleAnchorClick(e, 'pricing')}>
            Pricing
          </a>
          <button
            type="button"
            onClick={() => {
              setMobileNavOpen(false);
              navigate('/login');
            }}
            className="btn btn-ghost mt-2 w-full justify-center"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileNavOpen(false);
              navigate('/signup');
            }}
            className="btn btn-dark mt-2 w-full justify-center"
          >
            Start free
          </button>
        </div>
      </nav>

      {/* ================= HERO ================= */}
      <header className="hero">
        <div className="wrap">
          <div className="hero-badge">
            <span className="dot"></span> Built for Indian businesses · GST-ready
          </div>
          <h1>
            Accounting that thinks<br />
            <span className="thin">in your currency.</span>
          </h1>
          <p className="sub">
            Invoices, expenses, GST filing and AI-powered insights — one clean ledger for your
            entire business. No spreadsheets. No chaos.
          </p>
          <div className="hero-actions">
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="btn btn-dark"
              id="hero-create-ledger-btn"
            >
              ＋ Create your ledger
            </button>
            <a
              href="#preview"
              onClick={(e) => handleAnchorClick(e, 'preview')}
              className="btn btn-ghost"
              id="hero-see-dashboard-btn"
            >
              See the dashboard
            </a>
          </div>
          <div className="hero-note">Free forever plan · No credit card required</div>

          {/* ===== DASHBOARD PREVIEW ===== */}
          <div className="preview" id="preview">
            <div className="preview-bar">
              <span className="chip"></span>
              <span className="chip"></span>
              <span className="chip"></span>
              <span className="url">app.aicounts.in / giga-nexus-technology / overview</span>
            </div>
            <div className="preview-body">
              <aside className="pv-side">
                <div className="label">Workspace</div>
                <div className="item active">
                  <span className="ic">▦</span> Dashboard
                </div>
                <div className="item">
                  <span className="ic">⇄</span> Transactions
                </div>
                <div className="item">
                  <span className="ic">▤</span> Sales
                </div>
                <div className="item">
                  <span className="ic">▣</span> Purchases
                </div>
                <div className="item">
                  <span className="ic">▢</span> Expenses
                </div>
                <div className="item">
                  <span className="ic">▥</span> Banking
                </div>
                <div className="label">Compliance</div>
                <div className="item">
                  <span className="ic">◎</span> GST — India
                </div>
                <div className="item">
                  <span className="ic">◫</span> Reports
                </div>
                <div className="label">Intelligence</div>
                <div className="item">
                  <span className="ic">✦</span> AI Insights
                </div>
                <div className="item">
                  <span className="ic">⌕</span> Review Queue
                </div>
              </aside>
              <div className="pv-main">
                <div className="pv-toprow">
                  <div>
                    <h3>Overview</h3>
                    <div className="date">Tuesday, 22 Sept 2026 · FY 2026–27</div>
                  </div>
                  <div className="pv-btnrow">
                    <button
                      type="button"
                      onClick={() => navigate('/signup')}
                      className="pv-btn primary"
                    >
                      ＋ Generate Invoice
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/signup')}
                      className="pv-btn"
                    >
                      Create Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/signup')}
                      className="pv-btn"
                    >
                      ⌗ Scan Bill (OCR)
                    </button>
                  </div>
                </div>
                <div className="kpis">
                  <div className="kpi">
                    <div className="t">Total Revenue (YTD)</div>
                    <div className="v">₹23,57,930.28</div>
                    <div className="s">↳ 4 invoices issued</div>
                  </div>
                  <div className="kpi">
                    <div className="t">Operating Expenses</div>
                    <div className="v">₹22,999.99</div>
                    <div className="s">Rent leads at ₹14,999.99</div>
                  </div>
                  <div className="kpi">
                    <div className="t">Accounts Receivable</div>
                    <div className="v">₹0</div>
                    <div className="s">0 invoices pending</div>
                  </div>
                  <div className="kpi">
                    <div className="t">Net Position</div>
                    <div className="v green">₹23,34,930.29</div>
                    <div className="s">3 active customers</div>
                  </div>
                </div>
                <div className="pv-grid">
                  <div className="panel">
                    <div className="ph">↘ Operating Cash Trend</div>
                    <div className="ps">Invoiced revenue vs recorded expenses</div>
                    <svg viewBox="0 0 600 190" width="100%" height="150" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0a0a0a" stopOpacity="0.22" />
                          <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <line x1="0" y1="45" x2="600" y2="45" stroke="#eee" strokeWidth="1" />
                      <line x1="0" y1="95" x2="600" y2="95" stroke="#eee" strokeWidth="1" />
                      <line x1="0" y1="145" x2="600" y2="145" stroke="#eee" strokeWidth="1" />
                      <path
                        d="M0,18 C120,60 200,110 320,142 C430,168 540,176 600,178 L600,190 L0,190 Z"
                        fill="url(#fill)"
                      />
                      <path
                        d="M0,18 C120,60 200,110 320,142 C430,168 540,176 600,178"
                        fill="none"
                        stroke="#0a0a0a"
                        strokeWidth="2"
                      />
                    </svg>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontFamily: 'var(--mono)',
                        fontSize: '9px',
                        color: 'var(--faint)',
                      }}
                    >
                      <span>Jul 26</span>
                      <span>Aug 26</span>
                      <span>Sept 26</span>
                    </div>
                  </div>
                  <div className="panel">
                    <div className="ph">◌ Expense Breakdown</div>
                    <div className="ps">By category · 2026–27</div>
                    <div className="donut-wrap">
                      <div className="donut">
                        <div className="center">
                          <div className="l">TOTAL</div>
                          <div className="v">₹22,999</div>
                        </div>
                      </div>
                      <div className="legend">
                        <div className="row">
                          <span>
                            <span className="sw" style={{ background: '#0a0a0a' }}></span>
                            Rent &amp; Facilities
                          </span>
                          <span className="mono">₹14,999.99</span>
                        </div>
                        <div className="row">
                          <span>
                            <span className="sw" style={{ background: '#b9bcc4' }}></span>
                            Internet &amp; Software
                          </span>
                          <span className="mono">₹8,000</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ================= STATS ================= */}
      <div className="stats">
        <div className="wrap stats-grid">
          <div className="stat">
            <div className="n" data-count="12000">
              0
            </div>
            <div className="d">Businesses onboard</div>
          </div>
          <div className="stat">
            <div className="n" data-count="48" data-suffix="L+">
              0
            </div>
            <div className="d">Invoices filed</div>
          </div>
          <div className="stat">
            <div className="n" data-count="99.9" data-suffix="%" data-decimal="1">
              0
            </div>
            <div className="d">Uptime SLA</div>
          </div>
          <div className="stat">
            <div className="n" data-count="6" data-suffix="hrs">
              0
            </div>
            <div className="d">Avg. GST close time</div>
          </div>
        </div>
      </div>

      {/* ================= FEATURES ================= */}
      <section id="features">
        <div className="wrap">
          <div className="sec-head center" style={{ textAlign: 'center' }}>
            <div className="eyebrow">// Workspace</div>
            <h2>Everything your accountant wishes you had.</h2>
            <p>One workspace for money in, money out, and everything the taxman needs.</p>
          </div>
          <div className="features-grid">
            <div className="fcard">
              <div className="fic">▤</div>
              <h3>Invoicing</h3>
              <p>
                Generate GST-compliant invoices in seconds. Auto-numbered, branded, and tracked from
                draft to paid.
              </p>
              <span className="tag">Draft → Issued → Paid</span>
            </div>
            <div className="fcard">
              <div className="fic">▢</div>
              <h3>Expense Tracking</h3>
              <p>
                Record rent, software, and utilities with approval workflows. Every rupee
                categorised automatically.
              </p>
              <span className="tag">Submit → Approve → Post</span>
            </div>
            <div className="fcard">
              <div className="fic">⌗</div>
              <h3>Bill Scanning (OCR)</h3>
              <p>
                Snap a photo of any bill. Our OCR extracts vendor, amount, GSTIN and dates — ready
                for your review queue.
              </p>
              <span className="tag">Scan → Extract → Verify</span>
            </div>
            <div className="fcard">
              <div className="fic">◎</div>
              <h3>GST Compliance</h3>
              <p>
                GSTR-1 and 3B summaries built from your real ledger. India-first, built for FY
                formats.
              </p>
              <span className="tag">India</span>
            </div>
            <div className="fcard">
              <div className="fic">✦</div>
              <h3>AI Insights</h3>
              <p>
                Cash-flow forecasts, anomaly detection, and plain-English answers about your
                numbers.
              </p>
              <span className="tag">Forecast</span>
            </div>
            <div className="fcard">
              <div className="fic">▥</div>
              <h3>Banking &amp; Reconciliation</h3>
              <p>
                Match bank statements to your ledger with one click. Know your true net position,
                always.
              </p>
              <span className="tag">Reconcile</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= LEDGER ================= */}
      <section
        id="ledger"
        style={{
          background: '#fff',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="wrap split">
          <div>
            <div className="eyebrow">// Single Source of Truth</div>
            <h2>
              Every transaction.<br />
              One immutable ledger.
            </h2>
            <p>
              Invoices, expenses, and journal entries land in one timeline. Search it, filter it,
              export it — your CA will thank you.
            </p>
            <ul className="checklist">
              <li>
                <span className="tick">✓</span> Real-time double-entry accounting under the hood
              </li>
              <li>
                <span className="tick">✓</span> Draft → approval → posted workflow with audit
                trail
              </li>
              <li>
                <span className="tick">✓</span> Full-text search across every record, every year
              </li>
              <li>
                <span className="tick">✓</span> Export to Tally / Excel / CSV anytime
              </li>
            </ul>
          </div>
          <div className="ledger">
            <div className="lh">
              <b>Recent Ledger Activity</b>
              <a onClick={() => navigate('/signup')}>View Full Ledger →</a>
            </div>
            <table className="ltable">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="dtt">21 Sept 26</td>
                  <td className="desc">Monthly Wifi Charges</td>
                  <td className="typ">Expense</td>
                  <td className="amt">₹8,000</td>
                  <td>
                    <span className="pill pending">Pending</span>
                  </td>
                </tr>
                <tr>
                  <td className="dtt">21 Sept 26</td>
                  <td className="desc">Rent &amp; Facility Cost</td>
                  <td className="typ">Expense</td>
                  <td className="amt">₹14,999.99</td>
                  <td>
                    <span className="pill pending">Pending</span>
                  </td>
                </tr>
                <tr>
                  <td className="dtt">27 Aug 26</td>
                  <td className="desc">Invoice — RC Media</td>
                  <td className="typ">Invoice</td>
                  <td className="amt">₹1,07,144</td>
                  <td>
                    <span className="pill draft">Draft</span>
                  </td>
                </tr>
                <tr>
                  <td className="dtt">27 Aug 26</td>
                  <td className="desc">Invoice — Tata Motors Ltd</td>
                  <td className="typ">Invoice</td>
                  <td className="amt">₹1,07,144</td>
                  <td>
                    <span className="pill draft">Draft</span>
                  </td>
                </tr>
                <tr>
                  <td className="dtt">14 Aug 26</td>
                  <td className="desc">Invoice — Nova Labs</td>
                  <td className="typ">Invoice</td>
                  <td className="amt">₹84,000</td>
                  <td>
                    <span className="pill posted">Posted</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ================= OCR ================= */}
      <section id="ocr">
        <div className="wrap">
          <div className="ocr">
            <div>
              <div className="eyebrow">// Document OCR</div>
              <h2>
                Snap a bill.<br />
                Get a ledger entry.
              </h2>
              <p>
                Forward a PDF or photograph a paper bill. AICounts reads it, extracts the key
                fields, and queues it for your approval — GSTIN, HSN, line items and all.
              </p>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="btn"
                style={{ background: '#fff', color: '#0a0a0a', borderColor: '#fff' }}
              >
                Try OCR free
              </button>
            </div>
            <div className="scan-demo">
              <div className="scan-head">
                <span className="t">Scan Result</span>
                <span className="ok">✓ 99.2% confidence</span>
              </div>
              <div className="row">
                <span className="lbl">Vendor</span>
                <span>Broadband Networks Pvt Ltd</span>
              </div>
              <div className="row">
                <span className="lbl">GSTIN</span>
                <span>27AAACB1234F1Z5</span>
              </div>
              <div className="row">
                <span className="lbl">Invoice No.</span>
                <span>BB/2026/09/4471</span>
              </div>
              <div className="row">
                <span className="lbl">Amount</span>
                <span>₹8,000.00</span>
              </div>
              <div className="row">
                <span className="lbl">GST Split</span>
                <span>CGST ₹720 · SGST ₹720</span>
              </div>
              <div className="row">
                <span className="lbl">Suggested Entry</span>
                <span className="ok">Internet &amp; Software</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= PRICING ================= */}
      {/* <section id="pricing" style={{ background: '#fff', borderTop: '1px solid var(--border)' }}>
        <div className="wrap">
          <div className="sec-head center" style={{ textAlign: 'center' }}>
            <div className="eyebrow">// Pricing</div>
            <h2>Simple pricing. In rupees.</h2>
            <p>Start free. Upgrade when your ledger grows.</p>
          </div>
          <div className="pricing-grid">
            <div className="pcard">
              <div className="pname">Starter</div>
              <div className="price">
                ₹0<small> /forever</small>
              </div>
              <div className="pdesc">For freelancers and side projects getting organised.</div>
              <ul>
                <li>
                  <span className="tick">✓</span> 20 invoices / month
                </li>
                <li>
                  <span className="tick">✓</span> Expense tracking
                </li>
                <li>
                  <span className="tick">✓</span> 1 workspace
                </li>
                <li>
                  <span className="tick">✓</span> Basic reports
                </li>
              </ul>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="btn btn-ghost"
              >
                Start free
              </button>
            </div>
            <div className="pcard featured">
              <div className="pop">Most Popular</div>
              <div className="pname">Growth</div>
              <div className="price">
                ₹999<small> /month</small>
              </div>
              <div className="pdesc">For small businesses that invoice and file GST regularly.</div>
              <ul>
                <li>
                  <span className="tick">✓</span> Unlimited invoices &amp; expenses
                </li>
                <li>
                  <span className="tick">✓</span> Bill OCR scanning
                </li>
                <li>
                  <span className="tick">✓</span> GST summaries (GSTR-1 / 3B)
                </li>
                <li>
                  <span className="tick">✓</span> AI insights &amp; forecasts
                </li>
                <li>
                  <span className="tick">✓</span> 3 users included
                </li>
              </ul>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="btn btn-dark"
              >
                Start 14-day trial
              </button>
            </div>
            <div className="pcard">
              <div className="pname">Scale</div>
              <div className="price">
                ₹2,499<small> /month</small>
              </div>
              <div className="pdesc">For teams with multi-entity books and accountants.</div>
              <ul>
                <li>
                  <span className="tick">✓</span> Everything in Growth
                </li>
                <li>
                  <span className="tick">✓</span> Multi-tenant workspaces
                </li>
                <li>
                  <span className="tick">✓</span> Approval workflows &amp; roles
                </li>
                <li>
                  <span className="tick">✓</span> Tally / API integrations
                </li>
                <li>
                  <span className="tick">✓</span> Priority support
                </li>
              </ul>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="btn btn-ghost"
              >
                Talk to us
              </button>
            </div>
          </div>
        </div>
      </section> */}

      {/* ================= FINAL CTA ================= */}
      <section className="final">
        <div className="wrap">
          <div className="eyebrow">// Get Started</div>
          <h2>
            Your books, balanced<br />
            before your chai gets cold.
          </h2>
          <p>Set up your workspace in under 3 minutes. First invoice on us.</p>
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="btn btn-dark"
            style={{ padding: '15px 32px', fontSize: '13px' }}
          >
            ＋ Create your free ledger
          </button>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <div className="logo" style={{ marginBottom: '14px' }}>
                <img src="/logo.png" alt="AICounts Logo" className="h-8 w-auto object-contain" />
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted)', maxWidth: '260px' }}>
                Modern accounting software for Indian businesses. Built in India, for India.
              </p>
            </div>
            <div>
              <h4>Product</h4>
              <a href="#features" onClick={(e) => handleAnchorClick(e, 'features')}>
                Features
              </a>
              <a href="#ledger" onClick={(e) => handleAnchorClick(e, 'ledger')}>
                Ledger
              </a>
              <a href="#ocr" onClick={(e) => handleAnchorClick(e, 'ocr')}>
                Bill OCR
              </a>
              <a href="#pricing" onClick={(e) => handleAnchorClick(e, 'pricing')}>
                Pricing
              </a>
            </div>
            <div>
              <h4>Compliance</h4>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/signup'); }}>GST — India</a>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/signup'); }}>Reports</a>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/signup'); }}>e-Invoicing</a>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/signup'); }}>TDS</a>
            </div>
            <div>
              <h4>Company</h4>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Sign In</a>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/signup'); }}>Get Started</a>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/forgot-password'); }}>Reset Password</a>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© 2026 AICounts Pvt Ltd</span>
            <span>Made in India · ₹ · FY 2026–27</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
