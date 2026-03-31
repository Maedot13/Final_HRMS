import { Input } from '../ui/Input';
import { Select, type SelectOption } from '../ui/Select';

const ROLE_OPTIONS: SelectOption[] = [
    { value: '', label: 'All roles' },
    { value: 'ADMIN', label: 'Admin' },
    { value: 'HR_OFFICER', label: 'HR Officer' },
    { value: 'DEPARTMENT_HEAD', label: 'Department Head' },
    { value: 'FINANCE_OFFICER', label: 'Finance Officer' },
    { value: 'RECRUITMENT_COMMITTEE', label: 'Recruitment Committee' },
    { value: 'EMPLOYEE', label: 'Employee' },
];

const STATUS_OPTIONS: SelectOption[] = [
    { value: '', label: 'All statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
];

export interface FilterState {
    search: string;
    role: string;
    status: string;
    department?: string;
}

interface ComplexFilterBarProps {
    filters: FilterState;
    onFiltersChange: (filters: FilterState) => void;
    searchPlaceholder?: string;
    departments?: { id: number; name: string }[];
}

export function ComplexFilterBar({
    filters,
    onFiltersChange,
    searchPlaceholder = 'Search by name, email, or employee ID...',
    departments,
}: ComplexFilterBarProps) {
    const setFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    const deptOptions: SelectOption[] = [
        { value: '', label: 'All departments' },
        ...(departments?.map((d) => ({
            value: String(d.id),
            label: d.name,
        })) ?? []),
    ];

    return (
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:gap-4">
            <div className="min-w-0 flex-1">
                <Input
                    placeholder={searchPlaceholder}
                    value={filters.search}
                    onChange={(e) => setFilter('search', e.target.value)}
                    className="w-full"
                />
            </div>
            <div className="flex flex-wrap gap-4 md:flex-nowrap">
                {departments && (
                    <div className="w-full md:w-48">
                        <Select
                            options={deptOptions}
                            value={filters.department ?? ''}
                            onChange={(e) => setFilter('department', e.target.value)}
                            placeholder="Department"
                        />
                    </div>
                )}
                <div className="w-full md:w-40">
                    <Select
                        options={ROLE_OPTIONS}
                        value={filters.role}
                        onChange={(e) => setFilter('role', e.target.value)}
                        placeholder="Role"
                    />
                </div>
                <div className="w-full md:w-36">
                    <Select
                        options={STATUS_OPTIONS}
                        value={filters.status}
                        onChange={(e) => setFilter('status', e.target.value)}
                        placeholder="Status"
                    />
                </div>
            </div>
        </div>
    );
}
