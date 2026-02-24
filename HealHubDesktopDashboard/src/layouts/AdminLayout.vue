<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const displayName = computed(() => auth.user?.full_name || auth.user?.email || 'Admin')
const initials = computed(() => {
  const name = auth.user?.full_name || auth.user?.email || 'A'
  return name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
})

type ThemeMode = 'light' | 'dark'
const theme = ref<ThemeMode>('light')

function applyTheme(next: ThemeMode) {
  theme.value = next
  document.documentElement.classList.toggle('dark', next === 'dark')
  localStorage.setItem('theme', next)
}

function initTheme() {
  const saved = (localStorage.getItem('theme') || '').toLowerCase()
  if (saved === 'dark' || saved === 'light') { applyTheme(saved as ThemeMode); return }
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  applyTheme(prefersDark ? 'dark' : 'light')
}

function toggleTheme() {
  applyTheme(theme.value === 'dark' ? 'light' : 'dark')
}

initTheme()

const isDoctorsOpen    = ref(route.path.startsWith('/admin/doctors'))
const isPatientsOpen   = ref(route.path.startsWith('/admin/patients'))
const isAmbulancesOpen = ref(route.path.startsWith('/admin/ambulances'))

watch(() => route.path, (path) => {
  if (path.startsWith('/admin/doctors'))    isDoctorsOpen.value    = true
  if (path.startsWith('/admin/patients'))   isPatientsOpen.value   = true
  if (path.startsWith('/admin/ambulances')) isAmbulancesOpen.value = true
})

const pageTitle = computed(() => {
  const p = route.path
  if (p === '/admin/dashboard')           return 'Dashboard'
  if (p.includes('/doctors/create'))      return 'Create Doctor'
  if (p.includes('/doctors'))             return 'Doctors'
  if (p.includes('/patients/create'))     return 'Create Patient'
  if (p.includes('/patients'))            return 'Patients'
  if (p.includes('/ambulances/create'))   return 'Create Ambulance Staff'
  if (p.includes('/ambulances'))          return 'Ambulances'
  if (p.includes('/notifications'))       return 'Notifications'
  if (p.includes('/profile'))             return 'My Profile'
  return 'HealHub'
})

const isDashboard = computed(() => route.path === '/admin/dashboard')

function logout() {
  auth.logout()
  router.replace('/login')
}
</script>

