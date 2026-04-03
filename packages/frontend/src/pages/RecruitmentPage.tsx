import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { recruitmentApi } from '../api/recruitment';
import { format } from 'date-fns';
import { useAuthStore } from '../store/useAuthStore';
import { JobPostingModal } from '../features/recruitment/JobPostingModal';
import { JobApplicationModal } from '../features/recruitment/JobApplicationModal';

export default function RecruitmentPage() {
    const user = useAuthStore(state => state.user);
    const [statusFilter, setStatusFilter] = useState<string>('OPEN');
    const [isPostingModalOpen, setIsPostingModalOpen] = useState(false);
    const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<{ id: number; title: string } | null>(null);

    const { data: jobs = [], isLoading } = useQuery({
        queryKey: ['recruitmentJobs', statusFilter],
        queryFn: async () => {
            const res = await recruitmentApi.listJobs(
                statusFilter !== 'ALL' ? { status: statusFilter } : undefined
            );
            return Array.isArray(res.data) ? res.data : [];
        },
    });

    const isHRAdmin = user?.role === 'ADMIN' || user?.role === 'HR_OFFICER' || user?.role === 'RECRUITMENT_COMMITTEE';

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader
                    title="Internal Job Postings"
                    subtitle="Explore opportunities or manage active job postings"
                    action={
                        isHRAdmin ? (
                            <Button variant="primary" onClick={() => setIsPostingModalOpen(true)}>
                                Create Job Posting
                            </Button>
                        ) : undefined
                    }
                />
            </Card>

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

            {isLoading ? (
                <div className="space-y-4">
                    <div className="h-32 w-full animate-pulse bg-white border rounded"></div>
                    <div className="h-32 w-full animate-pulse bg-white border rounded"></div>
                </div>
            ) : jobs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-card shadow-card text-gray-500">
                    No job postings found.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {jobs.map((job: any) => (
                        <Card key={job.id} className="hover:shadow-md transition-shadow">
                            <CardHeader 
                                title={job.title}
                                subtitle={job.position}
                            />
                            <div className="p-4 pt-0">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Status</span>
                                        <Badge variant={job.status === 'OPEN' ? 'approved' : 'neutral'}>
                                            {job.status}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Deadline</span>
                                        <span>{format(new Date(job.deadline), 'MMM d, yyyy')}</span>
                                    </div>
                                    <div className="pt-4 flex gap-2">
                                        {isHRAdmin ? (
                                            <Button variant="secondary" className="w-full">Manage</Button>
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

            <JobPostingModal 
                isOpen={isPostingModalOpen} 
                onClose={() => setIsPostingModalOpen(false)} 
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
        </div>
    );
}
