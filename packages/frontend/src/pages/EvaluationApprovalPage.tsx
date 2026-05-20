import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPendingEvaluations, approveEvaluation, rejectEvaluation } from '../api/appraisals';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FiCheck, FiX, FiInfo } from 'react-icons/fi';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

const EvaluationApprovalPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [rejectionReason, setRejectionReason] = useState<string>('');
    const [rejectingId, setRejectingId] = useState<number | null>(null);

    const { data: pending, isLoading, isError, error } = useQuery({
        queryKey: ['pending-evaluations'],
        queryFn: getPendingEvaluations
    });

    const approveMutation = useMutation({
        mutationFn: approveEvaluation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-evaluations'] });
            toast.success('Evaluation approved successfully');
        },
        onError: () => toast.error('Failed to approve evaluation')
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }: { id: number; reason: string }) => rejectEvaluation(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-evaluations'] });
            setRejectingId(null);
            setRejectionReason('');
            toast.success('Evaluation rejected');
        },
        onError: () => toast.error('Failed to reject evaluation')
    });

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading pending evaluations...</div>;

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-8 animate-fade-in shadow-gray-50">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                        Performance Approvals
                    </h1>
                    <p className="text-gray-500 mt-1">Review and approve efficiency forms submitted by Department Heads.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-6">
                {isError ? (
                    <Card className="p-12 text-center text-red-500 bg-red-50 shadow-sm border border-red-100">
                        <FiX className="w-12 h-12 mx-auto mb-4 text-red-400 opacity-50" />
                        <p className="text-lg font-medium text-red-900">Failed to load evaluations</p>
                        <p>{(error as any)?.response?.data?.message || (error as any)?.message}</p>
                    </Card>
                ) : (!pending || pending.length === 0) ? (
                    <Card className="p-12 text-center text-gray-500 bg-white shadow-sm border-none">
                        <FiCheck className="w-12 h-12 mx-auto mb-4 text-green-400 opacity-50" />
                        <p className="text-lg font-medium text-gray-900">All caught up!</p>
                        <p>No evaluations are currently pending your approval.</p>
                    </Card>
                ) : (
                    pending?.map((evaluation: any) => (
                        <Card key={evaluation.id} className="bg-white shadow-sm border-none overflow-hidden hover:shadow-md transition-all duration-300">
                            <div className="p-6">
                                <div className="flex flex-col md:flex-row justify-between gap-6">
                                    <div className="space-y-4 flex-1">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                                                {evaluation.employee?.name?.[0]}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900">{evaluation.employee?.name}</h3>
                                                <p className="text-sm text-gray-500">ID: {evaluation.employee?.employeeId} • Period: {evaluation.period}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 py-2">
                                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <p className="text-[10px] text-gray-400 uppercase font-bold">Quality</p>
                                                <p className="text-lg font-bold text-primary">{evaluation.qualityScore}%</p>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <p className="text-[10px] text-gray-400 uppercase font-bold">Punctuality</p>
                                                <p className="text-lg font-bold text-primary">{evaluation.punctualityScore}%</p>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <p className="text-[10px] text-gray-400 uppercase font-bold">Knowledge</p>
                                                <p className="text-lg font-bold text-primary">{evaluation.knowledgeScore}%</p>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <p className="text-[10px] text-gray-400 uppercase font-bold">Teamwork</p>
                                                <p className="text-lg font-bold text-primary">{evaluation.teamworkScore}%</p>
                                            </div>
                                            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                                                <p className="text-[10px] text-blue-400 uppercase font-bold">Aggregate</p>
                                                <p className="text-lg font-black text-blue-600">{evaluation.efficiencyScore}%</p>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 inline-block">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Work Output</p>
                                            <p className="text-lg font-bold text-gray-900">{evaluation.workOutputScore}%</p>
                                        </div>

                                        {evaluation.comments && (
                                            <div className="flex gap-2 p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-sm text-blue-800">
                                                <FiInfo className="mt-0.5 flex-shrink-0" />
                                                <p><strong>Dept Head Comments:</strong> {evaluation.comments}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-row md:flex-col justify-end gap-3 md:border-l md:pl-6 md:border-gray-100">
                                        <Button 
                                            variant="primary" 
                                            leftIcon={<FiCheck />} 
                                            onClick={() => approveMutation.mutate(evaluation.id)}
                                            isLoading={approveMutation.isPending}
                                            className="w-full shadow-lg shadow-primary/20"
                                        >
                                            Approve
                                        </Button>
                                        <Button 
                                            variant="secondary" 
                                            leftIcon={<FiX />} 
                                            onClick={() => setRejectingId(evaluation.id)}
                                            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                        >
                                            Reject
                                        </Button>
                                    </div>
                                </div>

                                {rejectingId === evaluation.id && (
                                    <div className="mt-6 p-4 bg-red-50 rounded-xl border border-red-100 animate-slide-up">
                                        <label className="block text-sm font-bold text-red-900 mb-2">Rejection Reason</label>
                                        <textarea 
                                            className="w-full bg-white border border-red-200 rounded-lg p-3 text-sm focus:ring-red-500 focus:border-red-500"
                                            placeholder="Please explain why this evaluation is being rejected..."
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            rows={3}
                                        />
                                        <div className="flex justify-end gap-3 mt-4">
                                            <Button variant="ghost" onClick={() => setRejectingId(null)}>Cancel</Button>
                                            <Button 
                                                variant="danger" 
                                                disabled={!rejectionReason.trim()}
                                                onClick={() => rejectMutation.mutate({ id: evaluation.id, reason: rejectionReason })}
                                                isLoading={rejectMutation.isPending}
                                            >
                                                Confirm Rejection
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default EvaluationApprovalPage;