<template>
  <div class="shell" :data-theme="theme">

    <!-- ╔══════════════════════════════════════╗ -->
    <!-- ║  SIDEBAR                             ║ -->
    <!-- ╚══════════════════════════════════════╝ -->
    <aside class="sidebar">

      <!-- Logo -->
      <div class="sidebar-logo">
        <div class="logo-icon" aria-hidden="true">
          <!-- Medical cross -->
          <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
            <rect x="7.5" y="2" width="5" height="16" rx="2.5" fill="white"/>
            <rect x="2" y="7.5" width="16" height="5" rx="2.5" fill="white"/>
          </svg>
        </div>
        <div class="logo-text">
          <span class="logo-name">HealHub</span>
          <span class="logo-tag">Admin</span>
        </div>
      </div>

      <!-- Nav -->
      <nav class="nav" aria-label="Sidebar navigation">

        <!-- Dashboard -->
        <router-link class="nav-link" to="/admin/dashboard" title="Dashboard">
          <!-- Lucide: layout-dashboard -->
          <svg class="ni" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5"/>
            <rect x="14" y="3" width="7" height="7" rx="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5"/>
            <rect x="14" y="14" width="7" height="7" rx="1.5"/>
          </svg>
          <span class="nav-label">Dashboard</span>
        </router-link>

        <!-- Section label -->
        <div class="nav-section-label">Management</div>

        <!-- Doctors -->
        <div class="nav-group">
          <button
            type="button"
            class="nav-group-btn"
            :class="{ 'is-open': isDoctorsOpen }"
            :aria-expanded="isDoctorsOpen"
            @click="isDoctorsOpen = !isDoctorsOpen"
          >
            <!-- Lucide: stethoscope -->
            <svg class="ni" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4.8 2.3A.3.3 0 105 2H4a2 2 0 00-2 2v5a6 6 0 006 6 6 6 0 006-6V4a2 2 0 00-2-2h-1a.2.2 0 100 .3"/>
              <path d="M8 15v1a6 6 0 006 6v0a6 6 0 006-6v-4"/>
              <circle cx="20" cy="10" r="2"/>
            </svg>
            <span class="nav-label">Doctors</span>
            <svg class="nav-chevron" :class="{ 'rotated': isDoctorsOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
          <Transition name="sub">
            <div v-if="isDoctorsOpen" class="nav-sub">
              <router-link class="nav-sub-link" to="/admin/doctors">
                <svg class="si" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
                </svg>
                Manage Doctors
              </router-link>
              <router-link class="nav-sub-link" to="/admin/doctors/create">
                <svg class="si" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M20 21a8 8 0 10-16 0"/>
                  <path d="M16 19h6M19 16v6"/>
                </svg>
                Add Doctor
              </router-link>
            </div>
          </Transition>
        </div>

        <!-- Patients -->
        <div class="nav-group">
          <button
            type="button"
            class="nav-group-btn"
            :class="{ 'is-open': isPatientsOpen }"
            :aria-expanded="isPatientsOpen"
            @click="isPatientsOpen = !isPatientsOpen"
          >
            <!-- Lucide: heart-pulse -->
            <svg class="ni" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7z"/>
              <path d="M3.22 12H9.5l1.5-3 2 4.5 1.5-3H22"/>
            </svg>
            <span class="nav-label">Patients</span>
            <svg class="nav-chevron" :class="{ 'rotated': isPatientsOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
          <Transition name="sub">
            <div v-if="isPatientsOpen" class="nav-sub">
              <router-link class="nav-sub-link" to="/admin/patients">
                <svg class="si" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
                </svg>
                Manage Patients
              </router-link>
              <router-link class="nav-sub-link" to="/admin/patients/create">
                <svg class="si" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M20 21a8 8 0 10-16 0"/>
                  <path d="M16 19h6M19 16v6"/>
                </svg>
                Add Patient
              </router-link>
            </div>
          </Transition>
        </div>

        <!-- Ambulances -->
        <div class="nav-group">
          <button
            type="button"
            class="nav-group-btn"
            :class="{ 'is-open': isAmbulancesOpen }"
            :aria-expanded="isAmbulancesOpen"
            @click="isAmbulancesOpen = !isAmbulancesOpen"
          >
            <!-- Lucide: truck-medical style -->
            <svg class="ni" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 17H3a1 1 0 01-1-1V6a1 1 0 011-1h10a1 1 0 011 1v3"/>
              <path d="M14 9h4l3 3v3h-7V9z"/>
              <circle cx="7.5" cy="17.5" r="2.5"/>
              <circle cx="17.5" cy="17.5" r="2.5"/>
              <path d="M6 10h4M8 8v4"/>
            </svg>
            <span class="nav-label">Ambulances</span>
            <svg class="nav-chevron" :class="{ 'rotated': isAmbulancesOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
          <Transition name="sub">
            <div v-if="isAmbulancesOpen" class="nav-sub">
              <router-link class="nav-sub-link" to="/admin/ambulances">
                <svg class="si" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
                </svg>
                Manage Staff
              </router-link>
              <router-link class="nav-sub-link" to="/admin/ambulances/create">
                <svg class="si" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M20 21a8 8 0 10-16 0"/>
                  <path d="M16 19h6M19 16v6"/>
                </svg>
                Add Staff
              </router-link>
            </div>
          </Transition>
        </div>

        <div class="nav-section-label">System</div>

        <!-- Notifications -->
        <router-link class="nav-link" to="/admin/notifications" title="Notifications">
          <!-- Lucide: bell-ring -->
          <svg class="ni" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
            <path d="M2 8c0-2.2.7-4.3 2-6M22 8a10 10 0 00-2-6"/>
          </svg>
          <span class="nav-label">Notifications</span>
        </router-link>

      </nav>

      <!-- Bottom user panel -->
      <div class="sidebar-user">
        <router-link class="user-card" to="/admin/profile" title="View profile">
          <div class="user-avi">{{ initials }}</div>
          <div class="user-meta">
            <span class="user-name">{{ displayName }}</span>
            <span class="user-role">Administrator</span>
          </div>
          <svg class="user-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </router-link>
      </div>

    </aside>

    <!-- ╔══════════════════════════════════════╗ -->
    <!-- ║  BODY                                ║ -->
    <!-- ╚══════════════════════════════════════╝ -->
    <div class="body">

      <!-- Topbar -->
      <header class="topbar">
        <div class="topbar-left">
          <!-- Page title -->
          <h1 class="page-title">{{ pageTitle }}</h1>
        </div>

        <div class="topbar-actions">

          <!-- Theme toggle -->
          <button class="tb-btn" :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleTheme">
            <Transition name="icon-swap" mode="out-in">
              <!-- Sun icon -->
              <svg v-if="theme === 'dark'" key="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="17" height="17">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
              </svg>
              <!-- Moon icon -->
              <svg v-else key="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="17" height="17">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              </svg>
            </Transition>
          </button>

          <div class="tb-sep" aria-hidden="true"></div>

          <!-- Profile avatar -->
          <router-link class="tb-avatar" to="/admin/profile" :title="`Signed in as ${displayName}`">
            {{ initials }}
          </router-link>

          <!-- Logout -->
          <button class="tb-logout" aria-label="Sign out" @click="logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Sign out</span>
          </button>

        </div>
      </header>

      <!-- Content -->
      <main class="content" :class="{ 'content--dashboard': isDashboard }">
        <router-view v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <keep-alive>
              <component :is="Component" />
            </keep-alive>
          </Transition>
        </router-view>
      </main>

      <!-- Footer -->
      <footer class="footer">
        <span class="footer-brand">HealHub Desktop</span>
        <span class="footer-dot" aria-hidden="true"></span>
        <span>Admin Panel</span>
        <span class="footer-dot" aria-hidden="true"></span>
        <span>© {{ new Date().getFullYear() }} — All rights reserved</span>
      </footer>

    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Lora:wght@500;600&display=swap');

