# Environment Configuration Guide

This document outlines all the environment variables required to run the HRMS Backend. These should be defined in a `.env` file at the root of `packages/backend`.

## Core Variables

| Variable | Description | Example | Default |
|----------|-------------|---------|---------|
| `NODE_ENV` | The environment the app is running in (`development`, `production`, `test`). | `development` | `development` |
| `PORT` | The port the Express server will listen on. | `3000` | `3000` |
| `CORS_ORIGIN` | The URL of the frontend application allowed to make requests. | `http://localhost:5173` | `http://localhost:5173` |

## Database Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | The connection string for the PostgreSQL database. | `postgresql://user:password@localhost:5432/hrms?schema=public` | **Yes** |

## Authentication & Security

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | A strong, random string used to sign JWT access tokens. | `super-secret-key-change-me` | **Yes** |
| `JWT_EXPIRES_IN` | The expiration time for JWT access tokens. | `15m` | `15m` |
| `REFRESH_TOKEN_SECRET` | A strong string used to sign refresh tokens. | `another-super-secret-key` | **Yes** |
| `REFRESH_TOKEN_EXPIRES_IN` | The expiration time for refresh tokens. | `7d` | `7d` |

## External Services

### Redis (Caching & Rate Limiting)
| Variable | Description | Example | Default |
|----------|-------------|---------|---------|
| `REDIS_URL` | Connection URL for the Redis server. | `redis://localhost:6379` | `redis://localhost:6379` |

### SMTP (Email Notifications)
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `SMTP_HOST` | The hostname of the SMTP server. | `smtp.mailtrap.io` | No |
| `SMTP_PORT` | The port for the SMTP server. | `2525` | No |
| `SMTP_USER` | The username for SMTP authentication. | `your_mailtrap_user` | No |
| `SMTP_PASS` | The password for SMTP authentication. | `your_mailtrap_pass` | No |
| `SMTP_FROM` | The email address used as the sender. | `noreply@hrms.university.edu` | No |
