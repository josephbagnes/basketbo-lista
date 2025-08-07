import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, googleProvider, signInWithPopup } from '@/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { LoginForm } from '@/components/login-form'
import { FirebaseError } from 'firebase/app'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) {
      navigate('/app/home', { replace: true })
    }
  }, [user, loading, navigate])

  const handleGoogleClick = async (): Promise<void> => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      if (error instanceof FirebaseError) {
        alert('Authentication failed: ' + error.message)
      } else {
        alert('Authentication failed')
      }
    }
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <LoginForm handleGoogleAuth={handleGoogleClick} />
      </div>
    </div>
  )
}
