# MischiefMaker Web App

Web application for sending secret messages through pictures using steganography.

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **ShadCN UI** - Reusable component library (pending setup)
- **React Router Dom** - Client-side routing (pending setup)
- **ESLint & Prettier** - Code linting and formatting (pending setup)
- **pnpm** - Package manager
- **Vitest** - Test Framework

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
- `pnpm run test` - Run tests in watch mode
- `pnpm run test:run` - Run tests once
- `pnpm run test:ui` - Run tests with UI interface
- `pnpm run coverage` - Run tests with coverage report

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
- Place test files next to the components they test
- Use React Testing Library for component testing
- Jest-DOM matchers are available globally
