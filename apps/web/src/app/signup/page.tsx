'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Attempting to sign up with:', email)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    console.log('Supabase sign up response data:', data)
    console.error('Supabase sign up response error:', error)

    if (error) {
      alert('Error signing up: ' + error.message)
    } else {
      alert(
        'Sign up successful! Please check your email to confirm your account (or disable email confirmation in Supabase settings).',
      )
      // You might want to redirect to a "please check your email" page
      router.push('/login')
    }
  }

  return (
    <form onSubmit={handleSignUp}>
      <h2>Sign Up</h2>
      <label>
        Email:
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <br />
      <label>
        Password:
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <br />
      <button type="submit">Sign Up</button>
    </form>
  )
}
