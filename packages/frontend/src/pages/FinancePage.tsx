import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { saveAs } from 'file-saver';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { payrollApi, type PayrollReport } from '../api/payroll';

const MONTHS = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

export default function FinancePage() {
    const [downloading, setDownloading] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { data: reports = [], isLoading, refetch: refetchReports } = useQuery<PayrollReport[]>({
        queryKey: ['payrollReports'],
        queryFn: async () => {
            const res = await payrollApi.listReports();
            return Array.isArray(res.data) ? res.data : [];
        },
    });

    const handleDownload = async (report: PayrollReport) => {
        setError(null);
        setDownloading(report.id);
        try {
            const res = await payrollApi.downloadReport(report.id);
            // using reportUrl or fallback to default name
            saveAs(res.data, report.reportUrl || `Payroll_Report_${MONTHS[report.month]}_${report.year}.xlsx`);
        } catch {
            setError('Failed to download the report. The file may no longer be available.');
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Finance Dashboard</h1>
                    <p className="text-sm text-text-secondary">Monitor payroll reports and employee status changes.</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => { refetchReports(); }}
                    leftIcon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>}
                >
                    Refresh Data
                </Button>
            </div>

            {error && (
                <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
            )}

            {/* Reports list */}
            {isLoading ? (
                <Card><div className="flex items-center justify-center py-16 text-text-secondary text-sm">Loading reports…</div></Card>
            ) : reports.length === 0 ? (
                <Card>
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <p className="text-sm font-medium text-text-primary">No payroll reports yet</p>
                    </div>
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {reports.map((report) => (
                        <Card key={report.id} padding="sm" className="flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{MONTHS[report.month]} {report.year}</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-text-primary truncate">{report.reportUrl || `Payroll_Report_${MONTHS[report.month]}_${report.year}.xlsx`}</p>
                                    <p className="text-[11px] text-text-secondary">Sent {format(new Date(report.createdAt), 'dd MMM yyyy, HH:mm')}</p>
                                </div>
                            </div>
                            <Button
                                className="mt-4 w-full"
                                id={`btn-download-report-${report.id}`}
                                variant="secondary"
                                size="sm"
                                isLoading={downloading === report.id}
                                onClick={() => handleDownload(report)}
                                leftIcon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>}
                            >
                                Download XLSX
                            </Button>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
