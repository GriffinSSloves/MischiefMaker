import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderWithRouterHelpers } from '../../test/renderWithRouter';
import Encode from './Encode';

describe('Encode', () => {
  it('renders without crashing', () => {
    renderWithRouterHelpers.encode(<Encode />);
  });

  it('displays the main heading', () => {
    renderWithRouterHelpers.encode(<Encode />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('contains the encode form or interface elements', () => {
    renderWithRouterHelpers.encode(<Encode />);
    // This test will need to be updated when the actual encode interface is implemented
    expect(screen.getByText(/encode/i)).toBeInTheDocument();
  });
});
