'use client';

import { Component, type ReactNode } from 'react';

interface Props { fallback: ReactNode; children: ReactNode; }
interface State { failed: boolean; }

export class SiegeErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}
