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
    // Check for specific elements by their unique text
    expect(screen.getByText('Encode Secret Message')).toBeInTheDocument();
    expect(screen.getByText('1. Choose Image')).toBeInTheDocument();
    expect(screen.getByText('2. Enter Secret Message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Encode Message' })).toBeInTheDocument();
  });
});
