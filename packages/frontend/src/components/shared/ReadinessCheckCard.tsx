import type { CampusReadiness } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface ReadinessCheckCardProps {
  readiness: CampusReadiness | null;
  isLoading?: boolean;
}

export function ReadinessCheckCard({ readiness, isLoading }: ReadinessCheckCardProps) {
  if (isLoading) {
    return (
      <Card>
        <div className="h-24 animate-pulse rounded bg-gray-100" />
      </Card>
    );
  }

  if (!readiness) return null;

  const { isReady, missingCampusRoles, deptsWithoutHead } = readiness;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-text-primary">Campus readiness</h3>
          <p className="mt-1 text-xs text-text-secondary">
            {isReady ? 'Campus meets activation requirements' : 'Fix issues below before activating'}
          </p>
        </div>
        <Badge variant={isReady ? 'approved' : 'warning'}>{isReady ? 'Ready' : 'Not ready'}</Badge>
      </div>
      {!isReady && (
        <ul className="mt-3 space-y-1 text-sm text-text-secondary">
          {missingCampusRoles.length > 0 && (
            <li>
              <span className="font-medium text-text-primary">Missing roles:</span> {missingCampusRoles.join(', ')}
            </li>
          )}
          {deptsWithoutHead.length > 0 && (
            <li>
              <span className="font-medium text-text-primary">Departments without head:</span> {deptsWithoutHead.join(', ')}
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}
