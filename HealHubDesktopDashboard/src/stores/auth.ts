import { defineStore } from 'pinia'
import { api, ApiError } from '../lib/api'

export type UserRole = 'admin' | 'doctor' | 'patient' | 'ambulance_staff'

export type AuthUser = {
  user_id: string
  email: string
  role: UserRole
  full_name?: string
  phone?: string
}

type LoginResponse = {
  success: boolean
  access_token?: string
  refresh_token?: string
  user?: AuthUser
  message?: string
}

const LS_ACCESS = 'healhub_access_token'
const LS_REFRESH = 'healhub_refresh_token'
const LS_USER = 'healhub_user'

export function homePathForRole(role: UserRole | undefined): string {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'doctor') return '/doctor/dashboard'
  return '/login'
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    initialized: false,
    accessToken: null as string | null,
    refreshToken: null as string | null,
    user: null as AuthUser | null,
    isLoading: false,
    error: null as string | null,
  }),
  getters: {
    isAuthenticated: (s) => Boolean(s.accessToken && s.user),
    role: (s) => s.user?.role,
  },
  actions: {
    initFromStorage() {
      if (this.initialized) return
      this.initialized = true
      try {
        this.accessToken = localStorage.getItem(LS_ACCESS)
        this.refreshToken = localStorage.getItem(LS_REFRESH)
        const u = localStorage.getItem(LS_USER)
        this.user = u ? (JSON.parse(u) as AuthUser) : null
      } catch {
        this.accessToken = null
        this.refreshToken = null
        this.user = null
      }
    },

    async login(email: string, password: string) {
      this.isLoading = true
      this.error = null
      try {
        const res = await api.post<LoginResponse>('/api/auth/login', { email, password })
        if (!res.success || !res.access_token || !res.user) {
          throw new Error(res.message || 'Login failed')
        }
        this.accessToken = res.access_token
        this.refreshToken = res.refresh_token || null
        this.user = res.user

        localStorage.setItem(LS_ACCESS, this.accessToken)
        if (this.refreshToken) localStorage.setItem(LS_REFRESH, this.refreshToken)
        localStorage.setItem(LS_USER, JSON.stringify(this.user))
        return this.user
      } catch (e) {
        this.error = e instanceof ApiError ? e.message : 'Login failed'
        throw e
      } finally {
        this.isLoading = false
      }
    },

    logout() {
      this.accessToken = null
      this.refreshToken = null
      this.user = null
      this.error = null
      localStorage.removeItem(LS_ACCESS)
      localStorage.removeItem(LS_REFRESH)
      localStorage.removeItem(LS_USER)
    },

    async forgotPassword(email: string) {
      this.isLoading = true
      this.error = null
      try {
        const res = await api.post<{ success: boolean; message?: string }>('/api/auth/forgot-password', { email })
        if (!res.success) throw new Error(res.message || 'Failed to send reset code')
        return res.message || 'If the email exists, a reset code has been sent'
      } catch (e) {
        this.error = e instanceof ApiError ? e.message : 'Failed to send reset code'
        throw e
      } finally {
        this.isLoading = false
      }
    },

    async resetPassword(email: string, verificationCode: string, newPassword: string, confirmPassword: string) {
      this.isLoading = true
      this.error = null
      try {
        const res = await api.post<{ success: boolean; message?: string }>(
          '/api/auth/reset-password',
          {
            email,
            verification_code: verificationCode,
            new_password: newPassword,
            confirm_password: confirmPassword,
          },
        )
        if (!res.success) throw new Error(res.message || 'Failed to reset password')
        return res.message || 'Password reset successful'
      } catch (e) {
        this.error = e instanceof ApiError ? e.message : 'Failed to reset password'
        throw e
      } finally {
        this.isLoading = false
      }
    },
  },
})
