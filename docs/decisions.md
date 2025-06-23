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
- Good monorepo support for future expansion

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

## Future Decisions

Additional decisions will be documented here as the project evolves:
- Core library architecture
- Mobile platform choices
- Deployment strategy
- Testing frameworks