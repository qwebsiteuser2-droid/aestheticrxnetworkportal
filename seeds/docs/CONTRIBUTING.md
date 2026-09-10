# Contributing Guide

**AestheticRxNetwork B2B Medical Platform**

---

| Document Information | |
|---------------------|--|
| **Version** | 3.1.0 |
| **Last Updated** | January 22, 2026 |

---

Thank you for your interest in contributing to AestheticRxNetwork! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

### Our Responsibilities

- Maintain a welcoming environment
- Address conflicts constructively
- Follow through on commitments

## Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/your-username/AestheticRxNetwork_App.git
cd AestheticRxNetwork_App
```

### 2. Set Up Development Environment

Follow the [DEVELOPMENT.md](DEVELOPMENT.md) guide to set up your local environment.

### 3. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

## Development Process

### 1. Make Your Changes

- Write clean, maintainable code
- Follow existing code patterns
- Add tests for new features
- Update documentation

### 2. Test Your Changes

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

### 3. Commit Your Changes

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add new feature description"
```

## Coding Standards

### TypeScript

- **Use TypeScript** for all new code
- **Avoid `any`**: Use proper types or `unknown`
- **Enable strict mode**: Already configured
- **Use interfaces** for object shapes
- **Use enums** for constants

### Code Style

- **ESLint**: Follow ESLint rules (configured)
- **Prettier**: Use Prettier for formatting (configured)
- **Naming**: Use descriptive names
- **Functions**: Keep functions small and focused
- **Comments**: Add JSDoc for public functions

### Example Code Structure

```typescript
/**
 * Service class for handling orders
 */
export class OrderService {
  /**
   * Create a new order
   * @param orderData - Order data
   * @returns Created order
   */
  public async createOrder(orderData: CreateOrderDto): Promise<Order> {
    // Implementation
  }
}
```

### File Organization

- **Controllers**: Handle HTTP requests/responses
- **Services**: Business logic
- **Models/Entities**: Database models
- **Middleware**: Request processing
- **Utils**: Helper functions
- **Types**: TypeScript type definitions

### Naming Conventions

- **Files**: `camelCase.ts` for utilities, `PascalCase.ts` for classes
- **Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Classes**: `PascalCase`
- **Interfaces**: `PascalCase` (often prefixed with `I`)

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build process or auxiliary tool changes
- `perf`: Performance improvements
- `ci`: CI/CD changes

### Examples

```bash
feat(auth): add refresh token functionality

fix(orders): resolve payment status update issue

docs(api): update API documentation

refactor(services): simplify order processing logic
```

## Pull Request Process

### 1. Before Submitting

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Documentation updated
- [ ] No console.logs or debug code

### 2. Create Pull Request

1. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create PR on GitHub**:
   - Use clear title
   - Describe changes in detail
   - Link related issues
   - Add screenshots if UI changes

### 3. PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### 4. Review Process

- Maintainers will review your PR
- Address feedback promptly
- Keep PR focused (one feature/fix per PR)
- Update PR if requested

## Testing Requirements

### Test Coverage

- **Aim for >80% coverage**
- Test both success and error cases
- Test edge cases
- Mock external dependencies

### Writing Tests

```typescript
describe('OrderService', () => {
  describe('createOrder', () => {
    it('should create order successfully', async () => {
      // Test implementation
    });

    it('should throw error for invalid data', async () => {
      // Test implementation
    });
  });
});
```

### Test Types

- **Unit Tests**: Test individual functions/classes
- **Integration Tests**: Test API endpoints
- **E2E Tests**: Test complete user flows

## Documentation

### Code Documentation

- **JSDoc comments** for public functions
- **Inline comments** for complex logic
- **README updates** for new features

### Example JSDoc

```typescript
/**
 * Creates a new order for a user
 * @param userId - The ID of the user placing the order
 * @param orderData - The order data including products and quantities
 * @returns Promise resolving to the created order
 * @throws {Error} If user is not found or products are invalid
 */
public async createOrder(
  userId: string,
  orderData: CreateOrderDto
): Promise<Order> {
  // Implementation
}
```

## Code Review Guidelines

### For Reviewers

- Be constructive and respectful
- Focus on code, not the person
- Explain reasoning for suggestions
- Approve when satisfied

### For Authors

- Respond to all comments
- Make requested changes
- Ask questions if unclear
- Be open to feedback

## Issue Reporting

### Bug Reports

When reporting bugs, include:

- **Description**: Clear description of the bug
- **Steps to Reproduce**: Detailed steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: OS, Node version, etc.
- **Screenshots**: If applicable

### Feature Requests

When requesting features, include:

- **Description**: Clear description of the feature
- **Use Case**: Why is this needed?
- **Proposed Solution**: How should it work?
- **Alternatives**: Other solutions considered

## Getting Help

- **Documentation**: Check `docs/` directory
- **Issues**: Search existing issues
- **Discussions**: Use GitHub Discussions
- **Code Review**: Ask in PR comments

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Credited in release notes
- Appreciated by the community

## Questions?

If you have questions:
1. Check existing documentation
2. Search GitHub Issues
3. Create a new issue with the `question` label
4. Ask in PR comments

Thank you for contributing! 🎉

---

**Document Version**: 3.1.0  
**Last Updated**: January 22, 2026

