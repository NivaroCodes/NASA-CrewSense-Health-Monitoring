import { useParams } from 'react-router-dom';
import { PlaceholderPanel } from '../../components/ui/EmptyState';

// Indicator detail (Spec, Section 7). Built in T-023.
export function IndicatorDetailPage() {
  const { id } = useParams();
  return <PlaceholderPanel title={`Indicator: ${id ?? 'unknown'}`} note="Detail view not yet implemented." />;
}
