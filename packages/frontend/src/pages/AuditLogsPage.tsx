import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { DataTable, type Column } from '../components/shared/DataTable';
import { auditApi } from '../api/audit';
import { format } from 'date-fns';

export default function AuditLogsPage() {
    const page = 1;
    const limit = 20;

    const { data: logsData, isLoading } = useQuery({
        queryKey: ['auditLogs', page],
        queryFn: async () => {
            const res = await auditApi.list({ offset: (page - 1) * limit, limit });
            // Handle paginated structure if applicable
            return Array.isArray(res.data) ? res.data : (res.data?.data || []);
        },
    });
    
    // Fallback to empty array
    const logs = Array.isArray(logsData) ? logsData : [];

    const columns: Column<any>[] = [
        {
            key: 'timestamp',
            header: 'Timestamp',
            render: (r) => format(new Date(r.timestamp), 'MMM d, yyyy HH:mm:ss'),
        },
        {
            key: 'action',
            header: 'Action',
            render: (r) => <span className="font-mono text-xs font-semibold">{r.action}</span>,
        },
        {
            key: 'user',
            header: 'User ID',
            render: (r) => r.userId || 'System',
        },
        {
            key: 'entity',
            header: 'Entity',
            render: (r) => `${r.entityType} ${r.entityId ? `(#${r.entityId})` : ''}`,
        },
        {
            key: 'status',
            header: 'Status',
            render: (r) => {
                const isSuccess = r.status === 'SUCCESS';
                return <Badge variant={isSuccess ? 'approved' : 'rejected'}>{r.status}</Badge>;
            },
        },
    ];

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader
                    title="Audit Logs"
                    subtitle="Security and administrative actions tracker"
                />
            </Card>

            <DataTable
                columns={columns}
                data={logs}
                isLoading={isLoading}
                keyExtractor={(r) => String(r.id)}
                emptyMessage="No audit logs available."
            />
        </div>
    );
}
