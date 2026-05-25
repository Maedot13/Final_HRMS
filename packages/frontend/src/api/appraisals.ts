
import apiClient from './client';

export interface PerformanceEvaluation {
    id: number;
    employeeId: number;
    evaluatorId: number;
    period: string;
    efficiencyScore: number;
    workOutputScore: number;
    comments?: string;
    createdAt: string;
    updatedAt: string;
}

export const getMyAppraisals = async (): Promise<any> => {
    const response = await apiClient.get('/evaluations/my');
    return response.data;
};

export const getAutomatedMetrics = async () => {
    const response = await apiClient.get('/evaluations/automated-metrics');
    return response.data;
};

export const getPendingEvaluations = async (): Promise<PerformanceEvaluation[]> => {
    const response = await apiClient.get('/evaluations/pending');
    return response.data;
};

export const approveEvaluation = async (id: number) => {
    const response = await apiClient.post(`/evaluations/${id}/approve`);
    return response.data;
};

export const rejectEvaluation = async (id: number, reason: string) => {
    const response = await apiClient.post(`/evaluations/${id}/reject`, { reason });
    return response.data;
};

export const getEmployeeAppraisals = async (employeeId: number): Promise<PerformanceEvaluation[]> => {
    const response = await apiClient.get(`/evaluations/employee/${employeeId}`);
    return response.data;
};

export const createAppraisal = async (data: any): Promise<PerformanceEvaluation> => {
    const response = await apiClient.post('/evaluations', data);
    return response.data;
};

export const updateAppraisal = async (id: number, data: any) => {
    const response = await apiClient.get('/csrf-token');
    const csrfToken = response.data.csrfToken;
    return apiClient.patch(`/evaluations/${id}`, data, {
        headers: { 'X-CSRF-Token': csrfToken }
    });
};
