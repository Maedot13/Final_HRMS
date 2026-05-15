import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { saveAs } from 'file-saver';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { payrollApi, type PayrollReportRecord } from '../api/payroll';

const MONTHS = [
    { value: '1', label: 'January' }, { value: '2', label: 'February' },
    { value: '3', label: 'March' }, { value: '4', label: 'April' },
    { value: '5', label: 'May' }, { value: '6', label: 'June' },
    { value: '7', label: 'July' }, { value: '8', label: 'August' },
    { value: '9', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

const MONTH_LABELS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

function getYearOptions() {
    const current = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => ({ value: String(current - i), label: String(current - i) }));
}


async function readBlobError(blob: Blob): Promise<string> {
    try {
        const text = await blob.text();
        const json = JSON.parse(text);
        return json?.message || json?.error || 'Unknown server error';
    } catch {
        return 'An unexpected error occurred';
    }
}

export default function PayrollPage() {
    const now = new Date();
    const [month, setMonth] = useState(String(now.getMonth() + 1));
    const [year, setYear] = useState(String(now.getFullYear()));
    const [loadingExcel, setLoadingExcel] = useState(false);
    const [loadingSend, setLoadingSend] = useState(false);
    const [loadingDocx, setLoadingDocx] = useState(false);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const params = { month: month ? Number(month) : undefined, year: year ? Number(year) : undefined };

    // Fetch sent reports list
    const { data: reports = [], isLoading: reportsLoading, refetch: refetchReports } = useQuery<PayrollReportRecord[]>({
        queryKey: ['payrollReports'],
        queryFn: async () => {
            const res = await payrollApi.listReports();
            return Array.isArray(res.data) ? res.data : [];
        },
    });

    const handleGenerateExcel = async () => {
        setError(null); setSuccess(null); setLoadingExcel(true);
        try {
            const res = await payrollApi.generateExcel(params);
            const m = params.month ?? now.getMonth() + 1;
            const y = params.year ?? now.getFullYear();
            saveAs(res.data, `Payroll_${y}_${String(m).padStart(2, '0')}.xlsx`);
            setSuccess(`✅ Download started — check your Downloads folder for Payroll_${y}_${String(m).padStart(2, '0')}.xlsx`);
        } catch (err: any) {
            const blob = err?.response?.data;
            if (blob instanceof Blob) {
                setError(await readBlobError(blob));
            } else {
                setError(err?.response?.data?.message || 'Failed to generate payroll report');
            }
        } finally { setLoadingExcel(false); }
    };

    const handleSendToFinance = async () => {
        setError(null); setSuccess(null); setLoadingSend(true);
        try {
            const res = await payrollApi.sendToFinance(params);
            setSuccess(res.data?.message || 'Payroll sent to Finance successfully.');
            refetchReports();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to send payroll to Finance');
        } finally { setLoadingSend(false); }
    };

    const handleGenerateDocx = async () => {
        setError(null); setSuccess(null); setLoadingDocx(true);
        try {
            const res = await payrollApi.generatePenaltyDocx(params);
            const m = params.month ?? now.getMonth() + 1;
            const y = params.year ?? now.getFullYear();
            saveAs(res.data, `Penalty_Report_${y}_${String(m).padStart(2, '0')}.docx`);
        } catch (err: any) {
            const blob = err?.response?.data;
            if (blob instanceof Blob) {
                setError(await readBlobError(blob));
            } else {
                setError(err?.response?.data?.message || 'Failed to generate penalty report');
            }
        } finally { setLoadingDocx(false); }
    };

    const handleDownloadReport = async (report: PayrollReportRecord) => {
        setError(null); setDownloadingId(report.id);
        try {
            const res = await payrollApi.downloadReport(report.id);
            saveAs(res.data, report.filename);
        } catch {
            setError('Failed to download report. File may be missing.');
        } finally { setDownloadingId(null); }
    };

    const monthLabel = MONTHS.find((m) => m.value === month)?.label ?? '';

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader
                    title="Payroll & Penalty Reports"
                    subtitle="Generate payroll for Finance (Excel) or penalty deduction reports (DOCX)."
                />
            </Card>

            {/* Period selector */}
            <Card>
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-text-primary">Select Period</h4>
                    <div className="flex flex-wrap gap-4">
                        <div className="w-48">
                            <Select id="payroll-month" label="Month" options={MONTHS} value={month}
                                onChange={(e) => setMonth(e.target.value)} placeholder="Month" />
                        </div>
                        <div className="w-36">
                            <Select id="payroll-year" label="Year" options={getYearOptions()} value={year}
                                onChange={(e) => setYear(e.target.value)} placeholder="Year" />
                        </div>
                    </div>
                </div>
            </Card>

            {error && <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>}
            {success && <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

            {/* Action cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Payroll Excel */}
                <Card>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-base font-semibold text-text-primary">Payroll Report</h4>
                                <p className="text-xs text-text-secondary">Excel (.xlsx) — {monthLabel} {year}</p>
                            </div>
                        </div>
                        <p className="text-xs text-text-secondary">
                            Columns: Employee ID · Full Name · Position · Gross Salary · Payable Days
                        </p>
                        <div className="flex flex-col gap-2">
                            <Button id="btn-generate-payroll" variant="secondary" isLoading={loadingExcel}
                                onClick={handleGenerateExcel} fullWidth
                                leftIcon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>}
                            >
                                Preview & Download
                            </Button>
                            <Button id="btn-send-to-finance" variant="primary" isLoading={loadingSend}
                                onClick={handleSendToFinance} fullWidth
                                leftIcon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>}
                            >
                                Send to Finance
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Penalty DOCX */}
                <Card>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-base font-semibold text-text-primary">Penalty Report</h4>
                                <p className="text-xs text-text-secondary">Word Document (.docx) — {monthLabel} {year}</p>
                            </div>
                        </div>
                        <p className="text-xs text-text-secondary">
                            Employees with salary deductions (partial months) — reason and deduction days.
                        </p>
                        <Button id="btn-generate-penalty" variant="info" isLoading={loadingDocx}
                            onClick={handleGenerateDocx} fullWidth
                            leftIcon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>}
                        >
                            Download Penalty DOCX
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Sent Reports History */}
            <Card>
                <CardHeader
                    title="Reports Sent to Finance"
                    subtitle="Payroll reports you have sent to Finance Officers."
                    action={
                        <Button variant="ghost" size="sm" onClick={() => refetchReports()}
                            leftIcon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>}
                        >Refresh</Button>
                    }
                />
            </Card>

            {reportsLoading ? (
                <div className="text-center py-6 text-sm text-text-secondary">Loading reports…</div>
            ) : reports.length === 0 ? (
                <div className="text-center py-6 text-sm text-text-secondary">No reports sent yet. Use "Send to Finance" above.</div>
            ) : (
                <div className="space-y-2">
                    {reports.map((report) => (
                        <Card key={report.id} padding="sm">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-text-primary">
                                            {MONTH_LABELS[report.month]} {report.year}
                                        </p>
                                        <p className="text-xs text-text-secondary">
                                            Sent {format(new Date(report.createdAt), 'dd MMM yyyy, HH:mm')}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    id={`btn-redownload-${report.id}`}
                                    variant="secondary" size="sm"
                                    isLoading={downloadingId === report.id}
                                    onClick={() => handleDownloadReport(report)}
                                >
                                    Download
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
