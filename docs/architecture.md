# Architecture

## Overview

MischiefMaker is a cross-platform steganography application for hiding secret messages in images.

## Current Architecture

### Key Architectural Decisions

1. **Monorepo Structure**: Separate web/, mobile/, and core/ directories with pnpm workspace management for cross-package dependencies
2. **TypeScript First**: All code written in TypeScript for type safety across platforms
3. **Modern Tooling**: Latest stable versions of React, Vite, and TailwindCSS
4. **Modern Router Architecture**: React Router v7 with createBrowserRouter, lazy loading, and nested routes
5. **Testing Strategy**: Vitest + React Testing Library for component and unit testing
6. **Interface-Driven Design**: Platform abstraction through dependency injection with I-prefixed interfaces

### Web Application

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6.3.5
- **Routing**: React Router v7 with createBrowserRouter (modern architecture)
- **Styling**: TailwindCSS v4 with PostCSS
- **Package Manager**: pnpm
- **Status**: Complete foundation with modern router architecture

### Router Architecture

The web application uses a modern router architecture with:

- **createBrowserRouter**: Latest React Router v7 API for better performance and features
- **Lazy Loading**: Code splitting for all page components to reduce initial bundle size
- **Nested Routes**: Clean layout management with Outlet pattern
- **Path Aliases**: Vite configured with `@/` aliases for clean imports
- **Comprehensive Testing**: Full test coverage for routing behavior and navigation

## Future Architecture

### Planned Components

- **Core Library**: Platform-agnostic shared steganography utilities (works in browser, React Native, and other JS environments)
- **Mobile App**: React Native for iOS and Android
- **Web App**: Browser-based application with Canvas API for image processing

## Technical Considerations

- LSB (Least Significant Bit) manipulation for steganography

## Testing Strategy

- **Unit Testing**: Vitest for fast, lightweight testing
- **Component Testing**: React Testing Library for user-centric testing
- **Integration Testing**: Planned for steganography workflows
- **E2E Testing**: Planned for complete message encoding/decoding flows

### Test Co-location Strategy

Tests are co-located with their corresponding code using folder-based organization:

```
src/
├── components/
│   ├── Layout/
│   │   ├── Layout.tsx
│   │   └── Layout.test.tsx
│   └── ui/           # ShadCN components (no tests)
├── pages/
│   ├── Home/
│   │   ├── Home.tsx
│   │   └── Home.test.tsx
├── hooks/
│   ├── useExampleHook/
│   │   ├── useExampleHook.ts
│   │   └── useExampleHook.ts
└── lib/
    ├── exampleUtil/
    │   ├── exampleUtil.ts
    │   └── exampleUtil.test.ts
```

## Configuration Standards

### Monorepo Implementation

The project successfully uses pnpm workspaces for dependency management and shared configurations.

#### **Successfully Implemented:**

- **Prettier**: Root `.prettierrc.json` used by all packages for consistent formatting
- **ESLint**: Shared base configuration in `eslint.config.base.js` extended by platform-specific configs
- **Dependencies**: ESLint, Prettier, and TypeScript dependencies managed at the root level
- **Workspace**: pnpm workspace with automatic cross-package linking during development
- **Hot Reloading**: Changes to core library instantly reflected in web package during development

#### **Platform-Specific Configurations:**

- **Environment globals**:
  - Web: `document`, `window`, `navigator`, `localStorage`, etc. (browser APIs)
  - Core: Platform-agnostic (only `console` - available everywhere)
  - Mobile: React Native globals (future)
- **Framework plugins**:
  - Web: React, React Hooks, JSX a11y plugins + TypeScript
  - Core: TypeScript-only (no framework dependencies)
  - Mobile: React Native specific plugins (future)
- **File patterns**:
  - Web: Supports `.jsx`, `.tsx` files + ignores ShadCN UI components
  - Core: Only `.ts` files (no JSX)
  - Mobile: React Native file patterns (future)

### Monorepo Workspace Structure

```
├── .prettierrc.json              # Shared Prettier config for all packages
├── .prettierignore               # Shared ignore patterns
├── eslint.config.base.js         # Shared ESLint base configuration
├── pnpm-workspace.yaml           # Workspace configuration
├── package.json                  # Root dependencies and global scripts
├── web/
│   ├── eslint.config.js          # Extends base + React/browser-specific rules
│   └── package.json              # Web dependencies + "@mischiefmaker/core": "workspace:*"
├── core/
│   ├── eslint.config.js          # Extends base + platform-agnostic rules
│   └── package.json              # Core package configuration
└── mobile/                       # Future
    ├── eslint.config.js          # Extends base + React Native-specific rules
    └── package.json              # Mobile dependencies + core workspace link
```

**Implementation**: We use **monorepo with pnpm workspaces** for seamless cross-package development while sharing configuration where it makes sense. This provides automatic linking of the core library to web/mobile packages during development with hot reloading support.

### Core Library Platform-Agnostic Design

The core library is designed to work across all JavaScript environments:

- **No Environment Assumptions**: Doesn't assume Node.js, browser, or React Native globals
- **Dependency Injection**: Platform-specific operations (file system, image processing) injected via interfaces
- **Universal JavaScript**: Uses only standard JavaScript features available everywhere
- **Platform Adapters**: Each consuming application provides platform-specific implementations:
  - Web app provides Canvas API image processor
  - Mobile app provides React Native image processor
  - Both provide their respective file system implementations

This ensures the core steganography algorithms work identically across all platforms while leveraging platform-specific optimizations where needed.
