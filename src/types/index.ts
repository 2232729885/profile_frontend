export interface UserInfo {
  id?: string
  username: string
  nickname?: string
  role?: string
}

export interface LoginResult {
  token: string
  user?: UserInfo
}

export interface PageParams {
  pageNum?: number
  pageSize?: number
  keyword?: string
  [key: string]: unknown
}
