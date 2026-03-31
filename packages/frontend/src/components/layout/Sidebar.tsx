import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

type Role =
    | 'ADMIN'
    | 'HR_OFFICER'
    | 'DEPARTMENT_HEAD'
    | 'FINANCE_OFFICER'
    | 'RECRUITMENT_COMMITTEE'
    | 'EMPLOYEE';

interface NavItem {
    label: string;
    to: string;
    roles?: Role[];
}

const navItems: NavItem[] = [
    {
        label: 'Dashboard',
        to: '/',
    },
    {
        label: 'Campuses',
        to: '/campuses',
        roles: ['ADMIN'],
    },
    {
        label: 'Departments',
        to: '/departments',
        roles: ['ADMIN', 'HR_OFFICER'],
    },
    {
        label: 'Employees',
        to: '/users',
        roles: ['ADMIN', 'HR_OFFICER', 'DEPARTMENT_HEAD'],
    },
    {
        label: 'Leave',
        to: '/leave',
        roles: ['EMPLOYEE', 'DEPARTMENT_HEAD', 'HR_OFFICER'],
    },
    {
        label: 'Clearance',
        to: '/clearance',
        roles: ['ADMIN', 'HR_OFFICER'],
    },
    {
        label: 'Jobs',
        to: '/jobs',
        roles: ['ADMIN', 'HR_OFFICER', 'RECRUITMENT_COMMITTEE'],
    },
    {
        label: 'My Profile',
        to: '/profile',
    },
];

export function Sidebar() {
    const user = useAuthStore((state) => state.user);

    const filteredItems = navItems.filter((item) => {
        if (!item.roles || !user) return true;
        return item.roles.includes(user.role as Role);
    });

    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="h-14 flex items-center px-4 border-b border-gray-100">
                <span className="text-sm font-semibold text-primary">HRMS</span>
            </div>
            <nav className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-1 px-2">
                    {filteredItems.map((item) => (
                        <li key={item.to}>
                            <NavLink
                                to={item.to}
                                end={item.to === '/'}
                                className={({ isActive }) =>
                                    [
                                        'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-primary text-white'
                                            : 'text-text-secondary hover:bg-gray-100 hover:text-text-primary',
                                    ].join(' ')
                                }
                            >
                                {item.label}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
}