/* ════════════════════════════════════════════════
   DESIGN TOKENS — Light
   ════════════════════════════════════════════════ */
.shell {
  /* Brand */
  --g-500: #3da066;
  --g-600: #236B43;
  --g-400: #3da066;
  --g-100: #eaf6f0;
  --g-50:  #f4fbf7;
  --g-200: #c6e8d6;
  --g-300: #8fcfad;

  /* Surface */
  --bg-page:    #f2f7f4;
  --bg-sidebar: #ffffff;
  --bg-topbar:  #ffffff;
  --bg-footer:  #ffffff;

  /* Border */
  --border:       #daeae2;
  --border-light: #edf5f0;

  /* Text */
  --text-1:     #162820;   /* headings */
  --text-2:     #3a5c4a;   /* body */
  --text-3:     #6a8f7c;   /* muted */
  --text-4:     #9bb8a8;   /* faint / placeholders */

  /* Nav */
  --nav-hover:   #edf6f1;
  --nav-active-bg: #dff0e8;
  --nav-active-fg: #1a6040;
  --nav-active-border: #2E8B57;

  /* Shadow */
  --shadow-sm: 0 1px 2px rgba(22,40,32,0.06);
  --shadow-md: 0 4px 16px rgba(22,40,32,0.08);

  font-family: 'Nunito', sans-serif;
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-page);
  color: var(--text-2);
}

/* ════════════════════════════════════════════════
   DESIGN TOKENS — Dark
   Eye-comfortable: dark forest greens, not pure black
   ════════════════════════════════════════════════ */
