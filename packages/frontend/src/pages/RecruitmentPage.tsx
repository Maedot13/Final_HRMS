import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { recruitmentApi } from '../api/recruitment';
import { format } from 'date-fns';
import { useAuthStore } from '../store/useAuthStore';
import { JobPostingModal } from '../features/recruitment/JobPostingModal';
import { JobApplicationModal } from '../features/recruitment/JobApplicationModal';
import { JobApplicationsManagerModal } from '../features/recruitment/JobApplicationsManagerModal';

export default function RecruitmentPage() {
    const user = useAuthStore(state => state.user);
    const [activeTab, setActiveTab] = useState<'Internal Jobs' | 'My Applications'>('Internal Jobs');
    const [statusFilter, setStatusFilter] = useState<string>('OPEN');
    const [isPostingModalOpen, setIsPostingModalOpen] = useState(false);
    const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
    const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<{ id: number; title: string } | null>(null);
    const [editingJob, setEditingJob] = useState<any | null>(null);
    const queryClient = useQueryClient();

    const cancelJobMutation = useMutation({
        mutationFn: (id: number) => recruitmentApi.updateJobStatus(id, 'CLOSED'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recruitmentJobs'] });
        }
    });

    const { data: jobs = [], isLoading: isJobsLoading } = useQuery({
        queryKey: ['recruitmentJobs', statusFilter],
        queryFn: async () => {
            const res = await recruitmentApi.listJobs(
                statusFilter !== 'ALL' ? { status: statusFilter } : undefined
            );
            return Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
        },
        enabled: activeTab === 'Internal Jobs'
    });

    useEffect(() => {
        document.title = 'Internal Recruitment - HR Management System';
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute('content', 'Explore internal job opportunities, submit applications, and manage HR recruitment processes.');
        } else {
            const newMeta = document.createElement('meta');
            newMeta.name = 'description';
            newMeta.content = 'Explore internal job opportunities, submit applications, and manage HR recruitment processes.';
            document.head.appendChild(newMeta);
        }
    }, []);

    const { data: myApplications = [], isLoading: isAppsLoading } = useQuery({
        queryKey: ['myApplications'],
        queryFn: async () => {
            const res = await recruitmentApi.getMyApplications();
            return Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
        },
        enabled: activeTab === 'My Applications'
    });

    const isHR = user?.role === 'ADMIN' || user?.role === 'HR_OFFICER';
    const isCommittee = user?.role === 'RECRUITMENT_COMMITTEE' || user?.role === 'ADMIN';
    const canManageJobs = isHR;
    const canViewApplications = isHR || isCommittee;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader
                    title="Recruitment Portal"
                    subtitle="Explore opportunities or manage active applications"
                    action={
                        canManageJobs ? (
                            <Button variant="primary" onClick={() => setIsPostingModalOpen(true)}>
                                Create Job Posting
                            </Button>
                        ) : undefined
                    }
                />
                <div className="border-t border-gray-100 flex p-2 gap-2 bg-gray-50/50">
                    <Button 
                        variant={activeTab === 'Internal Jobs' ? 'secondary' : 'ghost'} 
                        onClick={() => setActiveTab('Internal Jobs')}
                        size="sm"
                    >
                        Internal Jobs
                    </Button>
                    <Button 
                        variant={activeTab === 'My Applications' ? 'secondary' : 'ghost'} 
                        onClick={() => setActiveTab('My Applications')}
                        size="sm"
                    >
                        My Applications
                    </Button>
                </div>
            </Card>

            {activeTab === 'Internal Jobs' && (
                <>
                    <div className="flex gap-2">
                        {['ALL', 'OPEN', 'CLOSED'].map((s) => (
                            <Button
                                key={s}
                                variant={statusFilter === s ? 'secondary' : 'ghost'}
                                onClick={() => setStatusFilter(s)}
                                size="sm"
                            >
                                {s}
                            </Button>
                        ))}
                    </div>

                    {isJobsLoading ? (
                        <div className="space-y-4">
                            <div className="h-32 w-full animate-pulse bg-white border rounded"></div>
                            <div className="h-32 w-full animate-pulse bg-white border rounded"></div>
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-card shadow-card text-gray-500">
                            No job postings found.
                        </div>
                    ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                    {/* Background decorations for glassmorphism effect */}
                    <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20 -z-10 animate-pulse"></div>
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20 -z-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
                    
                    {jobs.map((job: any) => (
                        <Card key={job.id} className="!bg-white/60 backdrop-blur-md border border-white/40 !shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] hover:!shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] hover:-translate-y-1 transition-all duration-300">
                            <CardHeader 
                                title={job.title}
                                subtitle={job.position}
                            />
                            <div className="p-4 pt-0">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500 font-medium">Status</span>
                                        <div className="flex items-center gap-2">
                                            {job.status === 'OPEN' && (
                                                <span className="relative flex h-2.5 w-2.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                                                </span>
                                            )}
                                            <Badge variant={job.status === 'OPEN' ? 'approved' : 'neutral'}>
                                                {job.status}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Deadline</span>
                                        <span>{format(new Date(job.deadline), 'MMM d, yyyy')}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Vacancies</span>
                                        <span className="font-semibold text-primary">
                                            {job._count?.applications || 0} / {job.vacancies} filled
                                        </span>
                                    </div>
                                    <div className="pt-4 flex gap-2">
                                        {canViewApplications ? (
                                            <div className="flex gap-2 w-full">
                                                <Button variant="secondary" className="flex-1" onClick={() => {
                                                    setSelectedJob({ id: job.id, title: job.title });
                                                    setIsManagerModalOpen(true);
                                                }}>View Applications</Button>
                                                
                                                {canManageJobs && (
                                                    <>
                                                        <Button variant="ghost" className="flex-1 text-blue-600" onClick={() => {
                                                            setEditingJob(job);
                                                            setIsPostingModalOpen(true);
                                                        }}>Edit</Button>
                                                        {job.status === 'OPEN' && (
                                                            <Button variant="ghost" className="flex-1 text-red-600" onClick={() => {
                                                                if (confirm('Are you sure you want to close this job posting?')) {
                                                                    cancelJobMutation.mutate(job.id);
                                                                }
                                                            }}>Close</Button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        ) : job.status === 'OPEN' && (
                                            <Button 
                                                variant="primary" 
                                                className="w-full"
                                                onClick={() => {
                                                    setSelectedJob({ id: job.id, title: job.title });
                                                    setIsApplicationModalOpen(true);
                                                }}
                                            >
                                                Apply Now
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
                    )}
                </>
            )}

            {activeTab === 'My Applications' && (
                <div className="bg-white rounded-card shadow-card p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">My Submitted Applications</h3>
                    {isAppsLoading ? (
                        <div className="h-24 w-full animate-pulse bg-gray-50 rounded"></div>
                    ) : myApplications.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            You have not applied for any internal jobs yet.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {myApplications.map((app: any) => (
                                <div key={app.id} className="border rounded-md p-4 flex justify-between items-center hover:bg-gray-50">
                                    <div>
                                        <h4 className="font-semibold">{app.jobPosting.title}</h4>
                                        <div className="text-sm text-gray-500 flex gap-4 mt-1">
                                            <span>Position: {app.jobPosting.position}</span>
                                            {app.jobPosting.department && <span>Dept: {app.jobPosting.department.name}</span>}
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <div className="flex items-center gap-2">
                                            {app.status === 'HIRED' && (
                                                <span className="relative flex h-2.5 w-2.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                                </span>
                                            )}
                                            <Badge variant={
                                                app.status === 'HIRED' ? 'approved' :
                                                app.status === 'REJECTED' || app.status === 'NOT_SELECTED' ? 'rejected' :
                                                app.status === 'RECOMMENDED' ? 'success' : 
                                                app.status === 'ACCEPTED' ? 'info' : 'neutral'
                                            }>
                                                {app.status}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-gray-400 mt-2 font-medium">
                                            Applied {format(new Date(app.createdAt), 'MMM d, yyyy')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <JobPostingModal 
                isOpen={isPostingModalOpen} 
                onClose={() => {
                    setIsPostingModalOpen(false);
                    setEditingJob(null);
                }} 
                initialData={editingJob}
            />
            
            <JobApplicationModal
                isOpen={isApplicationModalOpen}
                onClose={() => {
                    setIsApplicationModalOpen(false);
                    setSelectedJob(null);
                }}
                jobId={selectedJob?.id ?? null}
                jobTitle={selectedJob?.title ?? ''}
            />

            <JobApplicationsManagerModal
                isOpen={isManagerModalOpen}
                onClose={() => {
                    setIsManagerModalOpen(false);
                    setSelectedJob(null);
                }}
                jobId={selectedJob?.id ?? null}
                jobTitle={selectedJob?.title ?? ''}
            />
        </div>
    );
}
