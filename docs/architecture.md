# Architecture

## Overview

MischiefMaker is a cross-platform steganography application for hiding secret messages in images.

## Current Architecture

### Web Application
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6.3.5
- **Routing**: React Router v7 with createBrowserRouter (modern architecture)
- **Styling**: TailwindCSS v4 with PostCSS
- **Package Manager**: pnpm
- **Status**: Complete foundation with modern router architecture

### Key Architectural Decisions
1. **Monorepo Structure**: Separate web/, mobile/, and core/ directories for platform-specific and shared code
2. **TypeScript First**: All code written in TypeScript for type safety across platforms
3. **Modern Tooling**: Latest stable versions of React, Vite, and TailwindCSS
4. **Modern Router Architecture**: React Router v7 with createBrowserRouter, lazy loading, and nested routes
5. **Testing Strategy**: Vitest + React Testing Library for component and unit testing

### Router Architecture
The web application uses a modern router architecture with:
- **createBrowserRouter**: Latest React Router v7 API for better performance and features
- **Lazy Loading**: Code splitting for all page components to reduce initial bundle size
- **Nested Routes**: Clean layout management with Outlet pattern
- **Path Aliases**: Vite configured with `@/` aliases for clean imports
- **Comprehensive Testing**: Full test coverage for routing behavior and navigation

## Future Architecture

### Planned Components
- **Core Library**: Shared steganography and cryptography utilities
- **Mobile App**: React Native for iOS and Android
- **Web App**: Browser-based application with Canvas API for image processing

### Data Flow
```
User Input -> Encryption -> Steganography -> Image Output
Image Input -> Steganography -> Decryption -> Message Output
```

## Technical Considerations
- Canvas API for web image manipulation
- Native image libraries for mobile platforms
- LSB (Least Significant Bit) manipulation for steganography
- End-to-end encryption before embedding messages

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