.shell[data-theme="dark"] {
  --bg-page:    #111a15;
  --bg-sidebar: #161f1a;
  --bg-topbar:  #161f1a;
  --bg-footer:  #161f1a;

  --border:       #243028;
  --border-light: #1d2922;

  --g-100: color-mix(in srgb, var(--g-500) 10%, var(--bg-topbar));
  --g-200: color-mix(in srgb, var(--g-500) 16%, var(--bg-topbar));
  --g-300: color-mix(in srgb, var(--g-500) 24%, var(--bg-topbar));

  --text-1:     #d6ede1;
  --text-2:     #a8c9b5;
  --text-3:     #668070;
  --text-4:     #3d5548;

  --nav-hover:   #1c2a22;
  --nav-active-bg: #1e3327;
  --nav-active-fg: var(--g-500);
  --nav-active-border: var(--g-500);

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.4);
}

/* ════════════════════════════════════════════════
   SIDEBAR
   ════════════════════════════════════════════════ */
.sidebar {
  width: 252px;
  flex-shrink: 0;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: background 0.25s ease;
}

/* ── Logo ─────────────────────────────────────── */
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1.125rem 1rem;
  border-bottom: 1px solid var(--border-light);
}
.logo-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--g-500), var(--g-600));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(46,139,87,0.3);
}
.logo-text { display: flex; flex-direction: column; gap: 1px; }
.logo-name {
  font-family: 'Lora', serif;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-1);
  line-height: 1;
  letter-spacing: -0.01em;
}
.logo-tag {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--g-500);
}

/* ── Nav ──────────────────────────────────────── */
.nav {
  flex: 1;
  overflow-y: auto;
  padding: 0.875rem 0.625rem;
  display: flex;
  flex-direction: column;
  gap: 1px;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}
.nav::-webkit-scrollbar { width: 3px; }
.nav::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }

.nav-section-label {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-4);
  padding: 0.75rem 0.75rem 0.3rem;
}

/* Nav link (top-level router-link) */
.nav-link {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.575rem 0.75rem;
  border-radius: 8px;
  border-left: 2.5px solid transparent;
  font-size: 0.855rem;
  font-weight: 600;
  color: var(--text-3);
  text-decoration: none;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.nav-link:hover {
  background: var(--nav-hover);
  color: var(--text-1);
  border-left-color: var(--border);
}
.nav-link.router-link-active {
  background: var(--nav-active-bg);
  color: var(--nav-active-fg);
  border-left-color: var(--nav-active-border);
  font-weight: 700;
}

/* Nav group */
.nav-group { display: flex; flex-direction: column; }

.nav-group-btn {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.575rem 0.75rem;
  border-radius: 8px;
  border-left: 2.5px solid transparent;
  border-top: none; border-right: none; border-bottom: none;
  background: none;
  font-family: 'Nunito', sans-serif;
  font-size: 0.855rem;
  font-weight: 600;
  color: var(--text-3);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, color 0.15s;
}
.nav-group-btn:hover,
.nav-group-btn.is-open {
  background: var(--nav-hover);
  color: var(--text-1);
}
.nav-group-btn.is-open { border-left-color: var(--border); }

.nav-label { flex: 1; }

.nav-chevron {
  color: var(--text-4);
  flex-shrink: 0;
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.nav-chevron.rotated { transform: rotate(180deg); }

/* Sub nav */
.nav-sub {
  margin: 2px 0 4px 1.25rem;
  padding-left: 0.875rem;
  border-left: 1.5px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.nav-sub-link {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.48rem 0.625rem;
  border-radius: 7px;
  font-size: 0.815rem;
  font-weight: 600;
  color: var(--text-3);
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}
.nav-sub-link:hover { background: var(--nav-hover); color: var(--text-1); }
.nav-sub-link.router-link-active {
  background: var(--nav-active-bg);
  color: var(--nav-active-fg);
  font-weight: 700;
}

/* Icons */
.ni { width: 17px; height: 17px; flex-shrink: 0; color: inherit; opacity: 0.75; }
.si { width: 14px; height: 14px; flex-shrink: 0; color: inherit; opacity: 0.7; }
.nav-link.router-link-active .ni,
.nav-group-btn.is-open .ni,
.nav-sub-link.router-link-active .si { opacity: 1; }

/* Sub transition */
.sub-enter-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.22,1,0.36,1), max-height 0.2s ease;
  max-height: 200px;
}
.sub-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease, max-height 0.2s ease;
  max-height: 200px;
}
.sub-enter-from, .sub-leave-to {
  opacity: 0;
  transform: translateY(-6px);
  max-height: 0;
}

