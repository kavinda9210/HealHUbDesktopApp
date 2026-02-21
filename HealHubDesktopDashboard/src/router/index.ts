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
import AdminProfilePage from '../pages/admin/AdminProfilePage.vue'
import AdminDoctorsPage from '../pages/admin/AdminDoctorsPage.vue'
import AdminDoctorCreatePage from '../pages/admin/AdminDoctorCreatePage.vue'
import AdminDoctorViewPage from '../pages/admin/AdminDoctorViewPage.vue'
import AdminDoctorEditPage from '../pages/admin/AdminDoctorEditPage.vue'
import AdminDoctorAlertsPage from '../pages/admin/AdminDoctorAlertsPage.vue'
import AdminPatientsPage from '../pages/admin/AdminPatientsPage.vue'
import AdminPatientCreatePage from '../pages/admin/AdminPatientCreatePage.vue'
import AdminPatientViewPage from '../pages/admin/AdminPatientViewPage.vue'
import AdminPatientEditPage from '../pages/admin/AdminPatientEditPage.vue'
import AdminPatientAlertsPage from '../pages/admin/AdminPatientAlertsPage.vue'
import AdminAmbulancesPage from '../pages/admin/AdminAmbulancesPage.vue'
import AdminAmbulanceCreatePage from '../pages/admin/AdminAmbulanceCreatePage.vue'
import AdminAmbulanceViewPage from '../pages/admin/AdminAmbulanceViewPage.vue'
import AdminAmbulanceEditPage from '../pages/admin/AdminAmbulanceEditPage.vue'
import AdminAmbulanceAlertsPage from '../pages/admin/AdminAmbulanceAlertsPage.vue'
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
        { path: 'profile', component: AdminProfilePage },
        { path: 'doctors', component: AdminDoctorsPage },
        { path: 'doctors/create', component: AdminDoctorCreatePage },
        { path: 'doctors/:doctorId', component: AdminDoctorViewPage },
        { path: 'doctors/:doctorId/edit', component: AdminDoctorEditPage },
        { path: 'doctors/:doctorId/alerts', component: AdminDoctorAlertsPage },
        { path: 'patients', component: AdminPatientsPage },
        { path: 'patients/create', component: AdminPatientCreatePage },
        { path: 'patients/:patientId', component: AdminPatientViewPage },
        { path: 'patients/:patientId/edit', component: AdminPatientEditPage },
        { path: 'patients/:patientId/alerts', component: AdminPatientAlertsPage },
        { path: 'ambulances', component: AdminAmbulancesPage },
        { path: 'ambulances/create', component: AdminAmbulanceCreatePage },
        { path: 'ambulances/:ambulanceId', component: AdminAmbulanceViewPage },
        { path: 'ambulances/:ambulanceId/edit', component: AdminAmbulanceEditPage },
        { path: 'ambulances/:ambulanceId/alerts', component: AdminAmbulanceAlertsPage },
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

    // Let the splash page render; it will handle the timed redirect.
    if (to.path === '/') return true

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
