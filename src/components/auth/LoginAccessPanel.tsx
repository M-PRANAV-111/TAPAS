'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react'
import { signInDemo } from '@/lib/auth/demoAuth'
import { useLocation } from '@/components/providers/LocationProvider'
import styles from '@/components/landing/ThermalAccess.module.css'

/** Existing demo sign-in, separated from the decorative access scene. */
export function LoginAccessPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectionQuery } = useLocation()

  const roleParam = searchParams.get('role')
  const isAuthority = roleParam === 'authority'

  // Default hinted credentials based on role param
  const demoEmail = isAuthority ? 'collector@tapas.gov.in' : 'officer@tapas.gov.in'
  const demoPass = 'tapas2026'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password.trim()) {
      setError('Please enter your officer credentials.')
      return
    }

    setIsLoading(true)

    setTimeout(() => {
      const cleanEmail = email.trim().toLowerCase()
      if (
        (cleanEmail === 'officer@tapas.gov.in' || cleanEmail.includes('officer')) &&
        password === 'tapas2026'
      ) {
        signInDemo('officer')
        router.push(`/officer?${selectionQuery}`)
      } else if (
        (cleanEmail === 'collector@tapas.gov.in' ||
          cleanEmail.includes('collector') ||
          cleanEmail.includes('authority')) &&
        password === 'tapas2026'
      ) {
        signInDemo('authority')
        router.push(`/authority?${selectionQuery}`)
      } else {
        setIsLoading(false)
        setError('Invalid credentials. Check the hinted officer access credentials below.')
      }
    }, 350)
  }

  return (
    <section className={styles.formPanel} aria-labelledby="access-title">
      <div className={styles.formInner}>
        <div className={styles.formHeader}>
          <p className={styles.eyebrow}><LockKeyhole size={13} aria-hidden="true" /> RESPONSE NETWORK</p>
          <h2 id="access-title">{isAuthority ? 'Authority Command Access' : 'Officer Access'}</h2>
          <p className={styles.formSubtitle}>Sign in to your response workspace.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <fieldset disabled={isLoading} className={styles.fields}>
            <div>
              <label htmlFor="officer-id" className={styles.fieldLabel}>Officer ID or email</label>
              <input
                id="officer-id"
                type="text"
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError(null)
                }}
                placeholder={demoEmail}
                className={styles.input}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'access-error' : undefined}
              />
            </div>

            <div>
              <label htmlFor="officer-password" className={styles.fieldLabel}>Password</label>
              <div className={styles.passwordField}>
                <input
                  id="officer-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError(null)
                  }}
                  placeholder="••••••••"
                  className={`${styles.input} ${styles.passwordInput}`}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'access-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.passwordToggle}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                </button>
              </div>
              {error && <p id="access-error" role="alert" className={styles.error}>{error}</p>}
            </div>

            <button type="submit" className={styles.submitButton}>
              {isLoading ? (
                <><Loader2 size={16} className={styles.spinner} aria-hidden="true" /><span role="status">Verifying credentials…</span></>
              ) : (
                <><span>Secure sign in</span><ArrowRight size={17} aria-hidden="true" /></>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail(demoEmail)
                setPassword(demoPass)
                setError(null)
              }}
              className={styles.demoHint}
            >
              Demo access — {demoEmail} / {demoPass}
            </button>

            <div className={styles.publicLinkWrap}>
              <Link href={`/dashboard?${selectionQuery}`} className={styles.publicLink}>
                <ArrowLeft size={14} aria-hidden="true" /> Public heat advisory
              </Link>
            </div>
          </fieldset>
        </form>

        <p className={styles.attribution}>Smart India Hackathon 2026 · Ministry of Earth Sciences</p>
      </div>
    </section>
  )
}
