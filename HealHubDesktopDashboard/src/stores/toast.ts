import { defineStore } from 'pinia'

export type ToastType = 'success' | 'error' | 'info'

export type ToastItem = {
  id: string
  type: ToastType
  message: string
  createdAt: number
}

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export const useToastStore = defineStore('toast', {
  state: () => ({
    toasts: [] as ToastItem[],
  }),
  actions: {
    show(message: string, type: ToastType = 'info', timeoutMs = 3500) {
      const id = uid()
      this.toasts.push({ id, type, message, createdAt: Date.now() })

      if (timeoutMs > 0) {
        window.setTimeout(() => {
          this.dismiss(id)
        }, timeoutMs)
      }

      return id
    },
    dismiss(id: string) {
      this.toasts = this.toasts.filter((t) => t.id !== id)
    },
    clear() {
      this.toasts = []
    },
  },
})
