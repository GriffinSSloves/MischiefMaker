import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderWithRouterHelpers } from '../../test/renderWithRouter';
import Home from './Home';

describe('Home', () => {
  it('renders without crashing', () => {
    renderWithRouterHelpers.home(<Home />);
  });

  it('displays the main heading', () => {
    renderWithRouterHelpers.home(<Home />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('contains welcome message', () => {
    renderWithRouterHelpers.home(<Home />);
    expect(screen.getByText('Hide secret messages in pictures to send to your friends.')).toBeInTheDocument();
  });
});