/* ── User panel ───────────────────────────────── */
.sidebar-user {
  padding: 0.625rem;
  border-top: 1px solid var(--border-light);
}
.user-card {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.625rem 0.75rem;
  border-radius: 10px;
  text-decoration: none;
  transition: background 0.15s;
  cursor: pointer;
}
.user-card:hover { background: var(--nav-hover); }
.user-avi {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: linear-gradient(135deg, var(--g-500), var(--g-600));
  color: white;
  font-size: 0.72rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}
.user-meta { flex: 1; min-width: 0; }
.user-name {
  display: block;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.user-role {
  display: block;
  font-size: 0.67rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--g-500);
  margin-top: 1px;
}
.user-arrow { color: var(--text-4); flex-shrink: 0; }

/* ════════════════════════════════════════════════
   BODY
   ════════════════════════════════════════════════ */
.body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* ── Topbar ───────────────────────────────────── */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.75rem;
  height: 58px;
  flex-shrink: 0;
  background: var(--bg-topbar);
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  transition: background 0.25s ease;
}

.topbar-left { display: flex; align-items: center; gap: 0.75rem; }
.topbar-actions { display: flex; align-items: center; gap: 0.5rem; }

.page-title {
  font-family: 'Lora', serif;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-1);
  margin: 0;
  letter-spacing: -0.01em;
}

.tb-sep {
  width: 1px;
  height: 22px;
  background: var(--border);
  margin: 0 0.25rem;
}

/* Theme toggle button */
.tb-btn {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: var(--bg-page);
  border: 1px solid var(--border);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-3);
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  position: relative;
  overflow: hidden;
}
.tb-btn:hover {
  background: var(--g-100);
  border-color: var(--g-300);
  color: var(--g-600);
}

/* Icon swap transition */
.icon-swap-enter-active, .icon-swap-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
  position: absolute;
}
.icon-swap-enter-from { opacity: 0; transform: rotate(-30deg) scale(0.7); }
.icon-swap-leave-to   { opacity: 0; transform: rotate(30deg) scale(0.7); }

/* Profile avatar in topbar */
.tb-avatar {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--g-100);
  border: 1.5px solid var(--g-200);
  color: var(--g-600);
  font-size: 0.7rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  letter-spacing: 0.02em;
  transition: background 0.15s, border-color 0.15s;
  cursor: pointer;
}
.tb-avatar:hover {
  background: var(--g-200);
  border-color: var(--g-300);
}

/* Logout button */
.tb-logout {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0 0.875rem;
  height: 36px;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: transparent;
  font-family: 'Nunito', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-3);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.tb-logout:hover {
  background: #fff0f0;
  border-color: #f5bcbc;
  color: #b82020;
}
.shell[data-theme="dark"] .tb-logout:hover {
  background: color-mix(in srgb, var(--g-500) 12%, var(--bg-topbar));
  border-color: color-mix(in srgb, var(--g-500) 22%, var(--border));
  color: var(--g-500);
}

/* ── Content ──────────────────────────────────── */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem 2.25rem;
  background: var(--bg-page);
  transition: background 0.25s ease;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

.shell[data-theme="dark"] .content--dashboard {
  background: color-mix(in srgb, var(--bg-page) 85%, var(--g-500));
}
.content::-webkit-scrollbar { width: 5px; }
.content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }

/* Page transition */
.page-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.page-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.page-enter-from   { opacity: 0; transform: translateY(8px); }
.page-leave-to     { opacity: 0; transform: translateY(-4px); }

/* ── Footer ───────────────────────────────────── */
.footer {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0 1.75rem;
  height: 36px;
  flex-shrink: 0;
  background: var(--bg-footer);
  border-top: 1px solid var(--border-light);
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-4);
  transition: background 0.25s ease;
}
.footer-brand { color: var(--text-3); font-weight: 700; }
.footer-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--border);
}
</style>