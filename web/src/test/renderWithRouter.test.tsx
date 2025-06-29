import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderWithRouter, renderWithRouterHelpers } from './renderWithRouter';

// Simple test component
const TestComponent = ({ text = 'Test Component' }: { text?: string }) => (
  <div data-testid="test-component">{text}</div>
);

describe('renderWithRouter', () => {
  describe('renderWithRouter', () => {
    it('renders component with default route', () => {
      renderWithRouter(<TestComponent />);
      expect(screen.getByTestId('test-component')).toBeInTheDocument();
    });

    it('renders component with custom route', () => {
      renderWithRouter(<TestComponent text="Custom Route" />, { route: '/custom' });
      expect(screen.getByText('Custom Route')).toBeInTheDocument();
    });

    it('renders component with custom initial entries', () => {
      renderWithRouter(<TestComponent text="Custom Entries" />, {
        route: '/test',
        initialEntries: ['/test'],
      });
      expect(screen.getByText('Custom Entries')).toBeInTheDocument();
    });
  });

  describe('renderWithRouterHelpers', () => {
    it('home helper renders at root path', () => {
      renderWithRouterHelpers.home(<TestComponent text="Home Test" />);
      expect(screen.getByText('Home Test')).toBeInTheDocument();
    });

    it('encode helper renders at encode path', () => {
      renderWithRouterHelpers.encode(<TestComponent text="Encode Test" />);
      expect(screen.getByText('Encode Test')).toBeInTheDocument();
    });

    it('decode helper renders at decode path', () => {
      renderWithRouterHelpers.decode(<TestComponent text="Decode Test" />);
      expect(screen.getByText('Decode Test')).toBeInTheDocument();
    });
  });
});
