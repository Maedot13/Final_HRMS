# Local Development Setup (No Docker)

Since Docker can be resource-intensive, here is how to run the HRMS backend natively on your Linux machine.

## Prerequisites

You need to install the following services directly on your machine.

### 1. Install Node.js (via NVM recommended)
```bash
# Verify installation
node -v # Should be v18+
npm -v
```

### 2. Install & Configure Redis
Redis is used for caching and session management.

```bash
# Install
sudo apt update
sudo apt install redis-server

# Start service
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verify
redis-cli ping # Should return "PONG"
```

### 3. Database Setup (Choose One)

#### Option A: Using Neon (Recommended for you)
Since you are already using Neon, you don't need to install a local Postgres server.

1.  **Get Connection String**: Go to your Neon dashboard and copy the connection string (e.g., `postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/hrms?sslmode=require`).
2.  **Update .env**:
    ```env
    DATABASE_URL="your-neon-connection-string"
    ```
3.  **Install Client (Optional)**:
    It's helpful to have `psql` to check your DB, but not strictly required if you use Neon's dashboard.
    ```bash
    sudo apt install postgresql-client
    ```

#### Option B: Local PostgreSQL
If you want to work offline:

```bash
# Install
sudo apt install postgresql postgresql-contrib

# Start service
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

#### Setup Database User (Local Only)
By default, Postgres creates a `postgres` user. We need to set a password or create a new user that matches your `.env` config.

```bash
# Switch to postgres user
sudo -i -u postgres

# Access prompt
psql

# Inside SQL prompt:
# 1. Change password for 'postgres' user to 'postgres' (matches default .env)
ALTER USER postgres PASSWORD 'postgres';

# 2. Create the database
CREATE DATABASE hrms;

# Exit
\q
exit
```

## Running the Project

1.  **Environment Variables**:
    Ensure your `.env` file in `packages/backend/` points to localhost:
    ```env
    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hrms?schema=public"
    REDIS_URL="redis://localhost:6379"
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Run with Setup Script**:
    We have added a convenience script to check your tools and start the server.
    ```bash
    npm run dev:local
    ```

    Or manually:
    ```bash
    # Generate Prisma Client
    npm run prisma:generate -w @hrms/backend
    
    # Run Migrations
    npm run prisma:migrate -w @hrms/backend
    
    # Start Dev Server
    npm run dev -w @hrms/backend
    ```
