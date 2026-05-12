import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const Dashboard = lazy(() => import('../features/dashboard/components/Dashboard').then(m => ({ default: m.Dashboard })));
const MisTicketsPage = lazy(() => import('../features/tickets/components/MisTicketsPage').then(m => ({ default: m.MisTicketsPage })));
const ParchesPage = lazy(() => import('../features/patches/components/ParchesPage').then(m => ({ default: m.ParchesPage })));
const DispositivosPage = lazy(() => import('../features/devices/components/DispositivosPage').then(m => ({ default: m.DispositivosPage })));
const IaAsistentePage = lazy(() => import('../features/ai/components/IaAsistentePage').then(m => ({ default: m.IaAsistentePage })));
const ReportesPage = lazy(() => import('../features/reports/components/ReportesPage').then(m => ({ default: m.ReportesPage })));

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#060b14', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#1e3a5f', letterSpacing: 2 }}>
      HELPDEX
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/mis-tickets" element={<MisTicketsPage />} />
          <Route path="/parches" element={<ParchesPage />} />
          <Route path="/dispositivos" element={<DispositivosPage />} />
          <Route path="/reportes" element={<ReportesPage />} />
          <Route path="/ia-asistente" element={<IaAsistentePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
