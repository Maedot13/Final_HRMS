import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { saveAs } from 'file-saver';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { payrollApi, type PayrollReportRecord, type PayrollTransfer } from '../api/payroll';

const MONTHS = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];


export default function FinancePage({ defaultTab = 'reports' }: { defaultTab?: 'reports' | 'transfers' }) {
    const [downloading, setDownloading] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'reports' | 'transfers'>(defaultTab);

    useEffect(() => {
        setActiveTab(defaultTab);
    }, [defaultTab]);

    const { data: reports = [], isLoading: reportsLoading, refetch: refetchReports } = useQuery<PayrollReportRecord[]>({
        queryKey: ['payrollReports'],
        queryFn: async () => {
            const res = await payrollApi.listReports();
            return Array.isArray(res.data) ? res.data : [];
        },
    });

    const { data: transfers = [], isLoading: transfersLoading, refetch: refetchTransfers } = useQuery<PayrollTransfer[]>({
        queryKey: ['payrollTransfers'],
        queryFn: async () => {
            const res = await payrollApi.listTransfers();
            return Array.isArray(res.data) ? res.data : [];
        },
    });

    const handleDownload = async (report: PayrollReportRecord) => {
        setError(null);
        setDownloading(report.id);
        try {
            const res = await payrollApi.downloadReport(report.id);
            saveAs(res.data, report.filename);
        } catch {
            setError('Failed to download the report. The file may no longer be available.');
        } finally {
            setDownloading(null);
        }
    };

    const isLoading = reportsLoading || transfersLoading;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Finance Dashboard</h1>
                    <p className="text-sm text-text-secondary">Monitor payroll reports and employee status changes.</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => { refetchReports(); refetchTransfers(); }}
                    leftIcon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>}
                >
                    Refresh Data
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'reports' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >
                    Payroll Reports
                </button>
                <button
                    onClick={() => setActiveTab('transfers')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'transfers' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >
                    Leave Salary Data
                    {transfers.length > 0 && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{transfers.length}</span>}
                </button>
            </div>

            {error && (
                <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
            )}

            {activeTab === 'reports' ? (
                /* Reports list */
                isLoading ? (
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
                                        <p className="text-sm font-bold text-text-primary truncate">{report.filename}</p>
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
                )
            ) : (
                /* Transfers list */
                isLoading ? (
                    <Card><div className="flex items-center justify-center py-16 text-text-secondary text-sm">Loading status updates…</div></Card>
                ) : transfers.length === 0 ? (
                    <Card>
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                            </div>
                            <p className="text-sm font-medium text-text-primary">No leave salary data yet</p>
                        </div>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {transfers.map((transfer) => (
                            <Card key={transfer.id} padding="sm" className="hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${transfer.leave ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {transfer.leave ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" /></svg>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-text-primary">{transfer.employee.name} <span className="ml-1 text-[11px] font-normal text-text-secondary">({transfer.employee.employeeId})</span></p>
                                            <p className="text-xs text-text-secondary">{transfer.reason} • {format(new Date(transfer.createdAt || transfer.effectiveDate || Date.now()), 'dd MMM yyyy')}</p>
                                            {transfer.salaryInfo && <p className="mt-0.5 text-[10px] font-medium text-primary bg-primary/5 rounded px-1.5 py-0.5 inline-block">{transfer.salaryInfo}</p>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${transfer.status === 'PENDING' ? 'bg-warning/10 text-warning' : 'bg-green-100 text-green-700'}`}>
                                            {transfer.status}
                                        </span>
                                        <p className="mt-1 text-[10px] text-text-secondary">{transfer.employee.campus.name}</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}
