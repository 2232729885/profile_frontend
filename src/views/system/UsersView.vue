<template>
  <div class="system-page">
    <div class="page-header">
      <div>
        <h1>用户管理</h1>
        <p>查看用户列表、新建用户和修改角色</p>
      </div>
      <el-button type="primary" @click="openCreateDialog">新建用户</el-button>
    </div>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="users" border>
        <el-table-column prop="username" label="用户名" min-width="160" />
        <el-table-column label="显示名" min-width="160">
          <template #default="{ row }: { row: User }">{{ row.displayName || '-' }}</template>
        </el-table-column>
        <el-table-column label="角色" width="130">
          <template #default="{ row }: { row: User }">
            <el-tag :type="roleTagType(row.role)">{{ row.role }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }: { row: User }">
            <el-tag :type="row.isActive ? 'success' : 'info'">{{ row.isActive ? '激活' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="180">
          <template #default="{ row }: { row: User }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right">
          <template #default="{ row }: { row: User }">
            <el-button size="small" type="primary" @click="openRoleDialog(row)">修改角色</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="createDialogVisible" title="新建用户" width="520px">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="createForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="createForm.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="显示名" prop="displayName">
          <el-input v-model="createForm.displayName" placeholder="请输入显示名" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="createForm.role" class="full-width">
            <el-option v-for="role in roles" :key="role" :label="role" :value="role" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="createSubmitting" @click="submitCreateUser">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="roleDialogVisible" title="修改角色" width="420px">
      <el-form label-position="top">
        <el-form-item label="角色">
          <el-select v-model="roleForm.role" class="full-width">
            <el-option v-for="role in roles" :key="role" :label="role" :value="role" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="roleSubmitting" @click="submitRole">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { createUser, getUsers, updateUserRole } from '@/api/system'

type UserRole = 'admin' | 'analyst' | 'reviewer' | 'readonly'

interface User {
  id: string
  username: string
  displayName: string | null
  role: UserRole
  isActive: boolean
  createdAt: string
}

const roles: UserRole[] = ['admin', 'analyst', 'reviewer', 'readonly']
const loading = ref(false)
const users = ref<User[]>([])
const currentUser = ref<User | null>(null)

const createDialogVisible = ref(false)
const createSubmitting = ref(false)
const createFormRef = ref<FormInstance>()
const createForm = reactive({
  username: '',
  password: '',
  displayName: '',
  role: 'analyst' as UserRole
})

const createRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const roleDialogVisible = ref(false)
const roleSubmitting = ref(false)
const roleForm = reactive<{ role: UserRole }>({ role: 'analyst' })

const formatTime = (time: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-')

const roleTagType = (role: UserRole) => {
  if (role === 'admin') return 'danger'
  if (role === 'analyst') return 'primary'
  if (role === 'reviewer') return 'warning'
  return 'info'
}

const loadUsers = async () => {
  loading.value = true
  try {
    users.value = (await getUsers()) as unknown as User[]
  } catch {
    ElMessage.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

const openCreateDialog = () => {
  createForm.username = ''
  createForm.password = ''
  createForm.displayName = ''
  createForm.role = 'analyst'
  createDialogVisible.value = true
}

const submitCreateUser = async () => {
  try {
    await createFormRef.value?.validate()
  } catch {
    return
  }
  createSubmitting.value = true
  try {
    await createUser({
      username: createForm.username,
      password: createForm.password,
      displayName: createForm.displayName || null,
      role: createForm.role
    })
    ElMessage.success('用户已创建')
    createDialogVisible.value = false
    await loadUsers()
  } catch {
    ElMessage.error('创建用户失败')
  } finally {
    createSubmitting.value = false
  }
}

const openRoleDialog = (user: User) => {
  currentUser.value = user
  roleForm.role = user.role
  roleDialogVisible.value = true
}

const submitRole = async () => {
  if (!currentUser.value) return
  roleSubmitting.value = true
  try {
    await updateUserRole(currentUser.value.id, roleForm.role)
    ElMessage.success('角色已更新')
    roleDialogVisible.value = false
    await loadUsers()
  } catch {
    ElMessage.error('修改角色失败')
  } finally {
    roleSubmitting.value = false
  }
}

onMounted(() => {
  void loadUsers()
})
</script>

<style scoped>
.system-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-header h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #111827;
}

.page-header p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #6b7280;
}

.full-width {
  width: 100%;
}
</style>
