import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import {
    FiGrid,
    FiLayers,
    FiUsers,
    FiCalendar,
    FiCheckSquare,
    FiBriefcase,
    FiFileText,
    FiUser,
    FiPhone,
    FiShield
} from 'react-icons/fi';

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
    icon: React.ReactNode;
}

const navItems: NavItem[] = [
    {
        label: 'Dashboard',
        to: '/',
        icon: <FiGrid className="w-4 h-4" />,
    },
    {
        label: 'Departments',
        to: '/departments',
        roles: ['ADMIN', 'HR_OFFICER'],
        icon: <FiLayers className="w-4 h-4" />,
    },
    {
        label: 'Employees',
        to: '/users',
        roles: ['ADMIN', 'HR_OFFICER', 'DEPARTMENT_HEAD'],
        icon: <FiUsers className="w-4 h-4" />,
    },
    {
        label: 'Leave',
        to: '/leave',
        roles: ['EMPLOYEE', 'DEPARTMENT_HEAD', 'HR_OFFICER'],
        icon: <FiCalendar className="w-4 h-4" />,
    },
    {
        label: 'Clearance',
        to: '/clearance',
        roles: ['ADMIN', 'HR_OFFICER'],
        icon: <FiCheckSquare className="w-4 h-4" />,
    },
    {
        label: 'Jobs',
        to: '/jobs',
        roles: ['HR_OFFICER', 'RECRUITMENT_COMMITTEE'],
        icon: <FiBriefcase className="w-4 h-4" />,
    },
    {
        label: 'Audit Logs',
        to: '/audit-logs',
        roles: ['ADMIN', 'HR_OFFICER'],
        icon: <FiFileText className="w-4 h-4" />,
    },
    {
        label: 'Org Setup',
        to: '/admin/org',
        roles: ['ADMIN'],
        icon: <FiLayers className="w-4 h-4" />,
    },
    {
        label: 'Clearance Bodies',
        to: '/admin/clearance-bodies',
        roles: ['ADMIN'],
        icon: <FiCheckSquare className="w-4 h-4" />,
    },
    {
        label: 'Privileges',
        to: '/admin/privileges',
        roles: ['ADMIN'],
        icon: <FiShield className="w-4 h-4" />,
    },
    {
        label: 'Contacts',
        to: '/contacts',
        icon: <FiPhone className="w-4 h-4" />,
    },
    {
        label: 'My Profile',
        to: '/profile',
        icon: <FiUser className="w-4 h-4" />,
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
                                        'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-primary text-white'
                                            : 'text-text-secondary hover:bg-gray-100 hover:text-text-primary',
                                    ].join(' ')
                                }
                            >
                                {item.icon}
                                {item.label}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
}

