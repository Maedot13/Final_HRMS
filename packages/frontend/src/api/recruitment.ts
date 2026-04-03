import apiClient from './client';

export interface JobPostingPayload {
    title: string;
    description: string;
    requirements: string;
    position: string;
    deadline: string; // ISO format
    departmentId?: number;
    campusId?: number;
}

export const recruitmentApi = {
    // ---- Job Postings ----
    listJobs: (params?: { status?: string; limit?: number; offset?: number }) =>
        apiClient.get('/recruitment/postings', { params }),

    getJobById: (id: number) => apiClient.get(`/recruitment/postings/${id}`),

    createJob: (data: JobPostingPayload) => apiClient.post('/recruitment/postings', data),

    updateJob: (id: number, data: Partial<JobPostingPayload>) =>
        apiClient.patch(`/recruitment/postings/${id}`, data),
        
    // ---- Job Applications ----
    listApplications: (jobId: number, params?: { status?: string }) =>
        apiClient.get(`/recruitment/postings/${jobId}/applications`, { params }),

    apply: (formData: FormData) =>
        apiClient.post('/recruitment/apply', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),

    reviewApplication: (appId: number, data: { status: string; reviewComment?: string }) =>
        apiClient.patch(`/recruitment/applications/${appId}/status`, data),
};
