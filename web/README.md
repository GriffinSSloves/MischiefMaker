# MischiefMaker Web App

Web application for sending secret messages through pictures using steganography.

## Tech Stack

- **React 19** - UI framework ✅
- **TypeScript** - Type safety ✅
- **Vite** - Build tool and dev server ✅
- **TailwindCSS v4** - Utility-first CSS framework ✅
- **ESLint & Prettier** - Code linting and formatting ✅
- **pnpm** - Package manager ✅
- **Vitest** - Test Framework ✅

- **ShadCN UI** - Reusable component library ✅
- **React Router Dom** - Client-side routing ✅

## Pending Setup

_All core web setup is now complete! Ready for steganography feature development._

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm package manager

### Installation

1. Install dependencies:

```bash
pnpm install
```

2. Start the development server:

```bash
pnpm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## Available Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run preview` - Preview production build locally
- `pnpm run lint` - Run ESLint
- `pnpm run lint:fix` - Run ESLint with auto-fix
- `pnpm run format` - Format code with Prettier
- `pnpm run format:check` - Check code formatting
- `pnpm run test` - Run tests in watch mode
- `pnpm run test:run` - Run tests once
- `pnpm run test:ui` - Run tests with UI interface
- `pnpm run coverage` - Run tests with coverage report
- `pnpm run pre-commit` - Run all pre-commit checks (format, lint, type-check, build)

## Development Workflow

### Before Committing

Always run the pre-commit checks to ensure code quality:

```bash
pnpm run pre-commit
```

This command will:

- ✅ Check code formatting with Prettier
- ✅ Lint code with ESLint (zero warnings policy)
- ✅ Type-check with TypeScript
- ✅ Build the project to catch any build errors

If any step fails, fix the issues before committing. For formatting issues, run:

```bash
pnpm run format
```

## Code Quality

This project uses **ESLint** and **Prettier** for code quality and formatting.

### ESLint Configuration

- Uses ESLint flat config format (modern approach)
- Comprehensive rules for TypeScript, React, React Hooks, and accessibility
- See [eslint.config.js](eslint.config.js) for complete configuration

### Prettier Configuration

- Consistent code formatting with opinionated defaults
- See [.prettierrc.json](.prettierrc.json) for complete configuration

## Testing

This project uses **Vitest** for unit testing with React Testing Library for component testing.

### Running Tests

```bash
# Run tests in watch mode (recommended during development)
pnpm run test

# Run tests once (useful for CI/CD)
pnpm run test:run

# Run tests with interactive UI
pnpm run test:ui

# Run tests with coverage report
pnpm run coverage
```

### Writing Tests

- Test files should be named `*.test.tsx` or `*.test.ts`
- Tests are co-located with their code using folder-based organization
- Use React Testing Library for component testing
- Jest-DOM matchers are available globally

#### Test Organization

Tests are organized using a folder-based approach where each component, page, hook, or utility gets its own folder containing both the implementation and test:

```
src/
├── components/
│   ├── Layout/
│   │   ├── Layout.tsx
│   │   └── Layout.test.tsx
├── pages/
│   ├── Home/
│   │   ├── Home.tsx
│   │   └── Home.test.tsx
├── hooks/
│   ├── useExampleHook/
│   │   ├── useExampleHook.ts
│   │   └── useExampleHook.ts
```
