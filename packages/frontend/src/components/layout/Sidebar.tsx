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
    FiShield,
    FiTrendingUp,
    FiActivity,
} from 'react-icons/fi';

type Role =
    | 'ADMIN'
    | 'SUPER_ADMIN'
    | 'HR_OFFICER'
    | 'DEPARTMENT_HEAD'
    | 'FINANCE_OFFICER'
    | 'RECRUITMENT_COMMITTEE'
    | 'CLEARANCE_BODY'
    | 'EMPLOYEE';

interface NavItem {
    label: string;
    to: string;
    roles?: Role[];
    privileges?: string[];
    icon: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Access-control matrix — each item lists the roles that can see it.
// SUPER_ADMIN and ADMIN are NOT included in shared nav items; their pages
// are rendered in dedicated sidebar sections below.
// ---------------------------------------------------------------------------
const navItems: NavItem[] = [
    // ── Universal (all campus roles except SUPER_ADMIN & ADMIN) ──────────────
    {
        label: 'Dashboard',
        to: '/',
        roles: ['HR_OFFICER', 'DEPARTMENT_HEAD', 'FINANCE_OFFICER', 'RECRUITMENT_COMMITTEE', 'EMPLOYEE', 'CLEARANCE_BODY'],
        icon: <FiGrid className="w-4 h-4" />,
    },

    // ── HR Officer ────────────────────────────────────────────────────────────
    {
        label: 'Employees',
        to: '/users',
        roles: ['HR_OFFICER', 'DEPARTMENT_HEAD', 'ADMIN'], // ADMIN included to create HR Officers
        icon: <FiUsers className="w-4 h-4" />,
    },
    {
        label: 'Departments',
        to: '/departments',
        roles: ['HR_OFFICER'], // HR Officer manages department assignments
        icon: <FiLayers className="w-4 h-4" />,
    },
    {
        label: 'Leave',
        to: '/leave',
        roles: ['EMPLOYEE', 'HR_OFFICER', 'CLEARANCE_BODY'],
        icon: <FiCalendar className="w-4 h-4" />,
    },
    {
        label: 'Leave Approvals',
        to: '/approvals/leave',
        roles: ['DEPARTMENT_HEAD'],
        privileges: ['DEAN', 'VICE_PRESIDENT'],
        icon: <FiCheckSquare className="w-4 h-4" />,
    },
    {
        label: 'Clearance',
        to: '/clearance',
        roles: ['HR_OFFICER'],
        icon: <FiCheckSquare className="w-4 h-4" />,
    },
    {
        label: 'Body Dashboard',
        to: '/clearance-body',
        roles: ['CLEARANCE_BODY'],
        icon: <FiCheckSquare className="w-4 h-4" />,
    },

    // ── Recruitment (HR + committee + candidates) ─────────────────────────────
    // ADMIN excluded — ADMIN does not manage recruitment operations
    {
        label: 'Recruitment',
        to: '/jobs',
        roles: ['HR_OFFICER', 'RECRUITMENT_COMMITTEE', 'EMPLOYEE', 'DEPARTMENT_HEAD', 'CLEARANCE_BODY'],
        icon: <FiBriefcase className="w-4 h-4" />,
    },

    // ── HR Payroll (HR domain — not Finance, not Admin) ───────────────────────
    {
        label: 'Payroll',
        to: '/hr/payroll',
        roles: ['HR_OFFICER'],
        icon: <FiFileText className="w-4 h-4" />,
    },

    // ── Finance (Finance Officer only) ────────────────────────────────────────
    {
        label: 'Finance Reports',
        to: '/hr/finance',
        roles: ['FINANCE_OFFICER'],
        icon: <FiFileText className="w-4 h-4" />,
    },

    // ── Audit Logs (HR_OFFICER only in shared nav — ADMIN & SUPER_ADMIN have dedicated sections) ──
    {
        label: 'Audit Logs',
        to: '/audit-logs',
        roles: ['HR_OFFICER'],
        icon: <FiActivity className="w-4 h-4" />,
    },

    // ── Admin section (campus ADMIN only — SUPER_ADMIN excluded, has own section) ──
    {
        label: 'Campuses',
        to: '/campuses',
        roles: ['ADMIN'],
        icon: <FiLayers className="w-4 h-4" />,
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

    // ── Contacts directory — DEPARTMENT_HEAD only, HR Officer excluded ──────────
    {
        label: 'Contacts',
        to: '/contacts',
        roles: ['DEPARTMENT_HEAD'],
        icon: <FiPhone className="w-4 h-4" />,
    },

    // ── Self-service (all roles) ──────────────────────────────────────────────
    {
        label: 'My Profile',
        to: '/profile',
        icon: <FiUser className="w-4 h-4" />,
    },
    {
        label: 'Performance',
        to: '/evaluations',
        roles: ['EMPLOYEE', 'DEPARTMENT_HEAD', 'CLEARANCE_BODY'],
        icon: <FiTrendingUp className="w-4 h-4" />,
    },
    {
        label: 'Perf. Approvals',
        to: '/evaluations/approvals',
        roles: ['HR_OFFICER'],
        icon: <FiCheckSquare className="w-4 h-4" />,
    },
];

const activeClass = 'bg-primary text-white';
const inactiveClass = 'text-text-secondary hover:bg-gray-100 hover:text-text-primary';
const linkBase = 'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors';

export function Sidebar() {
    const user = useAuthStore((state) => state.user);

    const filteredItems = navItems.filter((item) => {
        if (!user) return false;
        // Items with no roles/privileges list are shown to everyone (e.g. My Profile)
        if (!item.roles && !item.privileges) return true;

        const hasRole = item.roles?.includes(user.role as Role);
        const hasPriv = item.privileges?.some((p) =>
            ((user as any).specialPrivileges || []).includes(p)
        );

        // Extra protection: Only show 'Campuses' and 'Privileges' to University-scoped Admins
        if (['Campuses', 'Privileges'].includes(item.label)) {
            return (hasRole || hasPriv) && user.scope === 'UNIVERSITY';
        }

        if (user.isHeadHR) {
            const excludedForHeadHR = [
                'Employees', 'Departments', 'Leave', 'Clearance', 'Recruitment', 
                'Payroll', 'Audit Logs', 'Performance', 'Perf. Approvals', 'Contacts'
            ];
            if (excludedForHeadHR.includes(item.label)) {
                return false;
            }
        }

        return hasRole || hasPriv;
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
                                end={item.to === '/' || item.to === '/evaluations'}
                                className={({ isActive }) =>
                                    `${linkBase} ${isActive ? activeClass : inactiveClass}`
                                }
                            >
                                {item.icon}
                                <span className="flex-1">
                                    {item.to === '/jobs' && (user?.role === 'EMPLOYEE' || user?.role === 'CLEARANCE_BODY')
                                        ? 'Internal Careers'
                                        : item.label}
                                </span>
                            </NavLink>
                        </li>
                    ))}

                    {/* ── Head HR section (isHeadHR flag) ──────────────────── */}
                    {user?.isHeadHR && user?.role !== 'SUPER_ADMIN' && (
                        <div className="pt-4 mt-4 border-t border-gray-200">
                            <span className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Head HR Control
                            </span>
                            <ul className="mt-2 space-y-1">
                                <li><NavLink to="/hr/employees" className={({ isActive }) => `${linkBase} ${isActive ? activeClass : inactiveClass}`}><FiUsers className="w-4 h-4" /> Employees</NavLink></li>
                                <li><NavLink to="/hr/leave/approvals" className={({ isActive }) => `${linkBase} ${isActive ? activeClass : inactiveClass}`}><FiCalendar className="w-4 h-4" /> Leave Approvals</NavLink></li>
                                <li><NavLink to="/hr/performance" className={({ isActive }) => `${linkBase} ${isActive ? activeClass : inactiveClass}`}><FiFileText className="w-4 h-4" /> Performance</NavLink></li>
                                <li><NavLink to="/hr/payroll" className={({ isActive }) => `${linkBase} ${isActive ? activeClass : inactiveClass}`}><FiGrid className="w-4 h-4" /> Payroll</NavLink></li>
                                <li><NavLink to="/hr/clearance" className={({ isActive }) => `${linkBase} ${isActive ? activeClass : inactiveClass}`}><FiCheckSquare className="w-4 h-4" /> Clearance</NavLink></li>
                                <li><NavLink to="/hr/experience" className={({ isActive }) => `${linkBase} ${isActive ? activeClass : inactiveClass}`}><FiBriefcase className="w-4 h-4" /> Experience</NavLink></li>
                                <li><NavLink to="/admin/privileges" className={({ isActive }) => `${linkBase} ${isActive ? activeClass : inactiveClass}`}><FiShield className="w-4 h-4" /> AVP Management</NavLink></li>
                            </ul>
                        </div>
                    )}

                    {/* ── SUPER_ADMIN section (system-wide, isolated) ──────── */}
                    {user?.role === 'SUPER_ADMIN' && (
                        <div className="pt-4 mt-4 border-t border-gray-200">
                            <span className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Super Admin
                            </span>
                            <ul className="mt-2 space-y-1">
                                <li><NavLink to="/super/users" className={({ isActive }) => `${linkBase} ${isActive ? activeClass : inactiveClass}`}><FiUsers className="w-4 h-4" /> Admin / HR Accounts</NavLink></li>
                                <li><NavLink to="/super/activity-logs" className={({ isActive }) => `${linkBase} ${isActive ? activeClass : inactiveClass}`}><FiActivity className="w-4 h-4" /> Activity Logs</NavLink></li>
                                <li><NavLink to="/super/campuses" className={({ isActive }) => `${linkBase} ${isActive ? activeClass : inactiveClass}`}><FiLayers className="w-4 h-4" /> Campuses</NavLink></li>
                            </ul>
                        </div>
                    )}
                </ul>
            </nav>
        </aside>
    );
}
