# Development Guide

**AestheticRxNetwork B2B Medical Platform**

---

| Document Information | |
|---------------------|--|
| **Version** | 3.1.0 |
| **Last Updated** | January 22, 2026 |

---

This guide provides detailed instructions for setting up and developing the AestheticRxNetwork application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- **Node.js**: 20.x or higher ([Download](https://nodejs.org/))
- **PostgreSQL**: 15 or higher ([Download](https://www.postgresql.org/download/))
- **npm**: Comes with Node.js
- **Git**: For version control

### Optional Software
- **Docker & Docker Compose**: For containerized development
- **VS Code**: Recommended IDE with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/qasimjungle/AestheticRxNetwork_App.git
cd AestheticRxNetwork_App
```

### 2. Install Dependencies

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory (copy from `env.example`):

```bash
cp env.example .env
```

**📖 Documentation:**
- **[How to Get Credentials](CREDENTIALS_GUIDE.md)** - Step-by-step guide for obtaining all API keys
- **[Deployment Environment Variables](DEPLOYMENT_ENVIRONMENT_VARIABLES.md)** - Vercel & Railway setup
- **[Environment Variables Reference](ENVIRONMENT_VARIABLES_REFERENCE.md)** - Complete variable reference

### Required Environment Variables

See **[Environment Variables Reference](ENVIRONMENT_VARIABLES_REFERENCE.md)** for the complete list of all environment variables.

**Quick local development setup:**

```env
# Minimum required for local development
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:4000/api
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgres://postgres:password@localhost:5432/aestheticrx
JWT_SECRET=your_64_char_secret
JWT_REFRESH_SECRET=your_64_char_secret
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=your_app_password
```

### Generating Secure Secrets

```bash
# Generate JWT secrets (64 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Additional Setup Guides

- **[Credentials Guide](CREDENTIALS_GUIDE.md)** - How to obtain all API keys
- **[Email Setup](EMAIL_SETUP.md)** - Gmail configuration

## Database Setup

### 1. Create PostgreSQL Database

```bash
# Using psql
psql -U postgres
CREATE DATABASE aestheticrx1;
\q
```

### 2. Run Migrations

```bash
cd backend
npm run migration:run
```

### 3. Seed Initial Data (Optional)

```bash
cd backend
npm run seed
```

This will create:
- Default admin users
- Allowed signup IDs (42001-42030)
- Sample products

**Default Admin Credentials** (change after first login):
- Email: Check `MAIN_ADMIN_EMAIL` in `.env`
- Password: `Qasim7878,,`

## Running the Application

### Option 1: Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Option 2: Manual Development Servers

#### Backend Server

```bash
cd backend
npm run dev
```

Backend will run on: http://localhost:4000

#### Frontend Server

```bash
cd frontend
npm run dev
```

Frontend will run on: http://localhost:3000

### Health Checks

- Backend Health: http://localhost:4000/health
- Frontend: http://localhost:3000

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

- Write code following the [Code Standards](#code-standards)
- Write tests for new features
- Update documentation if needed

### 3. Test Your Changes

```bash
# Backend tests
cd backend
npm test
npm run type-check
npm run lint

# Frontend tests
cd frontend
npm test
npm run type-check
npm run lint
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add new feature description"
```

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Build process or auxiliary tool changes

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Create a pull request on GitHub.

## Code Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode in `tsconfig.json`
- Avoid `any` types; use proper types or `unknown`
- Use interfaces for object shapes
- Use enums for constants

### Code Style

- Use ESLint and Prettier (configured in project)
- Follow existing code patterns
- Use meaningful variable and function names
- Add JSDoc comments for public functions
- Keep functions small and focused

### File Structure

- Controllers: Handle HTTP requests/responses
- Services: Business logic
- Models/Entities: Database models
- Middleware: Request processing
- Utils: Helper functions

### Example Controller Structure

```typescript
import { Request, Response } from 'express';
import { SomeService } from '../services/someService';

export class SomeController {
  private service: SomeService;

  constructor() {
    this.service = new SomeService();
  }

  /**
   * Get all items
   */
  public getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const items = await this.service.getAll();
      res.status(200).json({ success: true, data: items });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
}
```

## Testing

### Backend Testing

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.ts

# Watch mode
npm run test:watch
```

### Frontend Testing

```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Writing Tests

- Write unit tests for services and utilities
- Write integration tests for API endpoints
- Aim for >80% code coverage
- Test both success and error cases

## Database Migrations

### Create a Migration

```bash
cd backend
npm run migration:generate -- -n MigrationName
```

### Run Migrations

```bash
npm run migration:run
```

### Revert Migration

```bash
npm run migration:revert
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -U postgres -d aestheticrx1
```

### Port Already in Use

```bash
# Find process using port
lsof -i :4000  # Backend
lsof -i :3000  # Frontend

# Kill process
kill -9 <PID>
```

### Module Not Found Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

```bash
# Check TypeScript configuration
cd backend && npm run type-check
cd frontend && npm run type-check
```

### Database Migration Issues

```bash
# Reset database (WARNING: Deletes all data)
cd backend
npm run migration:revert
npm run migration:run
```

## Useful Commands

### Backend

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm test             # Run tests
npm run lint         # Lint code
npm run type-check   # Type check
npm run seed         # Seed database
```

### Frontend

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm test             # Run tests
npm run lint         # Lint code
npm run type-check   # Type check
```

## Getting Help

- Check existing documentation in `docs/` directory
- Review existing code for patterns
- Check GitHub Issues for known problems
- Create a new issue if you find a bug

## Next Steps

- Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand system design
- Review [API.md](API.md) for API endpoints
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for deployment instructions

---

**Document Version**: 3.1.0  
**Last Updated**: January 22, 2026

