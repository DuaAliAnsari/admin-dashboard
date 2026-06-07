import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, ChevronRight, Loader2, Plus, Users } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useOrganizations, orgKeys } from '@/hooks/useOrganizations'
import { createOrgSchema, type CreateOrgInput } from '@/lib/schemas'
import { toast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { OrgType } from '@/types/database'

const ORG_TYPES: { value: OrgType; label: string; description: string }[] = [
  { value: 'school', label: 'School', description: 'Educational institution' },
  { value: 'nonprofit', label: 'Nonprofit', description: '501(c) tax-exempt organization' },
  { value: 'business', label: 'Business', description: 'For-profit company' },
  { value: 'government', label: 'Government', description: 'Public sector agency' },
  { value: 'healthcare', label: 'Healthcare', description: 'Medical or health services' },
]

const ORG_TYPE_LABELS: Record<OrgType, string> = {
  school: 'School',
  nonprofit: 'Nonprofit',
  business: 'Business',
  government: 'Government',
  healthcare: 'Healthcare',
}

function CreateOrgDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user } = useAuth()
  const qc = useQueryClient()

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateOrgInput>({
    resolver: zodResolver(createOrgSchema),
  })

  const selectedType = watch('type')

  const mutation = useMutation({
    mutationFn: async (data: CreateOrgInput) => {
      const { error } = await supabase.from('organizations').insert({
        name: data.name,
        type: data.type,
        description: data.description ?? null,
        created_by: user!.id,
        school_district: data.school_district ?? null,
        nonprofit_ein: data.nonprofit_ein ?? null,
        business_registration: data.business_registration ?? null,
        government_jurisdiction: data.government_jurisdiction ?? null,
        healthcare_license: data.healthcare_license ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgKeys.lists() })
      toast({ title: 'Organization created', description: 'Your new organization is ready.' })
      reset()
      onOpenChange(false)
    },
    onError: (err) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create organization',
        description: err instanceof Error ? err.message : 'Something went wrong.',
      })
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Fill in the details below. Some fields depend on organization type.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="space-y-4"
          noValidate
        >
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Organization name *</Label>
            <Input id="name" placeholder="Acme Corp" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Type *</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORG_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <div>
                          <span className="font-medium">{t.label}</span>
                          <span className="text-muted-foreground ml-2 text-xs">
                            {t.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
          </div>

          {/* Conditional type-specific fields */}
          {selectedType === 'school' && (
            <div className="space-y-1.5 rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
              <Label htmlFor="school_district">School District *</Label>
              <Input
                id="school_district"
                placeholder="e.g. Los Angeles Unified School District"
                {...register('school_district')}
              />
              {errors.school_district && (
                <p className="text-xs text-destructive">{errors.school_district.message}</p>
              )}
            </div>
          )}

          {selectedType === 'nonprofit' && (
            <div className="space-y-1.5 rounded-lg border border-green-200 bg-green-50/50 p-3 dark:border-green-900 dark:bg-green-950/20">
              <Label htmlFor="nonprofit_ein">EIN (Tax ID) *</Label>
              <Input
                id="nonprofit_ein"
                placeholder="XX-XXXXXXX"
                {...register('nonprofit_ein')}
              />
              {errors.nonprofit_ein && (
                <p className="text-xs text-destructive">{errors.nonprofit_ein.message}</p>
              )}
            </div>
          )}

          {selectedType === 'business' && (
            <div className="space-y-1.5 rounded-lg border border-purple-200 bg-purple-50/50 p-3 dark:border-purple-900 dark:bg-purple-950/20">
              <Label htmlFor="business_registration">Business Registration #</Label>
              <Input
                id="business_registration"
                placeholder="e.g. C4123456"
                {...register('business_registration')}
              />
            </div>
          )}

          {selectedType === 'government' && (
            <div className="space-y-1.5 rounded-lg border border-orange-200 bg-orange-50/50 p-3 dark:border-orange-900 dark:bg-orange-950/20">
              <Label htmlFor="government_jurisdiction">Jurisdiction</Label>
              <Input
                id="government_jurisdiction"
                placeholder="e.g. City of Austin, TX"
                {...register('government_jurisdiction')}
              />
            </div>
          )}

          {selectedType === 'healthcare' && (
            <div className="space-y-1.5 rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-900 dark:bg-red-950/20">
              <Label htmlFor="healthcare_license">Healthcare License #</Label>
              <Input
                id="healthcare_license"
                placeholder="e.g. HL-123456"
                {...register('healthcare_license')}
              />
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description (optional)"
              rows={2}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="animate-spin" />}
              Create organization
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function OrganizationsPage() {
  const [searchParams] = useSearchParams()
  const [dialogOpen, setDialogOpen] = useState(searchParams.get('new') === '1')
  const { data: orgs, isLoading, error } = useOrganizations()

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="mt-1 text-muted-foreground">
            {orgs?.length ?? 0} organization{orgs?.length !== 1 ? 's' : ''} managed by you
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          New organization
        </Button>
      </div>

      <CreateOrgDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/50">
          <CardContent className="py-8 text-center text-sm text-destructive">
            Failed to load organizations. Please refresh the page.
          </CardContent>
        </Card>
      ) : orgs?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <Building2 className="h-12 w-12 text-muted-foreground/40" />
            <div className="text-center">
              <p className="font-semibold">No organizations yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first organization to get started.
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Create organization
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orgs?.map((org) => (
            <Link key={org.id} to={`/organizations/${org.id}`}>
              <Card className="group transition-all hover:shadow-md hover:border-primary/30 cursor-pointer">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{org.name}</p>
                      <Badge variant={org.type as OrgType} className="shrink-0">
                        {ORG_TYPE_LABELS[org.type]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {org.member_count} member{org.member_count !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Created {new Date(org.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
