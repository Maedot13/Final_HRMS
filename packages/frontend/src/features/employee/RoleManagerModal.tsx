import { useState } from 'react';
import { toast } from 'react-toastify';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Select, type SelectOption } from '../../components/ui/Select';
import { FormField } from '../../components/shared/FormField';

const ROLE_OPTIONS: SelectOption[] = [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'HR_OFFICER', label: 'HR Officer' },
    { value: 'DEPARTMENT_HEAD', label: 'Department Head' },
    { value: 'FINANCE_OFFICER', label: 'Finance Officer' },
    { value: 'RECRUITMENT_COMMITTEE', label: 'Recruitment Committee' },
    { value: 'EMPLOYEE', label: 'Employee' },
];

export interface RoleManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    userName: string;
    currentRole: string;
    isActive: boolean;
    onUpdateRole: (role: string) => Promise<unknown>;
    onToggleStatus: (isActive: boolean) => Promise<unknown>;
    onResetPassword: () => Promise<unknown>;
}

export function RoleManagerModal({
    isOpen,
    onClose,
    userName,
    currentRole,
    isActive,
    onUpdateRole,
    onToggleStatus,
    onResetPassword,
}: RoleManagerModalProps) {
    const [role, setRole] = useState(currentRole);
    const [roleLoading, setRoleLoading] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [pwdLoading, setPwdLoading] = useState(false);

    const handleRoleSubmit = async () => {
        if (role === currentRole) return;
        setRoleLoading(true);
        try {
            await onUpdateRole(role);
            toast.success('Role updated successfully');
            onClose();
        } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : undefined;
            toast.error(msg ?? 'Failed to update role');
        } finally {
            setRoleLoading(false);
        }
    };

    const handleToggleStatus = async () => {
        setStatusLoading(true);
        try {
            await onToggleStatus(!isActive);
            toast.success(`Account ${isActive ? 'deactivated' : 'activated'} successfully`);
            onClose();
        } catch {
            toast.error('Failed to update account status');
        } finally {
            setStatusLoading(false);
        }
    };

    const handleResetPassword = async () => {
        setPwdLoading(true);
        try {
            await onResetPassword();
            toast.success('Temporary password sent via email');
            onClose();
        } catch {
            toast.error('Failed to reset password');
        } finally {
            setPwdLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Manage ${userName}`} size="md">
            <div className="space-y-6">
                <div>
                    <FormField label="Role" htmlFor="role-select">
                        <Select
                            id="role-select"
                            options={ROLE_OPTIONS}
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                        />
                    </FormField>
                    <Button
                        size="sm"
                        className="mt-2"
                        onClick={handleRoleSubmit}
                        disabled={role === currentRole || roleLoading}
                        isLoading={roleLoading}
                    >
                        Update role
                    </Button>
                </div>

                <div className="border-t border-[#E5E7EB] pt-4">
                    <p className="text-sm font-medium text-text-primary mb-2">Status</p>
                    <p className="text-sm text-text-secondary mb-2">
                        Account is currently <strong>{isActive ? 'Active' : 'Inactive'}</strong>.
                    </p>
                    <Button
                        variant={isActive ? 'danger' : 'secondary'}
                        size="sm"
                        onClick={handleToggleStatus}
                        isLoading={statusLoading}
                    >
                        {isActive ? 'Deactivate account' : 'Activate account'}
                    </Button>
                </div>

                <div className="border-t border-[#E5E7EB] pt-4">
                    <p className="text-sm font-medium text-text-primary mb-2">Password</p>
                    <p className="text-sm text-text-secondary mb-2">
                        Reset password and send a temporary password via email.
                    </p>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleResetPassword}
                        isLoading={pwdLoading}
                    >
                        Reset password
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
