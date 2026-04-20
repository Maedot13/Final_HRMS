/**
 * Form validation patterns using Zod.
 * Use with @hookform/resolvers/zod for React Hook Form integration.
 *
 * @example
 * import { zodResolver } from '@hookform/resolvers/zod';
 * import { z } from 'zod';
 *
 * const schema = z.object({
 *   email: z.string().email('Invalid email'),
 *   employeeId: z.string().min(1, 'Required'),
 * });
 *
 * useForm({
 *   resolver: zodResolver(schema),
 *   defaultValues: { email: '', employeeId: '' },
 * });
 */

export { z } from 'zod';
import { z } from 'zod';

export const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');
