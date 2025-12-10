'use client'

export default function DebugPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Debug Page</h1>
        <p className="text-gray-700">If you can see this, the routing is working!</p>
        <div className="mt-4 space-y-2">
          <a href="/coach/test" className="block text-blue-600 hover:underline">
            → Test Page
          </a>
          <a href="/coach/login" className="block text-blue-600 hover:underline">
            → Login Page
          </a>
          <a href="/coach" className="block text-blue-600 hover:underline">
            → Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}

