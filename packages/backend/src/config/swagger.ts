
import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'HRMS API Documentation',
            version: '1.0.0',
            description: 'API documentation for the HR Management System',
            contact: {
                name: 'HRMS Team',
            },
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: [
        path.join(__dirname, '../routes/*.ts'), // Path to routes
        path.join(__dirname, '../schemas/*.ts'), // Path to schemas if separate, or define in doc blocks
    ],
};

export const swaggerSpec = swaggerJsdoc(options);
