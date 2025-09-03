'use client'

import { Suspense } from 'react'
import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Log In to FakeMyRide</h1>
        <Suspense fallback={<div>Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}