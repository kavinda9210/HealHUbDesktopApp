import React from 'react';

export class MapErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // No-op: screen-level fallback only
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
