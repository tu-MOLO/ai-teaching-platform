import type { ListResponse } from '../types/api'

export const toItem = <T>(value: unknown): T => value as T

export const toListResponse = <T>(value: unknown): ListResponse<T> => {
  return value as ListResponse<T>
}

export const toBlob = (value: unknown): Blob => value as Blob
