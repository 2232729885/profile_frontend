import { defineStore } from 'pinia'
import { login as loginApi, getMe } from '@/api/auth'
import type { LoginResult, UserInfo } from '@/types'

interface AuthState {
  token: string
  user: UserInfo | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: localStorage.getItem('token') || '',
    user: null
  }),
  actions: {
    async login(username: string, password: string) {
      const result = (await loginApi(username, password)) as unknown as LoginResult
      this.token = result.token
      this.user = result.user ?? { username }
      localStorage.setItem('token', result.token)
      return result
    },
    async fetchUser() {
      this.user = (await getMe()) as unknown as UserInfo
      return this.user
    },
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('token')
    }
  }
})
