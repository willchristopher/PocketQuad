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
            return (<div className="flex flex-col items-center justify-center py-16 text-center">
          <h2 className="text-lg font-bold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Please try again. If the issue persists, refresh the page.
          </p>
          <button onClick={this.handleRetry} className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
            Try Again
          </button>
        </div>);
        }
        return this.props.children;
    }
}
