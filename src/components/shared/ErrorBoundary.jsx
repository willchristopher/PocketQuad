'use client';
import * as React from 'react';
export class ErrorBoundary extends React.Component {
    state = { hasError: false };
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    handleRetry = () => {
        this.setState({ hasError: false, error: undefined });
    };
    render() {
        if (this.state.hasError) {
            return (<div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-16 text-center">
          <h2 className="font-display text-lg font-bold text-foreground">Something went wrong</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Please try again. If the issue persists, refresh the page.
          </p>
          <button type="button" onClick={this.handleRetry} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm">
            Try Again
          </button>
        </div>);
        }
        return this.props.children;
    }
}
