import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderWithRouterHelpers } from '../../test/renderWithRouter';
import Decode from './Decode';

describe('Decode', () => {
  it('renders without crashing', () => {
    renderWithRouterHelpers.decode(<Decode />);
  });

  it('displays the main heading', () => {
    renderWithRouterHelpers.decode(<Decode />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('contains the decode form or interface elements', () => {
    renderWithRouterHelpers.decode(<Decode />);
    // This test will need to be updated when the actual decode interface is implemented
    expect(screen.getByText(/decode/i)).toBeInTheDocument();
  });
});
