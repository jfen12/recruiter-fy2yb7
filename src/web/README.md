# RefactorTrack Web Application

## Overview

RefactorTrack is a cloud-based Applicant Tracking System (ATS) designed specifically for technology recruiting and staffing agencies. This repository contains the frontend web application built with React, TypeScript, and Material UI.

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- VS Code >= 1.80.0 (recommended)

## Quick Start

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Copy environment template:
```bash
cp .env.example .env
```

4. Start development server:
```bash
npm run dev
```

## Technology Stack

- React v18.2.0 - UI framework
- TypeScript v5.0.0 - Type-safe programming
- Material UI v5.11.0 - Component library
- Redux Toolkit v1.9.0 - State management
- Vite v4.4.0 - Build tool
- Jest v29.5.0 - Testing framework

## Project Structure

```
src/
├── api/          # API integration layer
├── assets/       # Static assets
├── components/   # Reusable UI components
├── config/       # Application configuration
├── contexts/     # React contexts
├── hooks/        # Custom React hooks
├── interfaces/   # TypeScript interfaces
├── layouts/      # Page layouts
├── services/     # Business logic services
├── store/        # Redux store configuration
├── styles/       # Global styles and themes
└── utils/        # Utility functions
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm run test` | Run test suite |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run analyze` | Analyze bundle size |
| `npm run typecheck` | Run TypeScript checks |

## Development Guidelines

### Code Style

- Follow TypeScript best practices
- Use functional components with hooks
- Implement proper error boundaries
- Follow Material Design principles
- Write comprehensive unit tests

### State Management

- Use Redux Toolkit for global state
- Implement React Query for server state
- Use local state for component-specific data
- Follow Redux best practices for actions and reducers

### Performance Optimization

- Implement code splitting
- Use React.lazy for route-based splitting
- Optimize bundle size
- Follow React performance best practices
- Implement proper memoization

### Browser Support

- Chrome >= 90
- Firefox >= 88
- Safari >= 14
- Edge >= 90

## Testing

### Unit Testing

- Jest for test runner
- React Testing Library for component testing
- 80% minimum coverage requirement
- Run tests before commits

### Test Categories

- Unit tests for components
- Integration tests for features
- E2E tests for critical flows
- Performance tests for optimization

## Building for Production

### Build Process

1. Run type checking:
```bash
npm run typecheck
```

2. Run tests:
```bash
npm run test
```

3. Create production build:
```bash
npm run build
```

### Build Output

- Optimized bundle with code splitting
- Minified and compressed assets
- Source maps for debugging
- Modern and legacy browser builds

## Security

- Implement secure authentication flows
- Follow OWASP security guidelines
- Use secure HTTP headers
- Implement proper CORS policies
- Regular security audits

## Accessibility

- Follow WCAG 2.1 Level AA standards
- Implement proper ARIA attributes
- Ensure keyboard navigation
- Support screen readers
- Regular accessibility audits

## Performance Metrics

- First Contentful Paint < 1.5s
- Time to Interactive < 3.5s
- Lighthouse score > 90
- Bundle size < 250KB (initial load)
- Core Web Vitals compliance

## Contributing

Please read [CONTRIBUTING.md](../../CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

### Pull Request Process

1. Create feature branch
2. Update documentation
3. Run all tests
4. Submit PR for review

## Troubleshooting

### Common Issues

1. Node version mismatch
   - Solution: Use nvm to switch to correct version

2. Build failures
   - Check TypeScript errors
   - Verify dependencies
   - Clear cache and node_modules

3. Test failures
   - Check test environment
   - Verify test data
   - Check for async issues

## Support

- Create GitHub issue for bugs
- Use discussions for questions
- Check documentation first
- Follow security policy for vulnerabilities

## License

This project is proprietary and confidential. Unauthorized copying or distribution is prohibited.

## Additional Resources

- [Technical Documentation](./docs)
- [API Documentation](./docs/api)
- [Component Library](./docs/components)
- [Security Policy](../../SECURITY.md)