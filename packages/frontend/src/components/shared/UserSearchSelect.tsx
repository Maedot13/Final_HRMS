import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { campusApi } from '../../api/campuses';
import { FormField } from './FormField';

interface UserSearchSelectProps {
    campusId: number | string | undefined;
    value: string;
    onChange: (employeeId: string) => void;
    label?: string;
    placeholder?: string;
    error?: string;
    disabled?: boolean;
}

export function UserSearchSelect({
    campusId,
    value,
    onChange,
    label = 'Department head',
    placeholder = 'Select employee',
    error,
    disabled,
}: UserSearchSelectProps) {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const id = typeof campusId === 'string' ? parseInt(campusId, 10) : campusId;
    const { data, isLoading } = useQuery({
        queryKey: ['campus-users', id],
        queryFn: async () => {
            const res = await campusApi.getUsers(id!);
            return res.data;
        },
        enabled: !!id && !isNaN(id),
    });

    const users = data?.users ?? [];
    const filtered = search.trim()
        ? users.filter(
              (u) =>
                  u.employeeId.toLowerCase().includes(search.toLowerCase()) ||
                  (u.employee?.name ?? '').toLowerCase().includes(search.toLowerCase())
          )
        : users;

    const selectedUser = users.find((u) => u.employeeId === value);

    useEffect(() => {
        if (!isOpen) return;
        const handler = () => setIsOpen(false);
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [isOpen]);

    if (!id || isNaN(id)) return null;

    return (
        <FormField label={label} error={error ? { message: error } : undefined}>
            <div className="relative">
                <div
                    className="flex cursor-pointer items-center justify-between rounded-input border border-[#E5E7EB] bg-white px-4 py-2 text-sm"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                >
                    <span className={value ? 'text-text-primary' : 'text-text-secondary'}>
                        {selectedUser ? `${selectedUser.employeeId} – ${selectedUser.employee?.name ?? '—'}` : placeholder}
                    </span>
                </div>
                {isOpen && (
                    <div
                        className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-input border border-[#E5E7EB] bg-white shadow-dropdown"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <input
                            type="text"
                            className="w-full border-b border-[#E5E7EB] px-3 py-2 text-sm focus:outline-none"
                            placeholder="Search by ID or name"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                        {isLoading ? (
                            <div className="px-3 py-4 text-sm text-text-secondary">Loading...</div>
                        ) : filtered.length === 0 ? (
                            <div className="px-3 py-4 text-sm text-text-secondary">No employees found</div>
                        ) : (
                            filtered.map((u) => (
                                <button
                                    key={u.id}
                                    type="button"
                                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                                        value === u.employeeId ? 'bg-primary/10' : ''
                                    }`}
                                    onClick={() => {
                                        onChange(u.employeeId);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                >
                                    {u.employeeId} – {u.employee?.name ?? '—'}
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>
        </FormField>
    );
}
