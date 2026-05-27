import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const defaultBase = import.meta.env.DEV ? '/api/v1' : 'https://final-hrms-ty3d.onrender.com/api/v1';

let resolvedBaseUrl = import.meta.env.VITE_API_BASE_URL;
if (!import.meta.env.DEV && resolvedBaseUrl && resolvedBaseUrl.startsWith('/')) {
    resolvedBaseUrl = 'https://final-hrms-ty3d.onrender.com/api/v1';
}

const apiClient = axios.create({
    baseURL: resolvedBaseUrl || defaultBase,
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

    const defaultBase = import.meta.env.DEV ? '/api/v1' : 'https://final-hrms-ty3d.onrender.com/api/v1';
    let resolvedBaseUrl = import.meta.env.VITE_API_BASE_URL;
    if (!import.meta.env.DEV && resolvedBaseUrl && resolvedBaseUrl.startsWith('/')) {
        resolvedBaseUrl = 'https://final-hrms-ty3d.onrender.com/api/v1';
    }
    const base = resolvedBaseUrl || defaultBase;
    csrfTokenPromise = axios.get(`${base}/csrf-token`, { withCredentials: true }).then(res => {
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
                    const defaultBase = import.meta.env.DEV ? '/api/v1' : 'https://final-hrms-ty3d.onrender.com/api/v1';
                    let resolvedBaseUrl = import.meta.env.VITE_API_BASE_URL;
                    if (!import.meta.env.DEV && resolvedBaseUrl && resolvedBaseUrl.startsWith('/')) {
                        resolvedBaseUrl = 'https://final-hrms-ty3d.onrender.com/api/v1';
                    }
                    const base = resolvedBaseUrl || defaultBase;
                    const res = await axios.post(`${base}/auth/refresh`, { refreshToken });
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
