import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api/users';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
    FiPhone,
    FiMail,
    FiSearch,
    FiUser,
    FiBriefcase,
    FiX,
} from 'react-icons/fi';
import type { UserListItem } from '../types';

interface ContactCard {
    id: number;
    name: string;
    employeeId: string;
    email: string;
    role: string;
    position?: string;
    department?: string;
    phone?: string;
    officeLocation?: string;
}

function extractPhone(contactInfo: unknown): string | undefined {
    if (!contactInfo || typeof contactInfo !== 'object') return undefined;
    return (contactInfo as Record<string, string>).phone;
}

function buildContacts(users: UserListItem[]): ContactCard[] {
    return users
        .filter((u) => u.employee)
        .map((u) => ({
            id: u.id,
            name: u.employee!.name,
            employeeId: u.employeeId,
            email: u.email,
            role: u.role,
            position: u.employee!.position,
            department: u.employee!.deptLegacy ?? u.employee!.department,
            phone: extractPhone((u.employee as any)?.contactInfo),
        }));
}

const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Admin',
    HR_OFFICER: 'HR Officer',
    DEPARTMENT_HEAD: 'Dept Head',
    FINANCE_OFFICER: 'Finance',
    RECRUITMENT_COMMITTEE: 'Recruitment',
    EMPLOYEE: 'Employee',
};

const ROLE_VARIANT: Record<string, 'info' | 'approved' | 'rejected' | 'neutral' | 'warning'> = {
    ADMIN: 'rejected',
    HR_OFFICER: 'info',
    DEPARTMENT_HEAD: 'warning',
    FINANCE_OFFICER: 'approved',
    RECRUITMENT_COMMITTEE: 'neutral',
    EMPLOYEE: 'neutral',
};

