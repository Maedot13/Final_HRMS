
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi, type PayrollDataParams } from '../api/payroll';
import { Card, Button, Select, Badge } from '../components/ui';
import { DataTable } from '../components/shared/DataTable';
import { Download, Send, FileSpreadsheet, History, Loader2 } from 'lucide-react';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

const PayrollPage: React.FC = () => {
    const queryClient = useQueryClient();
    const today = new Date();
    const [params, setParams] = useState<PayrollDataParams>({
        month: today.getMonth() + 1,
        year: today.getFullYear()
    });

    // 1. Fetch preview data
    const { data: previewData, isLoading: isPreviewLoading, refetch: refetchPreview } = useQuery({
        queryKey: ['payroll-preview', params],
        queryFn: () => payrollApi.getDataTransfer(params).then(res => res.data),
        enabled: !!params.month && !!params.year
    });

    // 2. Fetch report history
    const { data: historyData, isLoading: isHistoryLoading } = useQuery({
        queryKey: ['payroll-reports'],
        queryFn: () => payrollApi.listReports().then(res => res.data)
    });

    const summary = useMemo(() => {
        if (!previewData?.data) return { totalEmployees: 0, totalGrossSalary: 0 };
        return {
            totalEmployees: previewData.data.length,
            totalGrossSalary: previewData.data.reduce((sum: number, row: any) => sum + (Number(row.grossSalary) || 0), 0)
        };
    }, [previewData?.data]);

    const periodStatus = useMemo(() => {
        if (!params.month || !params.year) return 'OPEN';
        
        const selectedDate = new Date(params.year, params.month - 1, 1);
        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        if (selectedDate > currentMonthStart) return 'FUTURE';
        
        // Check if report exists
        const reportExists = historyData?.some((r: any) => r.month === params.month && r.year === params.year);
        if (reportExists) return 'FINALIZED';

        return 'OPEN';
    }, [params.month, params.year, historyData, today]);

    // 3. Mutation: Send to Finance
    const sendMutation = useMutation({
        mutationFn: (data: { month: number; year: number }) => payrollApi.sendToFinance(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll-reports'] });
            alert('Payroll report sent to Finance successfully!');
        },
        onError: (error: any) => {
            alert(`Failed to send report: ${error.response?.data?.message || error.message}`);
        }
    });

    const handleSendToFinance = () => {
        if (!params.month || !params.year) return;
        if (periodStatus === 'FUTURE') return;

        if (periodStatus === 'FINALIZED') {
            const confirmAmend = window.confirm("A report already exists for this period. Sending a new one will create an amended version for Finance. Are you sure?");
            if (!confirmAmend) return;
        }

        sendMutation.mutate({ month: params.month, year: params.year });
    };

    // 4. Download Handlers
    const handleDownloadExcel = async () => {
        try {
            const response = await payrollApi.generateExcel(params);
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Payroll_Preview_${params.year}_${params.month}.xlsx`);
        } catch (error) {
            console.error('Download failed', error);
        }
    };

    const handleDownloadHistory = async (reportId: number, month: number, year: number) => {
        try {
            const response = await payrollApi.downloadReport(reportId);
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Payroll_Report_${year}_${month}.xlsx`);
        } catch (error) {
            console.error('History download failed', error);
        }
    };

    const columns = [
        { key: 'employeeId', header: 'ID', render: (row: any) => row.employeeId },
        { key: 'fullName', header: 'Full Name', render: (row: any) => row.fullName },
        { key: 'department', header: 'Department', render: (row: any) => row.department },
        { 
            key: 'grossSalary',
            header: 'Gross Salary', 
            render: (row: any) => `ETB ${row.grossSalary.toLocaleString()}`
        },
        { key: 'payableDays', header: 'Payable Days', render: (row: any) => row.payableDays },
        { 
            key: 'status',
            header: 'Status', 
            render: (row: any) => (
                <Badge variant={row.status === 'ACTIVE' ? 'approved' : 'warning'}>
                    {row.status}
                </Badge>
            )
        }
    ];

    const historyColumns = [
        { 
            key: 'month',
            header: 'Period', 
            render: (row: any) => `${row.month}/${row.year}`
        },
        { 
            key: 'createdBy',
            header: 'Sent By', 
            render: (row: any) => row.createdBy?.employee?.name || 'System'
        },
        { 
            key: 'createdAt',
            header: 'Sent At', 
            render: (row: any) => format(new Date(row.createdAt), 'MMM dd, yyyy HH:mm')
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (row: any) => (
                <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleDownloadHistory(row.id, row.month, row.year)}
                >
                    <Download className="w-4 h-4 mr-1" /> Download
                </Button>
            )
        }
    ];

    const months = Array.from({ length: 12 }, (_, i) => ({ label: format(new Date(0, i), 'MMMM'), value: String(i + 1) }));
    const years = Array.from({ length: 5 }, (_, i) => ({ label: (today.getFullYear() - 2 + i).toString(), value: String(today.getFullYear() - 2 + i) }));

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
                    <p className="text-gray-500">Generate, preview and transfer payroll reports to Finance.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleDownloadExcel} disabled={!previewData || isPreviewLoading}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Preview & Download
                    </Button>
                    <Button 
                        onClick={handleSendToFinance} 
                        disabled={!previewData || isPreviewLoading || sendMutation.isPending || periodStatus === 'FUTURE'}
                    >
                        {sendMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        {periodStatus === 'FINALIZED' ? 'Amend Report' : 'Send to Finance'}
                    </Button>
                </div>
            </div>

            <Card className="p-4 bg-gray-50/50">
                <div className="flex gap-4 items-end">
                    <div className="w-48">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Month</label>
                        <Select 
                            options={months} 
                            value={params.month} 
                            onChange={(val: any) => setParams(p => ({ ...p, month: Number(val.target.value) }))} 
                        />
                    </div>
                    <div className="w-32">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Year</label>
                        <Select 
                            options={years} 
                            value={params.year} 
                            onChange={(val: any) => setParams(p => ({ ...p, year: Number(val.target.value) }))} 
                        />
                    </div>
                    <Button variant="secondary" onClick={() => refetchPreview()}>
                        Refresh Preview
                    </Button>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                        <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                        {periodStatus === 'FUTURE' ? 'Payroll Projection (Draft)' : 'Payroll Preview'}
                    </div>

                    {periodStatus === 'FUTURE' && (
                        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-md text-sm">
                            <strong>Note:</strong> This is a future projection. Reports can only be sent during or after the payroll month.
                        </div>
                    )}
                    
                    {periodStatus === 'FINALIZED' && (
                        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-md text-sm">
                            <strong>Note:</strong> A finalized report has already been sent for this period. Sending again will create an amended version.
                        </div>
                    )}

                    {previewData?.data && (
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <Card className="p-4 bg-blue-50/50 border-blue-100">
                                <div className="text-blue-700 text-xs font-bold uppercase tracking-wider mb-1">Total Employees</div>
                                <div className="text-2xl font-bold text-blue-900">{summary.totalEmployees}</div>
                            </Card>
                            <Card className="p-4 bg-emerald-50/50 border-emerald-100">
                                <div className="text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">Total Gross Salary</div>
                                <div className="text-2xl font-bold text-emerald-900">ETB {summary.totalGrossSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </Card>
                        </div>
                    )}

                    <Card className="overflow-hidden">
                        <DataTable 
                            columns={columns} 
                            data={previewData?.data || []} 
                            isLoading={isPreviewLoading} 
                            keyExtractor={(row: any) => row.employeeId}
                        />
                    </Card>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                        <History className="w-5 h-5 text-indigo-600" />
                        Recent Reports
                    </div>
                    <Card className="overflow-hidden">
                        <DataTable 
                            columns={historyColumns} 
                            data={historyData || []} 
                            isLoading={isHistoryLoading}
                            keyExtractor={(row: any) => row.id} 
                        />
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default PayrollPage;
