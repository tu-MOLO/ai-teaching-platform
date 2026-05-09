import api from './api'
import { toItem } from './response'

export enum NotificationType {
  SYSTEM = 'system',
  COURSE = 'course',
  HOMEWORK = 'homework',
  EXAM = 'exam',
  MESSAGE = 'message',
  REMINDER = 'reminder'
}

export interface Notification {
  id: string
  user_id: string
  title: string
  content: string
  type: NotificationType
  read: boolean
  target_id?: string
  target_type?: string
  created_at: string
  updated_at: string
}

export interface NotificationListResponse {
  data: Notification[]
  total: number
  unread_count: number
  page: number
  page_size: number
  pages: number
}

export interface NotificationStats {
  total: number
  unread: number
  read: number
  by_type: Record<string, number>
}

export interface NotificationQueryParams {
  type?: NotificationType
  read?: boolean
  page?: number
  page_size?: number
}

export const getNotifications = async (
  params: NotificationQueryParams = {}
): Promise<NotificationListResponse> => {
  const { type, read, page = 1, page_size = 20 } = params
  const queryParams = new URLSearchParams()

  if (type) queryParams.append('type', type)
  if (read !== undefined) queryParams.append('read', String(read))
  queryParams.append('page', String(page))
  queryParams.append('page_size', String(page_size))

  const response = await api.get(`/notifications?${queryParams.toString()}`)
  return toItem<NotificationListResponse>(response)
}

export const getUnreadCount = async (): Promise<number> => {
  const response = await api.get('/notifications/unread-count')
  return toItem<{ unread_count: number }>(response).unread_count
}

export const getNotificationStats = async (): Promise<NotificationStats> => {
  const response = await api.get('/notifications/stats')
  return toItem<NotificationStats>(response)
}

export const getNotificationDetail = async (id: string): Promise<Notification> => {
  const response = await api.get(`/notifications/${id}`)
  return toItem<Notification>(response)
}

export const markAsRead = async (id: string): Promise<Notification> => {
  const response = await api.put(`/notifications/${id}/read`)
  return toItem<Notification>(response)
}

export const markAllAsRead = async (): Promise<{ message: string; code: string }> => {
  const response = await api.put('/notifications/read-all')
  return toItem<{ message: string; code: string }>(response)
}

export const markBatchAsRead = async (
  ids?: string[]
): Promise<{ message: string; code: string }> => {
  const response = await api.put('/notifications/read-batch', { ids })
  return toItem<{ message: string; code: string }>(response)
}

export const deleteNotification = async (
  id: string
): Promise<{ message: string; code: string }> => {
  const response = await api.delete(`/notifications/${id}`)
  return toItem<{ message: string; code: string }>(response)
}

export const deleteAllRead = async (): Promise<{ message: string; code: string }> => {
  const response = await api.delete('/notifications/read/all')
  return toItem<{ message: string; code: string }>(response)
}

export default {
  getNotifications,
  getUnreadCount,
  getNotificationStats,
  getNotificationDetail,
  markAsRead,
  markAllAsRead,
  markBatchAsRead,
  deleteNotification,
  deleteAllRead
}
