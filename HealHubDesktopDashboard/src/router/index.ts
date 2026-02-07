import type { Pinia } from 'pinia'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore, homePathForRole, type UserRole } from '../stores/auth'

import SplashPage from '../pages/SplashPage.vue'
import LoginPage from '../pages/auth/LoginPage.vue'
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage.vue'
import ResetPasswordPage from '../pages/auth/ResetPasswordPage.vue'

import AdminLayout from '../layouts/AdminLayout.vue'
import DoctorLayout from '../layouts/DoctorLayout.vue'

import AdminDashboardPage from '../pages/admin/AdminDashboardPage.vue'
import AdminDoctorsPage from '../pages/admin/AdminDoctorsPage.vue'
import AdminPatientsPage from '../pages/admin/AdminPatientsPage.vue'
import AdminAmbulancesPage from '../pages/admin/AdminAmbulancesPage.vue'
import AdminNotificationsPage from '../pages/shared/NotificationsPage.vue'

import DoctorDashboardPage from '../pages/doctor/DoctorDashboardPage.vue'
import DoctorAppointmentsPage from '../pages/doctor/DoctorAppointmentsPage.vue'
import DoctorProfilePage from '../pages/doctor/DoctorProfilePage.vue'
import DoctorNotificationsPage from '../pages/shared/NotificationsPage.vue'

type RoleMeta = { requiresAuth?: boolean; role?: UserRole }

export function createAppRouter(pinia: Pinia) {
  const routes: RouteRecordRaw[] = [
    { path: '/', name: 'splash', component: SplashPage },
    { path: '/login', name: 'login', component: LoginPage },
    { path: '/forgot-password', name: 'forgot', component: ForgotPasswordPage },
    { path: '/reset-password', name: 'reset', component: ResetPasswordPage },

    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true, role: 'admin' } satisfies RoleMeta,
      children: [
        { path: 'dashboard', component: AdminDashboardPage },
        { path: 'doctors', component: AdminDoctorsPage },
        { path: 'patients', component: AdminPatientsPage },
        { path: 'ambulances', component: AdminAmbulancesPage },
        { path: 'notifications', component: AdminNotificationsPage },
        { path: '', redirect: '/admin/dashboard' },
      ],
    },

    {
      path: '/doctor',
      component: DoctorLayout,
      meta: { requiresAuth: true, role: 'doctor' } satisfies RoleMeta,
      children: [
        { path: 'dashboard', component: DoctorDashboardPage },
        { path: 'appointments', component: DoctorAppointmentsPage },
        { path: 'notifications', component: DoctorNotificationsPage },
        { path: 'profile', component: DoctorProfilePage },
        { path: '', redirect: '/doctor/dashboard' },
      ],
    },

    { path: '/:pathMatch(.*)*', redirect: '/' },
  ]

  const router = createRouter({
    history: createWebHistory(),
    routes,
  })

  router.beforeEach((to) => {
    const auth = useAuthStore(pinia)
    auth.initFromStorage()

    if (to.path === '/') {
      return auth.isAuthenticated ? homePathForRole(auth.role) : '/login'
    }

    const meta = to.matched.find((m) => m.meta && ('requiresAuth' in m.meta || 'role' in m.meta))
      ?.meta as RoleMeta | undefined

    if (meta?.requiresAuth && !auth.isAuthenticated) {
      return { path: '/login', query: { next: to.fullPath } }
    }

    if (meta?.role && auth.role && meta.role !== auth.role) {
      return homePathForRole(auth.role)
    }
    if (meta?.role && !auth.role) {
      return '/login'
    }

    return true
  })

  return router
}
