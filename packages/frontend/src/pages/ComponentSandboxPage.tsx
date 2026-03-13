/**
 * Phase 2 Component Sandbox
 * Preview of all design system primitives.
 * Access at /sandbox (can be removed or gated in production).
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Badge,
    Button,
    Card,
    CardHeader,
    EmptyState,
    Input,
    Modal,
    Select,
    Skeleton,
} from '../components/ui';
import { FiInbox } from 'react-icons/fi';

const demoOptions = [
    { value: 'opt1', label: 'Option 1' },
    { value: 'opt2', label: 'Option 2' },
    { value: 'opt3', label: 'Option 3', disabled: true },
];

const validationSchema = z.object({
    employeeId: z.string().min(1, 'Employee ID is required'),
    email: z.string().email('Invalid email address'),
});

type DemoFormValues = z.infer<typeof validationSchema>;

export default function ComponentSandboxPage() {
    const [modalOpen, setModalOpen] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<DemoFormValues>({
        resolver: zodResolver(validationSchema),
        defaultValues: { employeeId: '', email: '' },
    });

    return (
        <div className="min-h-screen bg-background p-8">
            <h1 className="text-2xl font-bold text-text-primary mb-2">
                Design System Sandbox
            </h1>
            <p className="text-text-secondary mb-8">
                Phase 2: Shared UI primitives and form validation patterns.
            </p>

            {/* Buttons */}
            <Card className="mb-6" padding="lg">
                <CardHeader title="Buttons" subtitle="Primary, Secondary, Danger, Info variants" />
                <div className="flex flex-wrap gap-3 mt-4">
                    <Button variant="primary">Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="danger">Danger</Button>
                    <Button variant="info">Info</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="primary" size="sm">Small</Button>
                    <Button variant="primary" size="lg">Large</Button>
                    <Button variant="primary" isLoading>Loading</Button>
                </div>
            </Card>

            {/* Badges */}
            <Card className="mb-6" padding="lg">
                <CardHeader title="Status Badges" subtitle="PENDING, APPROVED, REJECTED styling" />
                <div className="flex flex-wrap gap-2 mt-4">
                    <Badge variant="pending">PENDING</Badge>
                    <Badge variant="approved">APPROVED</Badge>
                    <Badge variant="rejected">REJECTED</Badge>
                    <Badge variant="info">INFO</Badge>
                    <Badge variant="neutral">Neutral</Badge>
                    <Badge variant="warning">Warning</Badge>
                    <Badge variant="purple">Purple</Badge>
                </div>
            </Card>

            {/* Inputs & Select */}
            <Card className="mb-6" padding="lg">
                <CardHeader title="Inputs & Select" />
                <div className="grid gap-4 mt-4 max-w-md">
                    <Input label="Standard Input" placeholder="Enter text..." />
                    <Input label="With Error" error="This field is required" defaultValue="invalid" />
                    <Input label="With Hint" hint="Your employee ID from HR" placeholder="EMP001" />
                    <Select
                        label="Select"
                        options={demoOptions}
                        placeholder="Choose an option"
                    />
                </div>
            </Card>

            {/* Form Validation (RHF + Zod) */}
            <Card className="mb-6" padding="lg">
                <CardHeader
                    title="Form Validation"
                    subtitle="React Hook Form + Zod via zodResolver"
                />
                <form
                    onSubmit={handleSubmit((data) => console.log('Submitted:', data))}
                    className="grid gap-4 mt-4 max-w-md"
                >
                    <Input
                        label="Employee ID"
                        placeholder="e.g. EMP001"
                        error={errors.employeeId?.message}
                        {...register('employeeId')}
                    />
                    <Input
                        label="Email"
                        type="email"
                        placeholder="name@example.com"
                        error={errors.email?.message}
                        {...register('email')}
                    />
                    <Button type="submit" variant="primary">
                        Submit
                    </Button>
                </form>
            </Card>

            {/* Card & Skeleton */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
                <Card padding="lg">
                    <CardHeader title="Card" subtitle="With header and content" action={<Badge variant="approved">Active</Badge>} />
                    <p className="mt-4 text-sm text-text-secondary">
                        Card content with optional header action.
                    </p>
                </Card>
                <Card padding="lg">
                    <CardHeader title="Skeleton" subtitle="Loading placeholders" />
                    <div className="mt-4 space-y-3">
                        <Skeleton height={24} width="80%" />
                        <Skeleton height={24} width="60%" />
                        <Skeleton height={24} width="90%" />
                        <Skeleton circle width={40} height={40} />
                    </div>
                </Card>
            </div>

            {/* Modal & EmptyState */}
            <div className="grid md:grid-cols-2 gap-6">
                <Card padding="lg">
                    <CardHeader title="Modal" />
                    <Button variant="primary" className="mt-4" onClick={() => setModalOpen(true)}>
                        Open Modal
                    </Button>
                </Card>
                <Card padding="lg">
                    <CardHeader title="EmptyState" />
                    <EmptyState
                        icon={<FiInbox size={24} />}
                        title="No items yet"
                        description="Get started by creating your first item."
                        actionLabel="Create Item"
                        onAction={() => {}}
                        secondaryActionLabel="Learn more"
                        onSecondaryAction={() => {}}
                    />
                </Card>
            </div>

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Example Modal"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={() => setModalOpen(false)}>
                            Confirm
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-text-secondary">
                    Modal content with footer actions. Close via overlay click or Escape.
                </p>
            </Modal>
        </div>
    );
}
