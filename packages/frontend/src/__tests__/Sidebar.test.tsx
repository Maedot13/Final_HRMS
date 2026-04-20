import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { useAuthStore } from '../store/useAuthStore';
import { beforeEach, describe, it, expect } from 'vitest';

describe('Sidebar Permissions', () => {
    beforeEach(() => {
        useAuthStore.setState({ user: null });
    });

    it('renders employee items for EMPLOYEE role', () => {
        useAuthStore.setState({ user: { id: 1, role: 'EMPLOYEE' } as any });
        render(
            <MemoryRouter>
                <Sidebar />
            </MemoryRouter>
        );

        // Employee items
        expect(screen.getByText(/Leave/i)).toBeDefined();
        // Employee items that don't need role
        expect(screen.getByText(/Dashboard/i)).toBeDefined();

        // Admin/HR items should NOT be present
        expect(screen.queryByText(/Campuses/i)).toBeNull();
        expect(screen.queryByText(/Clearance/i)).toBeNull();
    });

    it('renders HR items for HR_OFFICER role', () => {
        useAuthStore.setState({ user: { id: 1, role: 'HR_OFFICER' } as any });
        render(
            <MemoryRouter>
                <Sidebar />
            </MemoryRouter>
        );

        // HR items
        expect(screen.getByText(/Clearance/i)).toBeDefined();
        expect(screen.getByText(/Employees/i)).toBeDefined();
        
        // Employee items still visible
        expect(screen.getByText(/Leave/i)).toBeDefined();

        // Settings is ADMIN only
        expect(screen.queryByText(/Settings/i)).toBeNull();
    });
});
