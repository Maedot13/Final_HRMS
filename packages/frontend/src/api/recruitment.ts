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
        
    updateJobStatus: (id: number, status: string) =>
        apiClient.patch(`/recruitment/postings/${id}/status`, { status }),
        
    // ---- Job Applications ----
    listApplications: (jobId: number, params?: { status?: string }) =>
        apiClient.get(`/recruitment/postings/${jobId}/applications`, { params }),

    getMyApplications: () => apiClient.get('/recruitment/my-applications'),

    apply: (formData: FormData) =>
        apiClient.post('/recruitment/apply', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),

    reviewApplication: (appId: number, data: { status: string; reviewComment?: string; assignedFacultyId?: number }) =>
        apiClient.patch(`/recruitment/applications/${appId}/status`, data),

    evaluateApplication: (appId: number, data: { 
        examScore?: number; 
        interviewScore?: number; 
        recommendation: string; 
        status: string;
    }) => apiClient.post(`/recruitment/applications/${appId}/evaluate`, data),
};
