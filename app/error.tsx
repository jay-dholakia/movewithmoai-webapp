'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong!</h2>
        <p className="text-gray-700 mb-4">{error.message}</p>
        {error.stack && (
          <details className="mb-4">
            <summary className="cursor-pointer text-sm text-gray-600">Stack trace</summary>
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
              {error.stack}
            </pre>
          </details>
        )}
        <div className="flex gap-4">
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try again
          </button>
          <a
            href="/coach/test"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Run Tests
          </a>
        </div>
      </div>
    </div>
  )
}

