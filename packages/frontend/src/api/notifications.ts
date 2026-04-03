import apiClient from './client';

export interface Notification {
    id: number;
    userId: number;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    metadata?: Record<string, unknown>;
}

export const notificationsApi = {
    /** GET /notifications — list all notifications for the current user */
    list: () => apiClient.get<Notification[]>('/notifications'),

    /** GET /notifications/unread-count */
    unreadCount: () => apiClient.get<{ count: number }>('/notifications/unread-count'),

    /** PATCH /notifications/:id/read */
    markAsRead: (id: number) => apiClient.patch(`/notifications/${id}/read`),

    /** PATCH /notifications/read-all */
    markAllAsRead: () => apiClient.patch('/notifications/read-all'),
};
