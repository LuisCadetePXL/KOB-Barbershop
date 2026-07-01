'use client'

// Global error boundary — replaces the root layout entirely when an error is
// thrown in the root layout/template. Must render its own <html> and <body>.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
          backgroundColor: '#0A0A0A',
          color: '#F5F5F5',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: '1.5rem',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ color: '#888888', maxWidth: '28rem', margin: 0 }}>
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          style={{
            border: 'none',
            cursor: 'pointer',
            backgroundColor: '#C41E3A',
            color: '#F5F5F5',
            padding: '0.75rem 2rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
