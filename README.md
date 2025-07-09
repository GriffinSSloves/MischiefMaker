# MischiefMaker

A cross-platform steganography application for hiding secret messages in images. Send covert messages to friends through seemingly innocent pictures.

## Quick Start

### Web Application

```bash
cd web/
pnpm install
pnpm run dev
```

### Mobile Development

_Mobile setup coming soon_

## Project Structure

```
/
├── docs/                  # Project documentation
├── web/                   # React web application
├── mobile/                # React Native mobile app (planned)
└── core/                  # Shared steganography
```

## Documentation

- **[Architecture](docs/architecture.md)** - System design and technical architecture
- **[Coding Standards](docs/codingStandards.md)** - Code style, naming conventions, and best practices
- **[Decision Records](docs/decisions.md)** - Key architectural and technology decisions
- **[Algorithm Specification](core/docs/algorithm.md)** - LSB steganography algorithm design and implementation details
- **[Image Technical Considerations](core/docs/image-technical-considerations.md)** - Detailed calculations, implementation examples, and technical deep-dive
- **[Current Tasks](docs/todos.md)** - Current task list and priorities
- **[Completed Tasks](docs/completed.md)** - History of completed development tasks
- **[Steganography](docs/steganography.md)** - Technical implementation details
- **[Deployment](docs/deployment.md)** - Deployment and infrastructure guides

### AI Collaboration

- **[Cursor Rules](.cursor/rules/)** - Guidelines for AI assistants working on this project

### Module Documentation

- **[Web App](web/README.md)** - React web application setup and development
- **Mobile App** - React Native setup (coming soon)
- **[Core Library](core/README.md)** - Shared utilities and algorithms
