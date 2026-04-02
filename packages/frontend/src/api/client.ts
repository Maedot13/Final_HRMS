import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const apiClient = axios.create({
    baseURL: '/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

const getCsrfToken = async () => {
    if (csrfToken) return csrfToken;
    if (csrfTokenPromise) return csrfTokenPromise;

    csrfTokenPromise = axios.get('/api/v1/csrf-token', { withCredentials: true }).then(res => {
        csrfToken = res.data.csrfToken;
        return csrfToken as string;
    }).finally(() => {
        csrfTokenPromise = null;
    });

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
            const token = await getCsrfToken();
            if (token && config.headers) {
                config.headers['X-CSRF-Token'] = token;
                config.headers['csrf-token'] = token;
            }
        }

        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && originalRequest && !(originalRequest as typeof originalRequest & { _retry?: boolean })._retry) {
            (originalRequest as typeof originalRequest & { _retry?: boolean })._retry = true;
            try {
                const refreshToken = useAuthStore.getState().refreshToken;
                const user = useAuthStore.getState().user;
                if (refreshToken && user) {
                    const res = await axios.post('/api/v1/auth/refresh', { refreshToken });
                    const { token: accessToken, refreshToken: newRefreshToken } = res.data;

                    useAuthStore.getState().setAuth(
                        user,
                        accessToken,
                        newRefreshToken
                    );

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

        // Handle 403 Force Password Change
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
