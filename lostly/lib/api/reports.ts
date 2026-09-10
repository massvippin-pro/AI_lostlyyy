import { apiRequest } from './client'
import type { Report, CreateReportInput } from '@/types/lost-found'

export async function listReports(params?: {
  type?: 'LOST' | 'FOUND'
  category?: string
  location?: string
  limit?: number
}): Promise<Report[]> {
  const query = new URLSearchParams()
  if (params?.type) query.append('type', params.type)
  if (params?.category) query.append('category', params.category)
  if (params?.location) query.append('location', params.location)
  if (params?.limit) query.append('limit', String(params.limit))

  const queryString = query.toString()
  const path = `/reports${queryString ? `?${queryString}` : ''}`
  return apiRequest<Report[]>(path)
}

export async function createReport(input: CreateReportInput): Promise<Report> {
  return apiRequest<Report>('/reports', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getReport(id: string): Promise<Report> {
  return apiRequest<Report>(`/reports/${id}`)
}

export async function deleteReport(id: string): Promise<void> {
  await apiRequest<any>(`/reports/${id}`, {
    method: 'DELETE',
  })
}
