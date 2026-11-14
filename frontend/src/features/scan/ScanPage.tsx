import { ScanWizard } from './ScanWizard';

// Route /scan. The nine-step workflow runs inside one container (Spec, Section 6, T-015).
export function ScanPage() {
  return <ScanWizard />;
}
