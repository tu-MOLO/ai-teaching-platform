import api from './api'
import { toItem, toListResponse } from './response'

export interface Tag {
  id: string
  name: string
  description?: string
  color?: string
  created_at?: string
  updated_at?: string
}

export const getTags = async (): Promise<Tag[]> => {
  const response = await api.get('/tags')
  return toListResponse<Tag>(response).data
}

export const createTag = async (tag: { name: string; description?: string }): Promise<Tag> => {
  const response = await api.post('/tags', tag)
  return toItem<Tag>(response)
}

export const updateTag = async (id: string, tag: { name?: string; description?: string }): Promise<Tag> => {
  const response = await api.put(`/tags/${id}`, tag)
  return toItem<Tag>(response)
}

export const deleteTag = async (id: string): Promise<void> => {
  await api.delete(`/tags/${id}`)
}
