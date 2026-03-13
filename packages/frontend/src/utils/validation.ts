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
