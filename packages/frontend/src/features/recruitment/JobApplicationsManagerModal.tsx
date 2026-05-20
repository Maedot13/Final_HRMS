import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { recruitmentApi } from '../../api/recruitment';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { useAuthStore } from '../../store/useAuthStore';
import { FiCheck, FiX, FiActivity, FiEdit3, FiAward } from 'react-icons/fi';

interface JobApplicationsManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: number | null;
    jobTitle: string;
}

export function JobApplicationsManagerModal({ isOpen, onClose, jobId, jobTitle }: JobApplicationsManagerModalProps) {
    const queryClient = useQueryClient();
    const user = useAuthStore(state => state.user);
    const [evaluatingAppId, setEvaluatingAppId] = useState<number | null>(null);
    const [reviewComment, setReviewComment] = useState('');
    
    // Evaluation state
    const [examScore, setExamScore] = useState<number>(0);
    const [interviewScore, setInterviewScore] = useState<number>(0);
    const [recommendation, setRecommendation] = useState('');

    const { data: applications = [], isLoading } = useQuery({
        queryKey: ['jobApplications', jobId],
        queryFn: async () => {
            if (!jobId) return [];
            const res = await recruitmentApi.listApplications(jobId);
            return Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
        },
        enabled: !!jobId && isOpen,
    });

    const statusMutation = useMutation({
        mutationFn: (data: { appId: number; status: string }) => 
            recruitmentApi.reviewApplication(data.appId, { status: data.status, reviewComment: reviewComment || undefined }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['jobApplications', jobId] });
            if (variables.status === 'HIRED') {
                queryClient.invalidateQueries({ queryKey: ['recruitmentJobs'] });
                toast.success('Candidate hired and job closed.');
            } else {
                toast.success(`Application marked as ${variables.status}`);
            }
            setReviewComment('');
        },
        onError: () => toast.error('Failed to update application status')
    });

    const evaluationMutation = useMutation({
        mutationFn: (data: { appId: number; status: string }) => 
            recruitmentApi.evaluateApplication(data.appId, {
                examScore,
                interviewScore,
                recommendation,
                status: data.status
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobApplications', jobId] });
            toast.success('Evaluation submitted successfully');
            setEvaluatingAppId(null);
            setExamScore(0);
            setInterviewScore(0);
            setRecommendation('');
        },
        onError: () => toast.error('Failed to submit evaluation')
    });

    const handleStatusUpdate = (appId: number, status: string) => {
        if (status === 'HIRED' && !window.confirm('Are you sure? Hiring a candidate will close this job posting.')) {
            return;
        }
        statusMutation.mutate({ appId, status });
    };

    const isHR = user?.role === 'HR_OFFICER' || user?.role === 'ADMIN';
    const isCommittee = user?.role === 'RECRUITMENT_COMMITTEE' || user?.role === 'ADMIN';

    // Filter applications: Committee should NOT see PENDING or REJECTED applications
    const visibleApplications = applications.filter((app: any) => {
        if (isHR) return true; // HR sees everything
        if (isCommittee) {
            return ['ACCEPTED', 'EVALUATED', 'RECOMMENDED', 'NOT_SELECTED', 'HIRED'].includes(app.status);
        }
        return false;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'HIRED': return <Badge variant="approved">Hired</Badge>;
            case 'REJECTED': return <Badge variant="rejected">Rejected</Badge>;
            case 'RECOMMENDED': return <Badge variant="success">Recommended</Badge>;
            case 'NOT_SELECTED': return <Badge variant="error">Not Selected</Badge>;
            case 'ACCEPTED': return <Badge variant="info">Screened (Passed)</Badge>;
            case 'EVALUATED': return <Badge variant="warning">Evaluated</Badge>;
            default: return <Badge variant="neutral">{status}</Badge>;
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Recruitment: ${jobTitle}`} size="xl">
            <div className="p-4">
                {isLoading ? (
                    <div className="text-center py-8">Loading applications...</div>
                ) : applications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No applications received yet.</div>
                ) : visibleApplications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No applications are available for your review at this stage.</div>
                ) : (
                    <div className="space-y-6">
                        {visibleApplications.map((app: any) => (
                            <div key={app.id} className="border rounded-lg p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-4 items-center">
                                        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl">
                                            {app.employee.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-lg text-gray-900">{app.employee.name}</h4>
                                            <div className="text-sm text-gray-500 flex gap-3 mt-0.5">
                                                <span>ID: {app.employee.employeeId}</span>
                                                <span className="w-1 h-1 bg-gray-300 rounded-full self-center"></span>
                                                <span>{app.employee.position}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {getStatusBadge(app.status)}
                                        <span className="text-xs text-gray-400">
                                            Applied {format(new Date(app.createdAt), 'MMM d, yyyy')}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                    <div className="bg-gray-50 p-3 rounded-md text-sm border border-gray-100">
                                        <span className="font-semibold text-gray-700 block mb-1">Reason for Applying</span>
                                        <p className="text-gray-600 line-clamp-3">{app.reasonForApplying}</p>
                                    </div>
                                    
                                    {(app.examScore !== null || app.interviewScore !== null) && (
                                        <div className="bg-primary/5 p-3 rounded-md text-sm border border-primary/10">
                                            <span className="font-semibold text-primary block mb-1 flex items-center gap-1.5">
                                                <FiActivity className="w-3.5 h-3.5" /> Committee Scores
                                            </span>
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                <div>
                                                    <span className="text-xs text-gray-500 uppercase">Exam Score</span>
                                                    <p className="font-bold text-gray-800">{app.examScore || 'N/A'}/100</p>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-gray-500 uppercase">Interview Score</span>
                                                    <p className="font-bold text-gray-800">{app.interviewScore || 'N/A'}/100</p>
                                                </div>
                                            </div>
                                            {app.recommendation && (
                                                <div className="mt-2 pt-2 border-t border-primary/10">
                                                    <span className="text-xs text-gray-500 uppercase">Recommendation</span>
                                                    <p className="text-gray-700 italic">"{app.recommendation}"</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                    <a 
                                        href={app.cvUrl} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50 font-medium text-gray-600 transition-colors"
                                    >
                                        <FiActivity className="w-4 h-4" /> View CV
                                    </a>

                                    <div className="flex gap-2">
                                        {/* STEP 3: HR SCREENING */}
                                        {isHR && app.status === 'PENDING' && (
                                            <>
                                                <Button size="sm" variant="danger" className="flex items-center gap-1.5" onClick={() => handleStatusUpdate(app.id, 'REJECTED')} isLoading={statusMutation.isPending}>
                                                    <FiX className="w-4 h-4" /> Reject
                                                </Button>
                                                <Button size="sm" variant="primary" className="flex items-center gap-1.5" onClick={() => handleStatusUpdate(app.id, 'ACCEPTED')} isLoading={statusMutation.isPending}>
                                                    <FiCheck className="w-4 h-4" /> Pass Screening
                                                </Button>
                                            </>
                                        )}

                                        {/* STEP 4: COMMITTEE EVALUATION */}
                                        {isCommittee && (app.status === 'ACCEPTED' || app.status === 'EVALUATED') && evaluatingAppId !== app.id && (
                                            <Button size="sm" variant="secondary" className="flex items-center gap-1.5" onClick={() => setEvaluatingAppId(app.id)}>
                                                <FiEdit3 className="w-4 h-4" /> Evaluate Applicant
                                            </Button>
                                        )}

                                        {/* STEP 5: FINAL HIRING (HR) */}
                                        {isHR && app.status === 'RECOMMENDED' && (
                                            <>
                                                <Button size="sm" variant="danger" className="flex items-center gap-1.5" onClick={() => handleStatusUpdate(app.id, 'NOT_SELECTED')} isLoading={statusMutation.isPending}>
                                                    <FiX className="w-4 h-4" /> Not Selected
                                                </Button>
                                                <Button size="sm" variant="primary" className="flex items-center gap-1.5" onClick={() => handleStatusUpdate(app.id, 'HIRED')} isLoading={statusMutation.isPending}>
                                                    <FiAward className="w-4 h-4" /> Hire Candidate
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* EVALUATION FORM (INLINE) */}
                                {evaluatingAppId === app.id && (
                                    <div className="mt-6 p-4 border-2 border-primary/20 bg-primary/5 rounded-lg space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <h5 className="font-bold text-primary flex items-center gap-2">
                                            <FiEdit3 /> Committee Evaluation Form
                                        </h5>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Exam Score (0-100)</label>
                                                <input 
                                                    type="number" 
                                                    className="w-full border rounded-md px-3 py-2 text-sm"
                                                    value={examScore}
                                                    onChange={e => setExamScore(parseInt(e.target.value))}
                                                    min="0" max="100"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Interview Score (0-100)</label>
                                                <input 
                                                    type="number" 
                                                    className="w-full border rounded-md px-3 py-2 text-sm"
                                                    value={interviewScore}
                                                    onChange={e => setInterviewScore(parseInt(e.target.value))}
                                                    min="0" max="100"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Committee Recommendation / Comments</label>
                                            <textarea 
                                                className="w-full border rounded-md px-3 py-2 text-sm"
                                                rows={3}
                                                value={recommendation}
                                                onChange={e => setRecommendation(e.target.value)}
                                                placeholder="Detail the committee's decision..."
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button size="sm" variant="ghost" onClick={() => setEvaluatingAppId(null)}>Cancel</Button>
                                            <Button size="sm" variant="danger" onClick={() => evaluationMutation.mutate({ appId: app.id, status: 'NOT_SELECTED' })} isLoading={evaluationMutation.isPending}>Recommend Reject</Button>
                                            <Button size="sm" variant="primary" onClick={() => evaluationMutation.mutate({ appId: app.id, status: 'RECOMMENDED' })} isLoading={evaluationMutation.isPending}>Recommend for Hire</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
}
