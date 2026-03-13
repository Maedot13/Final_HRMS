import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../ui/Button';
import apiClient from '../../api/client';

export function Topbar() {
    const user = useAuthStore((state) => state.user);
    const refreshToken = useAuthStore((state) => state.refreshToken);
    const logout = useAuthStore((state) => state.logout);

    const handleLogout = async () => {
        try {
            if (refreshToken) {
                await apiClient.post('/auth/logout', { refreshToken });
            }
        } catch {
            // Ignore logout errors – user session will be cleared locally regardless.
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
                    <span className="text-xs text-text-secondary uppercase tracking-wide">
                        {user.role}
                    </span>
                )}
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                    Logout
                </Button>
            </div>
        </header>
    );
}

