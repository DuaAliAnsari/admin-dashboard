import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Organization, OrganizationWithCount } from '@/types/database'

export const orgKeys = {
  all: ['organizations'] as const,
  lists: () => [...orgKeys.all, 'list'] as const,
  detail: (id: string) => [...orgKeys.all, 'detail', id] as const,
  members: (orgId: string) => [...orgKeys.all, 'members', orgId] as const,
}

export function useOrganizations() {
  return useQuery({
    queryKey: orgKeys.lists(),
    queryFn: async (): Promise<OrganizationWithCount[]> => {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          member_count:organization_members(count)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Flatten the count from PostgREST aggregate
      return (data ?? []).map((row) => ({
        ...row,
        member_count: (row.member_count as unknown as { count: number }[])[0]?.count ?? 0,
      }))
    },
  })
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: orgKeys.detail(id),
    queryFn: async (): Promise<Organization> => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useOrganizationMembers(orgId: string) {
  return useQuery({
    queryKey: orgKeys.members(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', orgId)
        .order('invited_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: !!orgId,
  })
}

export function useDeleteOrganization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('organizations').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgKeys.lists() })
    },
  })
}
