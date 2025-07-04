# Architecture Decision Records (ADRs)

This document tracks key architectural and technology decisions made during development.

## ADR-001: Web Framework Selection

**Date**: 2025-06-22
**Status**: Accepted
**Context**: Need to choose web framework for the steganography application
**Decision**: React 19 with TypeScript and Vite
**Rationale**:

- React 19 provides latest features and performance improvements
- TypeScript ensures type safety across the application
- Vite offers fast development experience and modern build tooling
- Strong ecosystem and community support

## ADR-002: Styling Framework

**Date**: 2025-06-22
**Status**: Accepted
**Context**: Need consistent styling approach for web application
**Decision**: TailwindCSS v4 with ShadCN UI components
**Rationale**:

- TailwindCSS provides utility-first approach for rapid development
- ShadCN UI offers high-quality, accessible components
- Good developer experience with consistent design system
- Easy to customize and extend

## ADR-003: Package Manager

**Date**: 2025-06-22  
**Status**: Accepted
**Context**: Choose package manager for dependency management
**Decision**: pnpm
**Rationale**:

- Faster installation than npm/yarn
- Efficient disk space usage with content-addressable storage
- Better security with strict dependency resolution
- Excellent workspace support for monorepo management

## ADR-004: Code Quality Tools and Modern Best Practices

**Date**: 2025-06-23
**Status**: Accepted
**Context**: Need code quality, linting, and formatting tools for consistent development
**Decision**: ESLint flat config + Prettier + Modern Best Practices Policy
**Rationale**:

- ESLint flat config (eslint.config.js) is the current standard format
- Provides better file-specific targeting and more explicit configuration
- Prettier ensures consistent code formatting across the team
- Comprehensive rules for TypeScript, React, and accessibility (jsx-a11y)
- Policy to always use current best practices and modern standards for all tooling and implementation decisions
- Helps maintain code quality and reduces technical debt

## ADR-005: Application Tone and Design Direction

**Date**: 2025-01-26
**Status**: Accepted
**Context**: Need to establish the tone and design direction for MischiefMaker
**Decision**: Playful, casual, fun-focused approach prioritizing usability over education
**Rationale**:

- MischiefMaker is primarily a tool for fun and practical use
- Users want to hide messages, not learn about steganography theory
- Casual tone makes the app more approachable and enjoyable
- Focus should be on ease of use and delightful user experience
- Avoid overly technical or educational content that might intimidate users

**Implementation Guidelines**:

- Use playful, friendly language throughout the interface
- Prioritize usability and simplicity over technical explanations
- Keep content concise and action-oriented
- Use emojis and visual elements to enhance the fun factor
- Avoid academic or overly formal tone
- **Minimal CSS approach**: Start with minimal Tailwind classes, add styling incrementally as needed
- Focus on semantic HTML structure first, then enhance with necessary styles

## ADR-006: Configuration Management Strategy

**Date**: 2025-01-26
**Status**: Accepted
**Context**: Need to decide between shared configuration (monorepo workspace) vs. duplicated configuration for ESLint, Prettier, and other tooling across web and core packages
**Decision**: Monorepo with pnpm workspaces and shared configurations where appropriate
**Rationale**:

- **Cross-package development**: Seamless consumption of core library in web/mobile packages
- **Hot reloading**: Changes to core instantly reflected in consuming packages during development
- **Shared configuration**: Reduce duplication while maintaining platform-specific customization
- **Simplified dependency management**: Workspace linking eliminates manual build/publish cycles
- **Consistent tooling**: Shared ESLint/Prettier base with platform-specific extensions

**Implementation**:

- Shared base ESLint configuration (`eslint.config.base.js`) extended by platform-specific configs
- Shared Prettier configuration (`.prettierrc.json`) at root level used by all packages
- Core dependencies (ESLint, Prettier, TypeScript tools) managed at workspace root
- Core: Platform-agnostic globals, extends base config with TypeScript-only rules
- Web: Browser globals + React/JSX support, extends base config with React-specific rules
- Workspace dependencies: `"@mischiefmaker/core": "workspace:*"` for automatic linking
- ShadCN UI components ignored in web linting (third-party code)

## Future Decisions

Additional decisions will be documented here as the project evolves:

- Core library architecture
- Mobile platform choices
- Deployment strategy
- Testing frameworks
