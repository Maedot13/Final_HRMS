/**
 * HRMS API - Full OpenAPI 3.0 Specification
 * Professional documentation for all endpoints.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const openApiSpec: Record<string, any> = {
  openapi: '3.0.3',
  info: {
    title: 'HRMS API',
    version: '1.0.0',
    description: 'Human Resource Management System API for Bahir Dar University. Supports multi-campus operations with role-based access control.',
    contact: { name: 'HRMS Team' },
  },
  servers: [{ url: 'http://localhost:5000', description: 'Development' }],
  tags: [
    { name: 'Auth', description: 'Authentication and session management' },
    { name: 'Employees', description: 'Employee profile management' },
    { name: 'Leave', description: 'Leave request management' },
    { name: 'Sabbatical', description: 'Sabbatical leave requests' },
    { name: 'Clearance', description: 'Exit clearance process' },
    { name: 'Recruitment', description: 'Job postings and applications' },
    { name: 'Payroll', description: 'Payroll data' },
    { name: 'Reports', description: 'Analytics and dashboards' },
    { name: 'Users', description: 'User and role management' },
    { name: 'Notifications', description: 'User notifications' },
    { name: 'Audit', description: 'Security audit logs' },
    { name: 'Campuses', description: 'Multi-campus administration (University admin only)' },
    { name: 'Departments', description: 'Department management (Campus Admin controlled)' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string', example: 'Invalid input' },
          details: { type: 'object', additionalProperties: true, description: 'Optional detailed validation or error messages' },
          timestamp: { type: 'string', format: 'date-time' },
          requestId: { type: 'string', description: 'Unique request identifier for tracing' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          employeeId: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'HR_OFFICER', 'DEPARTMENT_HEAD', 'FINANCE_OFFICER', 'RECRUITMENT_COMMITTEE', 'EMPLOYEE'] },
          scope: { type: 'string', enum: ['CAMPUS', 'UNIVERSITY'] },
          campusId: { type: 'integer', nullable: true },
          campus: { $ref: '#/components/schemas/Campus' },
          isActive: { type: 'boolean' },
        },
      },
      Campus: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          code: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          isActive: { type: 'boolean' },
          timezone: { type: 'string' },
          employeeIdPrefix: { type: 'string', example: 'BIT' },
          employeeNumericLength: { type: 'integer', example: 4 },
          employeeSequenceCurrent: { type: 'integer', description: 'Current counter for ID generation' },
          isPatternLocked: { type: 'boolean', description: 'True if employee IDs have already been generated' },
        },
      },
      Department: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          campusId: { type: 'integer' },
          name: { type: 'string' },
          headEmployeeId: { type: 'integer', nullable: true },
          head: { $ref: '#/components/schemas/Employee' },
          _count: {
            type: 'object',
            properties: {
              employees: { type: 'integer' },
            },
          },
        },
      },
      Employee: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          employeeId: { type: 'string' },
          name: { type: 'string' },
          departmentId: { type: 'integer', nullable: true },
          department: { $ref: '#/components/schemas/Department' },
          deptLegacy: { type: 'string', description: 'Legacy string-based department name' },
          position: { type: 'string' },
          campusId: { type: 'integer' },
          userId: { type: 'integer' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        security: [],
        responses: { 200: { description: 'Service status' } },
      },
    },
    '/api/v1/csrf-token': {
      get: {
        tags: ['System'],
        summary: 'Get CSRF token',
        security: [],
        responses: { 200: { description: 'CSRF token for state-changing requests' } },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register new user',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  name: { type: 'string' },
                  departmentId: { type: 'integer', description: 'Assigned Department ID' },
                  role: { type: 'string', enum: ['EMPLOYEE', 'HR_OFFICER', 'ADMIN', 'DEPARTMENT_HEAD', 'FINANCE_OFFICER', 'RECRUITMENT_COMMITTEE'] },
                },
                description: 'NOTE: employeeId is automatically generated based on the campus configuration.',
              },
            },
          },
        },
        responses: {
          201: { description: 'User registered successfully; employeeId is generated' },
          400: { description: 'Validation error or duplicate email' },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['employeeId', 'password'],
                properties: {
                  employeeId: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful; returns token, refreshToken, user' },
          401: { description: 'Invalid credentials or inactive account' },
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        responses: { 200: { description: 'Current user details' }, 401: { description: 'Unauthorized' } },
      },
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { refreshToken: { type: 'string' } } },
            },
          },
        },
        responses: { 200: { description: 'New tokens' }, 401: { description: 'Invalid or expired refresh token' } },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout',
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { refreshToken: { type: 'string' } } },
            },
          },
        },
        responses: { 200: { description: 'Logged out successfully' } },
      },
    },
    '/api/v1/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Change the current user\'s password (Required on first login)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string' },
                  newPassword: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password changed successfully' },
          400: { description: 'Invalid input' },
          401: { description: 'Unauthorized or incorrect current password' },
        },
      },
    },
    '/api/v1/employees/{id}': {
      get: {
        tags: ['Employees'],
        summary: 'Get employee by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Employee details' }, 403: { description: 'Cross-campus access denied' }, 404: { description: 'Not found' } },
      },
      patch: {
        tags: ['Employees'],
        summary: 'Update employee',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  departmentId: { type: 'integer' },
                  position: { type: 'string' },
                  phone: { type: 'string' },
                  address: { type: 'string' },
                  emergencyContact: { type: 'object' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated employee' }, 403: { description: 'Forbidden' }, 404: { description: 'Not found' } },
      },
    },
    '/api/v1/leave': {
      get: {
        tags: ['Leave'],
        summary: 'Get my leave requests',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'List of leave requests' } },
      },
      post: {
        tags: ['Leave'],
        summary: 'Create leave request',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['leaveType', 'startDate', 'endDate', 'reason'],
                properties: {
                  leaveType: { type: 'string', enum: ['ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'UNPAID'] },
                  startDate: { type: 'string', format: 'date' },
                  endDate: { type: 'string', format: 'date' },
                  reason: { type: 'string', minLength: 5 },
                  attachmentUrl: { type: 'string', format: 'uri' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Leave request created' }, 400: { description: 'Validation error or insufficient balance' } },
      },
    },
    '/api/v1/leave/my': {
      get: {
        tags: ['Leave'],
        summary: 'Get current employee\'s leave requests (Alias for GET /api/v1/leave)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'List of leave requests' } },
      },
    },
    '/api/v1/leave/pending': {
      get: {
        tags: ['Leave'],
        summary: 'Get pending leave requests (Dept Head / HR / Admin)',
        responses: { 200: { description: 'Pending requests (campus-scoped)' } },
      },
    },
    '/api/v1/leave/{id}/approve': {
      patch: {
        tags: ['Leave'],
        summary: 'Approve leave request (Department Head)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { comment: { type: 'string' } } } } } },
        responses: { 200: { description: 'Approved' }, 403: { description: 'Cross-campus or insufficient permissions' } },
      },
    },
    '/api/v1/leave/{id}/reject': {
      patch: {
        tags: ['Leave'],
        summary: 'Reject leave request (Department Head)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['comment'], properties: { comment: { type: 'string' } } } } } },
        responses: { 200: { description: 'Rejected' }, 403: { description: 'Forbidden' } },
      },
    },
    '/api/v1/sabbatical': {
      get: {
        tags: ['Sabbatical'],
        summary: 'Get sabbatical requests',
        description: 'Requires 7+ years of service to create. Returns own requests (employee) or all for campus (HR/Admin/Dept Head).',
        responses: { 200: { description: 'List of sabbatical requests' } },
      },
      post: {
        tags: ['Sabbatical'],
        summary: 'Create sabbatical request',
        description: 'Requires 7+ years of service and no overlapping sabbatical.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['purpose', 'startDate', 'endDate', 'plan'],
                properties: {
                  purpose: { type: 'string', minLength: 10 },
                  startDate: { type: 'string', format: 'date-time' },
                  endDate: { type: 'string', format: 'date-time' },
                  plan: { type: 'string', minLength: 20 },
                  planDocumentUrl: { type: 'string', format: 'uri' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Sabbatical request created' }, 400: { description: 'Validation or eligibility error' } },
      },
    },
    '/api/v1/sabbatical/{id}/approve': {
      patch: {
        tags: ['Sabbatical'],
        summary: 'Approve sabbatical (Dept Head / HR / Admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { comment: { type: 'string' } } } } } },
        responses: { 200: { description: 'Approved' }, 403: { description: 'Cross-campus denied' } },
      },
    },
    '/api/v1/sabbatical/{id}/reject': {
      patch: {
        tags: ['Sabbatical'],
        summary: 'Reject sabbatical',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['comment'], properties: { comment: { type: 'string', minLength: 5 } } } } } },
        responses: { 200: { description: 'Rejected' }, 403: { description: 'Forbidden' } },
      },
    },
    '/api/v1/clearance/requests': {
      post: {
        tags: ['Clearance'],
        summary: 'Initiate clearance process',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['reason', 'lastWorkingDay'],
                properties: {
                  reason: { type: 'string', minLength: 10, maxLength: 500 },
                  lastWorkingDay: { type: 'string', format: 'date' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Clearance initiated' }, 400: { description: 'Validation or active clearance exists' } },
      },
    },
    '/api/v1/clearance/requests/{id}': {
      get: {
        tags: ['Clearance'],
        summary: 'Get clearance details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Clearance with checks' }, 403: { description: 'Cross-campus denied' }, 404: { description: 'Not found' } },
      },
    },
    '/api/v1/clearance/requests/{id}/approve-check': {
      patch: {
        tags: ['Clearance'],
        summary: 'Approve clearance check (Dept Head / HR / Admin / Finance Officer)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['unitId'],
                properties: { unitId: { type: 'integer' }, comment: { type: 'string' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Check approved' }, 403: { description: 'Forbidden or cross-campus' } },
      },
    },
    '/api/v1/clearance/requests/{id}/reject-check': {
      patch: {
        tags: ['Clearance'],
        summary: 'Reject clearance check (Dept Head / HR / Admin / Finance Officer)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['unitId', 'comment'],
                properties: { unitId: { type: 'integer' }, comment: { type: 'string', minLength: 10 } },
              },
            },
          },
        },
        responses: { 200: { description: 'Check rejected' }, 403: { description: 'Forbidden' } },
      },
    },
    '/api/v1/clearance/units/{unitId}/pending': {
      get: {
        tags: ['Clearance'],
        summary: 'Get pending checks for a unit (Dept Head / HR / Admin / Finance Officer)',
        parameters: [{ name: 'unitId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Pending checks (campus-scoped)' } },
      },
    },
    '/api/v1/recruitment/postings': {
      get: {
        tags: ['Recruitment'],
        summary: 'List job postings',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['OPEN', 'CLOSED'] } },
          { name: 'department', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Job postings (campus-scoped)' } },
      },
      post: {
        tags: ['Recruitment'],
        summary: 'Create job posting',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'description', 'requirements', 'department', 'position', 'deadline'],
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  requirements: { type: 'string' },
                  department: { type: 'string' },
                  position: { type: 'string' },
                  deadline: { type: 'string', format: 'date' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Job posting created' } },
      },
    },
    '/api/v1/recruitment/postings/{id}': {
      get: {
        tags: ['Recruitment'],
        summary: 'Get job posting by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Job posting details' }, 404: { description: 'Not found' } },
      },
    },
    '/api/v1/recruitment/postings/{id}/status': {
      patch: {
        tags: ['Recruitment'],
        summary: 'Update job status',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['OPEN', 'CLOSED'] } } } } } },
        responses: { 200: { description: 'Status updated' }, 404: { description: 'Not found' } },
      },
    },
    '/api/v1/recruitment/apply': {
      post: {
        tags: ['Recruitment'],
        summary: 'Apply for job',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['jobPostingId', 'coverLetter', 'cvUrl'],
                properties: {
                  jobPostingId: { type: 'integer' },
                  coverLetter: { type: 'string', minLength: 20 },
                  cvUrl: { type: 'string', format: 'uri' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Application submitted' }, 400: { description: 'Already applied or invalid' } },
      },
    },
    '/api/v1/recruitment/my-applications': {
      get: {
        tags: ['Recruitment'],
        summary: 'Get my job applications',
        responses: { 200: { description: 'List of applications' } },
      },
    },
    '/api/v1/recruitment/postings/{id}/applications': {
      get: {
        tags: ['Recruitment'],
        summary: 'Get applications for job',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'List of applications' } },
      },
    },
    '/api/v1/recruitment/applications/{id}/status': {
      patch: {
        tags: ['Recruitment'],
        summary: 'Update application status',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED'] },
                  reviewComment: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Status updated' } },
      },
    },
    '/api/v1/payroll/data-transfer': {
      get: {
        tags: ['Payroll'],
        summary: 'Get payroll data for transfer (Admin / Finance Officer)',
        parameters: [
          { name: 'month', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 12 } },
          { name: 'year', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Payroll data (campus-scoped for HR/Finance)' } },
      },
    },
    '/api/v1/reports/summary': {
      get: {
        tags: ['Reports'],
        summary: 'Dashboard summary',
        responses: { 200: { description: 'Employee counts, pending leave/sabbatical/clearance, open jobs (campus-scoped)' } },
      },
    },
    '/api/v1/reports/leave': {
      get: {
        tags: ['Reports'],
        summary: 'Leave statistics',
        responses: { 200: { description: 'Leave stats by type and status' } },
      },
    },
    '/api/v1/reports/departments': {
      get: {
        tags: ['Reports'],
        summary: 'Department statistics',
        responses: { 200: { description: 'Employee count by department' } },
      },
    },
    '/api/v1/reports/recruitment': {
      get: {
        tags: ['Reports'],
        summary: 'Recruitment statistics',
        responses: { 200: { description: 'Job posting stats' } },
      },
    },
    '/api/v1/users': {
      get: {
        tags: ['Users'],
        summary: 'List users',
        responses: { 200: { description: 'Users (campus-scoped for campus admin)' } },
      },
    },
    '/api/v1/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'User details' }, 403: { description: 'Cross-campus denied' }, 404: { description: 'Not found' } },
      },
    },
    '/api/v1/users/{id}/role': {
      patch: {
        tags: ['Users'],
        summary: 'Update user role',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['role'], properties: { role: { type: 'string', enum: ['ADMIN', 'HR_OFFICER', 'DEPARTMENT_HEAD', 'FINANCE_OFFICER', 'RECRUITMENT_COMMITTEE', 'EMPLOYEE'] } } } } } },
        responses: { 200: { description: 'Role updated' }, 403: { description: 'Forbidden' } },
      },
    },
    '/api/v1/users/{id}/status': {
      patch: {
        tags: ['Users'],
        summary: 'Toggle user active status',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['isActive'], properties: { isActive: { type: 'boolean' } } } } } },
        responses: { 200: { description: 'Status updated' }, 403: { description: 'Forbidden' } },
      },
    },
    '/api/v1/users/{id}/reset-password': {
      post: {
        tags: ['Users'],
        summary: 'Reset user password',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['password'], properties: { password: { type: 'string', minLength: 8 } } } } } },
        responses: { 200: { description: 'Password reset' }, 403: { description: 'Cross-campus denied' } },
      },
    },
    '/api/v1/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Get my notifications',
        responses: { 200: { description: 'List of notifications' } },
      },
    },
    '/api/v1/notifications/unread-count': {
      get: {
        tags: ['Notifications'],
        summary: 'Get unread count',
        responses: { 200: { description: 'Unread notification count' } },
      },
    },
    '/api/v1/notifications/read-all': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark all as read',
        responses: { 200: { description: 'Marked' } },
      },
    },
    '/api/v1/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark as read',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Marked' } },
      },
    },
    '/api/v1/audit-logs': {
      get: {
        tags: ['Audit'],
        summary: 'Get audit logs',
        parameters: [
          { name: 'userId', in: 'query', schema: { type: 'integer' } },
          { name: 'action', in: 'query', schema: { type: 'string' } },
          { name: 'entityType', in: 'query', schema: { type: 'string' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Paginated audit logs (campus-scoped)' } },
      },
    },
    '/api/v1/audit-logs/my-logs': {
      get: {
        tags: ['Audit'],
        summary: 'Get my audit logs',
        responses: { 200: { description: 'Current user audit logs' } },
      },
    },
    '/api/v1/audit-logs/export': {
      get: {
        tags: ['Audit'],
        summary: 'Export audit logs',
        responses: { 200: { description: 'JSON export (campus-scoped)' } },
      },
    },
    '/api/v1/audit-logs/{id}': {
      get: {
        tags: ['Audit'],
        summary: 'Get audit log by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Audit log' }, 403: { description: 'Cross-campus denied' }, 404: { description: 'Not found' } },
      },
    },
    '/api/v1/departments': {
      get: {
        tags: ['Departments'],
        summary: 'List departments',
        description: 'Returns all departments on the requestor\'s campus.',
        responses: { 200: { description: 'List of departments', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Department' } } } } } },
      },
      post: {
        tags: ['Departments'],
        summary: 'Create department',
        description: 'Campus Admin only.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', minLength: 2 },
                  headEmployeeId: { type: 'string', description: 'Internal employee ID to assign as head' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Department created' }, 409: { description: 'Name already exists on campus' } },
      },
    },
    '/api/v1/departments/{id}': {
      delete: {
        tags: ['Departments'],
        summary: 'Delete department',
        description: 'Only possible if department has no employees. Campus Admin only.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Deleted' }, 400: { description: 'Cannot delete department with employees' } },
      },
    },
    '/api/v1/departments/{id}/head': {
      patch: {
        tags: ['Departments'],
        summary: 'Assign/Change department head',
        description: 'Promotes new head to DEPARTMENT_HEAD and demotes old one if applicable. Campus Admin only.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['employeeId'],
                properties: { employeeId: { type: 'string' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Head assigned' }, 404: { description: 'Employee or Department not found' } },
      },
    },
    '/api/v1/campuses': {
      get: {
        tags: ['Campuses'],
        summary: 'List campuses',
        description: 'University admin only.',
        parameters: [{ name: 'active', in: 'query', schema: { type: 'string', enum: ['true', 'false'] }, description: 'Filter active only' }],
        responses: { 200: { description: 'List of campuses' } },
      },
      post: {
        tags: ['Campuses'],
        summary: 'Create campus',
        description: 'University admin only.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code', 'name', 'employeeIdPrefix', 'employeeNumericLength', 'initialAdmin'],
                properties: {
                  code: { type: 'string', description: 'Unique campus code (e.g., MAIN)' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  timezone: { type: 'string', default: 'Africa/Addis_Ababa' },
                  employeeIdPrefix: { type: 'string', example: 'BIT', description: 'Upper case letters only' },
                  employeeNumericLength: { type: 'integer', example: 4, minimum: 3, maximum: 6 },
                  initialAdmin: {
                    type: 'object',
                    required: ['employeeId', 'email', 'name'],
                    properties: {
                      employeeId: { type: 'string' },
                      email: { type: 'string', format: 'email' },
                      name: { type: 'string' },
                      password: { type: 'string', minLength: 8, description: 'Optional. Auto-generated if omitted.' },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Campus created' }, 409: { description: 'Code already exists' } },
      },
    },
    '/api/v1/campuses/{id}': {
      get: {
        tags: ['Campuses'],
        summary: 'Get campus by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Campus details' }, 404: { description: 'Not found' } },
      },
      patch: {
        tags: ['Campuses'],
        summary: 'Update campus',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  isActive: { type: 'boolean' },
                  timezone: { type: 'string' },
                  employeeIdPrefix: { type: 'string', description: 'Cannot change once IDs are generated' },
                  employeeNumericLength: { type: 'integer', description: 'Cannot change once IDs are generated' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Campus updated' }, 400: { description: 'Pattern locked or invalid input' }, 404: { description: 'Not found' } },
      },
    },
    '/api/v1/campuses/{id}/users': {
      get: {
        tags: ['Campuses'],
        summary: 'Get users in campus',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Users in campus' }, 404: { description: 'Not found' } },
      },
    },
    '/api/v1/campuses/{id}/readiness': {
      get: {
        tags: ['Campuses'],
        summary: 'Get campus activation readiness status',
        description: 'Checks if the campus has the minimum required roles and all departments have heads.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: {
            description: 'Readiness status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    isReady: { type: 'boolean' },
                    missingCampusRoles: { type: 'array', items: { type: 'string' } },
                    deptsWithoutHead: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          404: { description: 'Campus not found' },
        },
      },
    },
  },
};
