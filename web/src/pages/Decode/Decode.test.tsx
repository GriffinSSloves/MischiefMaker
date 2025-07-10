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
    // Check for specific elements by their unique text
    expect(screen.getByText('Decode Secret Message')).toBeInTheDocument();
    expect(screen.getByText('1. Choose Encoded Image')).toBeInTheDocument();
    expect(screen.getByText('2. Extract Hidden Message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decode Message' })).toBeInTheDocument();
  });
});
