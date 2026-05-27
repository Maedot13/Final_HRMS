// ✅ FIXED client.ts
import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/useAuthStore';

// Single source of truth — set VITE_API_URL in Vercel dashboard
const BASE_URL = import.meta.env.VITE_API_URL || 'https://final-hrms-ty3d.onrender.com/api/v1';

const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
});

let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

const getCsrfToken = async () => {
    if (csrfToken) return csrfToken;
    if (csrfTokenPromise) return csrfTokenPromise;

    csrfTokenPromise = axios.get(`${BASE_URL}/csrf-token`, { withCredentials: true })
        .then(res => {
            csrfToken = res.data.csrfToken;
            return csrfToken as string;
        })
        .finally(() => { csrfTokenPromise = null; });

    return csrfTokenPromise;
};

apiClient.interceptors.request.use(
    async (config) => {
        const token = useAuthStore.getState().accessToken;
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        const isMutation = ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '');
        if (isMutation) {
            const csrf = await getCsrfToken();
            if (csrf && config.headers) {
                config.headers['X-CSRF-Token'] = csrf;
                config.headers['csrf-token'] = csrf;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as typeof error.config & { _retry?: boolean };

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const { refreshToken, user } = useAuthStore.getState();
                if (refreshToken && user) {
                    const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
                    const { token: accessToken, refreshToken: newRefreshToken } = res.data;
                    useAuthStore.getState().setAuth(user, accessToken, newRefreshToken);
                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    }
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                useAuthStore.getState().logout();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        if (error.response?.status === 403) {
            const data = error.response.data as { code?: string };
            if (data?.code === 'PASSWORD_CHANGE_REQUIRED') {
                window.location.href = '/force-password-change';
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;