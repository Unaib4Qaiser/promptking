import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { syncService } from '../lib/syncService'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      console.log('Initial session check:', session?.user ? 'authenticated' : 'not authenticated')
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Trigger initial sync if user is authenticated
      if (session?.user) {
        console.log('Triggering initial sync for existing session')
        syncService.initialSync()
      }
    }).catch((error) => {
      console.log('Auth session check failed (probably Supabase not configured):', error)
      // If Supabase is not configured, just set loading to false
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        console.log('Auth state changed:', event, session?.user ? 'user present' : 'no user')
        setUser(session?.user ?? null)
        setLoading(false)
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in, triggering initial sync')
          // Trigger initial sync when user signs in
          await syncService.initialSync()
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out')
          // Could optionally clear local data here if desired
        }
      }
    )

    return () => subscription?.unsubscribe?.()
  }, [])

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  return {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  }
}
