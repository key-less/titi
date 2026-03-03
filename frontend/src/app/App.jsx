import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from '../features/dashboard/components/Dashboard';
import { MisTicketsPage } from '../features/tickets/components/MisTicketsPage';
import { ParchesPage } from '../features/patches/components/ParchesPage';
import { DispositivosPage } from '../features/devices/components/DispositivosPage';
import { IaAsistentePage } from '../features/ai/components/IaAsistentePage';
import { ReportesPage } from '../features/reports/components/ReportesPage';

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
