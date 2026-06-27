import * as React from 'react'

type ErrorBoundaryProps = {
  children: React.ReactNode
  fallbackClassName?: string
}

type ErrorBoundaryState = {
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <main className={this.props.fallbackClassName ?? 'container auth-container'}>
          <section className="auth-card">
            <h1>Gabim</h1>
            <p className="muted" style={{ margin: '8px 0 0' }}>
              {this.state.error.message || 'Diçka shkoi keq. Rifresko faqen.'}
            </p>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