function ContactDetailPanel({
    contact,
    onClose,
}: {
    contact: ContactCard;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-[fadeIn_0.15s_ease]">
                {/* Header gradient */}
                <div className="h-24 bg-gradient-to-br from-primary/80 to-primary" />
                {/* Avatar */}
                <div className="flex justify-center -mt-12 relative z-10">
                    <div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center">
                        <span className="text-2xl font-bold text-primary">
                            {contact.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                >
                    <FiX className="w-4 h-4" />
                </button>
                <div className="px-6 pb-6 pt-3 text-center space-y-1">
                    <h3 className="text-lg font-bold text-gray-900">{contact.name}</h3>
                    <p className="text-sm text-gray-500">{contact.position ?? '—'}</p>
                    <Badge variant={ROLE_VARIANT[contact.role] ?? 'neutral'}>
                        {ROLE_LABELS[contact.role] ?? contact.role}
                    </Badge>
                </div>
                <div className="mx-6 mb-6 space-y-3 text-sm">
                    {contact.department && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <FiBriefcase className="w-4 h-4 text-gray-400 shrink-0" />
                            <div>
                                <span className="text-[11px] text-gray-400 uppercase tracking-wide block">
                                    Department
                                </span>
                                <span className="font-medium text-gray-700">{contact.department}</span>
                            </div>
                        </div>
                    )}
                    <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group"
                    >
                        <FiMail className="w-4 h-4 text-blue-500 shrink-0" />
                        <div>
                            <span className="text-[11px] text-blue-400 uppercase tracking-wide block">
                                Email
                            </span>
                            <span className="font-medium text-blue-700 group-hover:underline break-all">
                                {contact.email}
                            </span>
                        </div>
                    </a>
                    {contact.phone ? (
                        <a
                            href={`tel:${contact.phone}`}
                            className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors group"
                        >
                            <FiPhone className="w-4 h-4 text-green-500 shrink-0" />
                            <div>
                                <span className="text-[11px] text-green-400 uppercase tracking-wide block">
                                    Phone
                                </span>
                                <span className="font-medium text-green-700 group-hover:underline">
                                    {contact.phone}
                                </span>
                            </div>
                        </a>
                    ) : (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg opacity-50">
                            <FiPhone className="w-4 h-4 text-gray-400 shrink-0" />
                            <div>
                                <span className="text-[11px] text-gray-400 uppercase tracking-wide block">
                                    Phone
                                </span>
                                <span className="text-gray-500 italic text-xs">Not provided</span>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <FiUser className="w-4 h-4 text-gray-400 shrink-0" />
                        <div>
                            <span className="text-[11px] text-gray-400 uppercase tracking-wide block">
                                Employee ID
                            </span>
                            <span className="font-mono text-sm font-medium text-gray-700">
                                {contact.employeeId}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ContactDirectoryPage() {
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('ALL');
    const [selected, setSelected] = useState<ContactCard | null>(null);

    const { data: usersData, isLoading } = useQuery({
        queryKey: ['contacts-directory'],
        queryFn: async () => {
            const res = await usersApi.listPaginated({ limit: 200 });
            const items: UserListItem[] = Array.isArray(res.data)
                ? res.data
                : (res.data as any)?.data ?? [];
            return buildContacts(items);
        },
        staleTime: 60_000,
    });

    const contacts = usersData ?? [];

    const departments = useMemo(() => {
        const depts = new Set<string>();
        contacts.forEach((c) => { if (c.department) depts.add(c.department); });
        return Array.from(depts).sort();
    }, [contacts]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        return contacts.filter((c) => {
            const matchesSearch =
                !q ||
                c.name.toLowerCase().includes(q) ||
                c.email.toLowerCase().includes(q) ||
                c.position?.toLowerCase().includes(q) ||
                c.department?.toLowerCase().includes(q) ||
                c.employeeId.toLowerCase().includes(q);
            const matchesDept = deptFilter === 'ALL' || c.department === deptFilter;
            return matchesSearch && matchesDept;
        });
    }, [contacts, search, deptFilter]);

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Contact Directory</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Find and contact your colleagues across the organization.
                </p>
            </div>

            {/* Filters */}
            <Card padding="sm">
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                    {/* Search */}
                    <div className="relative flex-1 w-full">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, ID, department…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <FiX className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    {/* Department filter */}
                    <select
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                        className="text-sm rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors sm:w-52 w-full"
                    >
                        <option value="ALL">All Departments</option>
                        {departments.map((d) => (
                            <option key={d} value={d}>
                                {d}
                            </option>
                        ))}
                    </select>
                    <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                        {filtered.length} contact{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </Card>

            {/* Contact Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-40 rounded-xl bg-gray-100 animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <Card>
                    <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
                        <FiUser className="w-10 h-10 opacity-30" />
                        <p className="text-sm font-medium">No contacts found</p>
                        <p className="text-xs">Try adjusting your search or filter.</p>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map((contact) => (
                        <button
                            key={contact.id}
                            onClick={() => setSelected(contact)}
                            className="text-left group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 overflow-hidden"
                        >
                            {/* top accent bar */}
                            <div className="h-1.5 bg-gradient-to-r from-primary/60 to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="p-4 space-y-3">
                                {/* Avatar + name */}
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                                        <span className="text-base font-bold text-primary">
                                            {contact.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-sm text-gray-900 truncate leading-tight">
                                            {contact.name}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {contact.position ?? '—'}
                                        </p>
                                    </div>
                                </div>

                                {/* Department */}
                                {contact.department && (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <FiBriefcase className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">{contact.department}</span>
                                    </div>
                                )}

                                {/* Email */}
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <FiMail className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                                    <span className="truncate text-blue-600">{contact.email}</span>
                                </div>

                                {/* Phone */}
                                {contact.phone && (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <FiPhone className="w-3.5 h-3.5 shrink-0 text-green-500" />
                                        <span>{contact.phone}</span>
                                    </div>
                                )}

                                {/* Role badge */}
                                <div>
                                    <Badge variant={ROLE_VARIANT[contact.role] ?? 'neutral'}>
                                        {ROLE_LABELS[contact.role] ?? contact.role}
                                    </Badge>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Detail panel */}
            {selected && (
                <ContactDetailPanel contact={selected} onClose={() => setSelected(null)} />
            )}
        </div>
    );
}
