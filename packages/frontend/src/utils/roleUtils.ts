export function getRoleLabel(user: { role?: string, scope?: string, isHeadHR?: boolean, specialPrivileges?: string[] } | undefined | null): string {
    if (!user) return 'Unknown';
    
    // Explicit override checks for special privileges
    if (user.specialPrivileges?.includes('UNIVERSITY_PRESIDENT')) return 'University President';
    if (user.specialPrivileges?.includes('VICE_PRESIDENT')) return 'Academic Vice President';
    if (user.specialPrivileges?.includes('DEAN')) return 'Dean';
    if (user.specialPrivileges?.includes('DIRECTOR')) return 'Director';
    
    // Head HR takes precedence unless they are the system Super Admin
    if (user.isHeadHR && user.role !== 'SUPER_ADMIN') return 'Head HR';

    if (user.role === 'ADMIN') {
        return user.scope === 'UNIVERSITY' ? 'Super Admin' : 'Campus Admin';
    }

    // Base roles
    const roleLabels: Record<string, string> = {
        SUPER_ADMIN: 'Super Admin',
        HR_OFFICER: 'HR Officer',
        DEPARTMENT_HEAD: 'Department Head',
        FINANCE_OFFICER: 'Finance Officer',
        RECRUITMENT_COMMITTEE: 'Recruitment Committee',
        CLEARANCE_BODY: 'Clearance Body',
        EMPLOYEE: 'Employee',
    };

    return roleLabels[user.role || ''] ?? user.role ?? 'Employee';
}

export function getShortRoleLabel(user: { role?: string, scope?: string, isHeadHR?: boolean, specialPrivileges?: string[] } | undefined | null): string {
    if (!user) return 'Unknown';
    
    if (user.specialPrivileges?.includes('UNIVERSITY_PRESIDENT')) return 'President';
    if (user.specialPrivileges?.includes('VICE_PRESIDENT')) return 'AVP';
    if (user.specialPrivileges?.includes('DEAN')) return 'Dean';
    if (user.specialPrivileges?.includes('DIRECTOR')) return 'Director';
    
    if (user.isHeadHR && user.role !== 'SUPER_ADMIN') return 'Head HR';

    if (user.role === 'ADMIN') {
        return user.scope === 'UNIVERSITY' ? 'Super Admin' : 'Campus Admin';
    }

    const roleLabels: Record<string, string> = {
        SUPER_ADMIN: 'Super Admin',
        HR_OFFICER: 'HR Officer',
        DEPARTMENT_HEAD: 'Dept Head',
        FINANCE_OFFICER: 'Finance',
        RECRUITMENT_COMMITTEE: 'Recruitment',
        CLEARANCE_BODY: 'Clearance',
        EMPLOYEE: 'Employee',
    };

    return roleLabels[user.role || ''] ?? user.role ?? 'Employee';
}
