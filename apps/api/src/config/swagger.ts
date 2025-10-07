import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Fin-U-CH API',
      version: '0.1.0',
      description: 'Financial Management System API',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
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
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management' },
      { name: 'Companies', description: 'Company management' },
      { name: 'Articles', description: 'Articles catalog' },
      { name: 'Accounts', description: 'Accounts catalog' },
      { name: 'Departments', description: 'Departments catalog' },
      { name: 'Counterparties', description: 'Counterparties catalog' },
      { name: 'Deals', description: 'Deals catalog' },
      { name: 'Salaries', description: 'Salaries catalog' },
      { name: 'Operations', description: 'Financial operations' },
      { name: 'Plans', description: 'Budget planning' },
      { name: 'Reports', description: 'Financial reports' },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/app.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

