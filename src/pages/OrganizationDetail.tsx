import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  Plus,
  UserX,
  XCircle,
} from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization, useOrganizationMembers, orgKeys } from '@/hooks/useOrganizations'
import { inviteMemberSchema, type InviteMemberInput } from '@/lib/schemas'
import { toast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { MemberStatus, OrgType } from '@/types/database'

const ORG_TYPE_LABELS: Record<OrgType, string> = {
  school: 'School',
  nonprofit: 'Nonprofit',
  business: 'Business',
  government: 'Government',
  healthcare: 'Healthcare',
}

const STATUS_CONFIG: Record<
  MemberStatus,
  { label: string; icon: React.ElementType; variant: MemberStatus }
> = {
  invited: { label: 'Invited', icon: Clock, variant: 'invited' },
  active: { label: 'Active', icon: CheckCircle2, variant: 'active' },
  declined: { label: 'Declined', icon: XCircle, variant: 'declined' },
}

function TypeSpecificField({ org }: { org: { type: OrgType; school_district?: string | null; nonprofit_ein?: string | null; business_registration?: string | null; government_jurisdiction?: string | null; healthcare_license?: string | null } }) {
  if (org.type === 'school' && org.school_district) {
    return (
      <div className="text-sm">
        <span className="text-muted-foreground">District: </span>
        <span className="font-medium">{org.school_district}</span>
      </div>
    )
  }
  if (org.type === 'nonprofit' && org.nonprofit_ein) {
    return (
      <div className="text-sm">
        <span className="text-muted-foreground">EIN: </span>
        <span className="font-medium font-mono">{org.nonprofit_ein}</span>
      </div>
    )
  }
  if (org.type === 'business' && org.business_registration) {
    return (
      <div className="text-sm">
        <span className="text-muted-foreground">Reg #: </span>
        <span className="font-medium">{org.business_registration}</span>
      </div>
    )
  }
  if (org.type === 'government' && org.government_jurisdiction) {
    return (
      <div className="text-sm">
        <span className="text-muted-foreground">Jurisdiction: </span>
        <span className="font-medium">{org.government_jurisdiction}</span>
      </div>
    )
  }
  if (org.type === 'healthcare' && org.healthcare_license) {
    return (
      <div className="text-sm">
        <span className="text-muted-foreground">License #: </span>
        <span className="font-medium">{org.healthcare_license}</span>
      </div>
    )
  }
  return null
}

export function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data: org, isLoading: orgLoading } = useOrganization(id!)
  const { data: members, isLoading: membersLoading } = useOrganizationMembers(id!)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { role: 'member' },
  })

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteMemberInput) => {
      // Call the Edge Function for server-side validation + creation
      const { data: result, error } = await supabase.functions.invoke('create-invitation', {
        body: {
          organization_id: id,
          email: data.email,
          role: data.role,
        },
      })
      if (error) throw error
      if (result?.error) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgKeys.members(id!) })
      qc.invalidateQueries({ queryKey: orgKeys.lists() })
      toast({ title: 'Invitation sent', description: 'Member has been added to the list.' })
      reset()
    },
    onError: (err) => {
      toast({
        variant: 'destructive',
        title: 'Invitation failed',
        description: err instanceof Error ? err.message : 'Something went wrong.',
      })
    },
  })

  if (orgLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">Organization not found.</p>
        <Button variant="outline" onClick={() => navigate('/organizations')}>
          Back to organizations
        </Button>
      </div>
    )
  }

  const activeCount = members?.filter((m) => m.status === 'active').length ?? 0
  const invitedCount = members?.filter((m) => m.status === 'invited').length ?? 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back nav */}
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 gap-2 text-muted-foreground" asChild>
          <Link to="/organizations">
            <ArrowLeft className="h-4 w-4" />
            All organizations
          </Link>
        </Button>
      </div>

      {/* Org header */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-3xl font-bold tracking-tight">{org.name}</h1>
            <Badge variant={org.type as OrgType}>{ORG_TYPE_LABELS[org.type]}</Badge>
          </div>
          {org.description && (
            <p className="mt-1 text-muted-foreground text-sm">{org.description}</p>
          )}
          <TypeSpecificField org={org} />
          <p className="text-xs text-muted-foreground mt-1">
            Created {new Date(org.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Total Members</p>
            <p className="font-display text-2xl font-bold mt-0.5">{members?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="font-display text-2xl font-bold mt-0.5 text-emerald-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="font-display text-2xl font-bold mt-0.5 text-yellow-600">{invitedCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Members list */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-display text-xl font-semibold">Members</h2>

          {membersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : members?.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-2 py-10">
                <UserX className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No members yet. Invite someone!</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="divide-y">
                {members?.map((member) => {
                  const status = STATUS_CONFIG[member.status]
                  const StatusIcon = status.icon
                  return (
                    <div key={member.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                        {member.email[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.email}</p>
                        <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                      </div>
                      <Badge variant={status.variant}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {status.label}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Invite form */}
        <div className="space-y-4">
          <h2 className="font-display text-xl font-semibold">Invite Member</h2>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Send invitation</CardTitle>
              <CardDescription>
                The member will appear in the list immediately. Email delivery would be
                triggered here in production.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit((data) => inviteMutation.mutate(data))}
                className="space-y-3"
                noValidate
              >
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="member@example.com"
                      className="pl-9"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={inviteMutation.isPending}
                >
                  {inviteMutation.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Send invitation
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
