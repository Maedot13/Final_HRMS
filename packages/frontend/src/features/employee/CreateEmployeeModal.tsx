import { useState } from 'react';
import { toast } from 'react-toastify';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select, type SelectOption } from '../../components/ui/Select';
import { FormField } from '../../components/shared/FormField';
import { usersApi } from '../../api/users';

const ROLE_OPTIONS: SelectOption[] = [
    { value: 'EMPLOYEE', label: 'Employee' },
    { value: 'DEPARTMENT_HEAD', label: 'Department Head' },
    { value: 'HR_OFFICER', label: 'HR Officer' },
    { value: 'ADMIN', label: 'Admin' },
    { value: 'FINANCE_OFFICER', label: 'Finance Officer' },
    { value: 'RECRUITMENT_COMMITTEE', label: 'Recruitment Committee' },
];

export interface CreateEmployeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    departments: { id: number; name: string }[];
}

export function CreateEmployeeModal({
    isOpen,
    onClose,
    departments,
}: CreateEmployeeModalProps) {
    const queryClient = useQueryClient();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('EMPLOYEE');
    const [departmentId, setDepartmentId] = useState<string>('');
    const [generatedCredentials, setGeneratedCredentials] = useState<{ id: string; password?: string } | null>(null);

    const createMutation = useMutation({
        mutationFn: async () => {
            const selectedDept = departments.find((d) => String(d.id) === departmentId);
            return usersApi.create({
                name,
                email,
                role,
                departmentId: departmentId ? Number(departmentId) : undefined,
                department: selectedDept ? selectedDept.name : undefined,
            });
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('Employee created successfully');
            
            // Extract the data from Axios Response
            const data = (res as any).data;
            const empId = data?.user?.employeeId || data?.user?.employee?.employeeId || 'Unknown';
            const pwd = data?.rawPassword;
            
            // If we have an ID, show the success screen rather than closing immediately
            setGeneratedCredentials({ id: empId, password: pwd });
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message || 'Failed to create employee';
            toast.error(msg);
        },
    });

    const handleClose = () => {
        setName('');
        setEmail('');
        setRole('EMPLOYEE');
        setDepartmentId('');
        setGeneratedCredentials(null);
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email) {
            toast.error('Please fill in all required fields');
            return;
        }
        createMutation.mutate();
    };

    const deptOptions: SelectOption[] = [
        { value: '', label: 'Select Department...' },
        ...departments.map((d) => ({ value: String(d.id), label: d.name })),
    ];

    if (generatedCredentials) {
        return (
            <Modal isOpen={isOpen} onClose={handleClose} title="Employee Created" size="md">
                <div className="space-y-4">
                    <div className="bg-success/10 text-success-dark p-4 rounded-xl shadow-sm border border-success/20">
                        <p className="font-semibold mb-1">Account successfully generated!</p>
                        <p className="text-sm">Please share these credentials with the employee securely. {generatedCredentials.password && 'The password is a temporary initial password and they will be forced to change it on their first login.'}</p>
                    </div>
                    
                    <div className="bg-gray-50 border border-gray-100 p-5 rounded-xl space-y-4">
                        <div>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Employee ID / Username</p>
                            <div className="bg-white px-3 py-2 border border-gray-200 rounded font-mono font-bold text-gray-900 select-all">
                                {generatedCredentials.id}
                            </div>
                        </div>
                        {generatedCredentials.password && (
                            <div>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Temporary Password</p>
                                <div className="bg-white px-3 py-2 border border-gray-200 rounded font-mono font-bold text-gray-900 select-all">
                                    {generatedCredentials.password}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-2 flex justify-end">
                        <Button variant="primary" onClick={handleClose}>
                            Done
                        </Button>
                    </div>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Add Employee" size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormField label="Full Name" htmlFor="name" required>
                    <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        required
                    />
                </FormField>

                <FormField label="Email" htmlFor="email" required>
                    <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john.doe@example.com"
                        required
                    />
                </FormField>

                <FormField label="Role" htmlFor="role">
                    <Select
                        id="role"
                        options={ROLE_OPTIONS}
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                    />
                </FormField>

                <FormField label="Department" htmlFor="department">
                    <Select
                        id="department"
                        options={deptOptions}
                        value={departmentId}
                        onChange={(e) => setDepartmentId(e.target.value)}
                    />
                </FormField>

                <div className="pt-4 flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleClose}
                        disabled={createMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        isLoading={createMutation.isPending}
                    >
                        Create Employee
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
