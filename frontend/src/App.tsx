import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ScanPage } from './features/scan/ScanPage';
import { IndicatorDetailPage } from './features/indicators/IndicatorDetailPage';
import { AlertsPage } from './features/alerts/AlertsPage';
import { HistoryPage } from './features/history/HistoryPage';
import { ScanDetailPage } from './features/scans/ScanDetailPage';

// Routes from the Frontend Specification, Section 4, plus a stored-scan view for history.
export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/indicators/:id" element={<IndicatorDetailPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/scans/:scanId" element={<ScanDetailPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
