import { useEffect, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

interface RequireAuthProps {
    children: ReactNode;
}

interface RequireNoAuthProps {
    children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const user = useAuthStore((state) => state.user);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: location }, replace: true });
            return;
        }

        if (user?.mustChangePassword && location.pathname !== '/force-password-change') {
            navigate('/force-password-change', { replace: true });
        }

        // Complete lock-out of standard module pages for CLEARANCE_BODY
        if (
            user?.role === 'CLEARANCE_BODY' &&
            (location.pathname === '/' || location.pathname === '/contacts' || location.pathname === '/departments')
        ) {
            navigate('/clearance-body', { replace: true });
        }
    }, [isAuthenticated, user, location, navigate]);

    if (!isAuthenticated || (user?.mustChangePassword && location.pathname !== '/force-password-change')) {
        return null; // Or a loading spinner
    }

    if (user?.role === 'CLEARANCE_BODY' && (location.pathname === '/' || location.pathname === '/contacts' || location.pathname === '/departments')) {
        return null;
    }

    return <>{children}</>;
}

export function RequireNoAuth({ children }: RequireNoAuthProps) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const user = useAuthStore((state) => state.user);
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated && !user?.mustChangePassword) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, user, navigate]);

    if (isAuthenticated && !user?.mustChangePassword) {
        return null;
    }

    return <>{children}</>;
}

