import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../ui/Button';
import apiClient from '../../api/client';
import { notificationsApi, type Notification } from '../../api/notifications';
import { FiBell, FiCheck, FiCheckCircle, FiInfo, FiAlertCircle, FiX } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import { getShortRoleLabel } from '../../utils/roleUtils';

function NotificationIcon({ type }: { type: string }) {
    const t = type?.toUpperCase() ?? '';
    if (t.includes('LEAVE')) return <FiCheckCircle className="w-4 h-4 text-green-500" />;
    if (t.includes('ALERT') || t.includes('REJECT')) return <FiAlertCircle className="w-4 h-4 text-red-400" />;
    return <FiInfo className="w-4 h-4 text-blue-400" />;
}

function NotificationDropdown({ onClose }: { onClose: () => void }) {
    const queryClient = useQueryClient();
    const { data: notifData, isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => notificationsApi.list().then((r) => (Array.isArray(r.data) ? r.data : [])),
        staleTime: 15_000,
    });

    const markOne = useMutation({
        mutationFn: (id: number) => notificationsApi.markAsRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notif-count'] });
        },
    });

    const markAll = useMutation({
        mutationFn: () => notificationsApi.markAllAsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notif-count'] });
        },
    });

    const notifications: Notification[] = notifData ?? [];
    const unread = notifications.filter((n) => !n.isRead);

    return (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900">Notifications</span>
                    {unread.length > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-primary text-white">
                            {unread.length}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {unread.length > 0 && (
                        <button
                            onClick={() => markAll.mutate()}
                            disabled={markAll.isPending}
                            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-primary/8 transition-colors"
                        >
                            <FiCheck className="w-3 h-3" /> Mark all read
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <FiX className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
                {isLoading ? (
                    <div className="py-6 flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="py-10 text-center text-gray-400 text-sm">
                        <FiBell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p>No notifications yet</p>
                    </div>
                ) : (
                    notifications.map((n) => (
                        <button
                            key={n.id}
                            onClick={() => { if (!n.isRead) markOne.mutate(n.id); }}
                            className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                                !n.isRead ? 'bg-blue-50/50' : ''
                            }`}
                        >
                            <div className="mt-0.5 shrink-0">
                                <NotificationIcon type={n.type} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm leading-snug ${!n.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                    {n.title || n.message}
                                </p>
                                {n.title && n.message && (
                                    <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">
                                        {n.message}
                                    </p>
                                )}
                                <p className="text-[10px] text-gray-400 mt-1">
                                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                </p>
                            </div>
                            {!n.isRead && (
                                <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                            )}
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}

export function Topbar() {
    const user = useAuthStore((state) => state.user);
    const refreshToken = useAuthStore((state) => state.refreshToken);
    const logout = useAuthStore((state) => state.logout);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const bellRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    const { data: countData } = useQuery({
        queryKey: ['notif-count'],
        queryFn: () => notificationsApi.unreadCount().then((r) => r.data.count ?? 0),
        refetchInterval: 30_000,
        enabled: !!user,
    });

    const unreadCount = countData ?? 0;

    // Close dropdown on outside click
    useEffect(() => {
        if (!dropdownOpen) return;
        const handler = (e: MouseEvent) => {
            if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [dropdownOpen]);

    const handleBellClick = () => {
        setDropdownOpen((prev) => {
            if (!prev) {
                // Prefetch notification list when opening
                queryClient.invalidateQueries({ queryKey: ['notifications'] });
            }
            return !prev;
        });
    };

    const handleLogout = async () => {
        try {
            if (refreshToken) {
                await apiClient.post('/auth/logout', { refreshToken });
            }
        } catch {
            // Ignore logout errors
        } finally {
            logout();
            window.location.href = '/login';
        }
    };

    return (
        <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4">
            <div className="text-sm font-medium text-text-secondary">
                {user?.employee?.firstName ? `Welcome, ${user.employee.firstName}` : 'Welcome'}
            </div>
            <div className="flex items-center gap-3">
                {user && (
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide px-2 py-0.5 bg-primary/10 rounded">
                        {getShortRoleLabel(user)}
                    </span>
                )}

                {/* Notification Bell */}
                <div ref={bellRef} className="relative">
                    <button
                        id="notification-bell"
                        onClick={handleBellClick}
                        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                        aria-label="Notifications"
                    >
                        <FiBell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-red-500 text-white">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                    {dropdownOpen && (
                        <NotificationDropdown onClose={() => setDropdownOpen(false)} />
                    )}
                </div>

                <Button variant="ghost" size="sm" onClick={handleLogout}>
                    Logout
                </Button>
            </div>
        </header>
    );
}
