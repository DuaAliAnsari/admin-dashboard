import { Link } from 'react-router-dom'
import { Building2, Users, Plus, TrendingUp } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useOrganizations } from '@/hooks/useOrganizations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { OrgType } from '@/types/database'

const ORG_TYPE_LABELS: Record<OrgType, string> = {
  school: 'School',
  nonprofit: 'Nonprofit',
  business: 'Business',
  government: 'Government',
  healthcare: 'Healthcare',
}

export function DashboardPage() {
  const { profile, user } = useAuth()
  const { data: orgs, isLoading } = useOrganizations()

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Admin'
  const totalMembers = orgs?.reduce((sum, o) => sum + o.member_count, 0) ?? 0
  const recentOrgs = orgs?.slice(0, 3) ?? []

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here's what's happening across your organizations.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Organizations
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-bold">{orgs?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">across all types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Members
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-bold">{totalMembers}</div>
            <p className="text-xs text-muted-foreground mt-1">invited and active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Org Types
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-bold">
              {new Set(orgs?.map((o) => o.type)).size}
            </div>
            <p className="text-xs text-muted-foreground mt-1">unique categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent orgs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Recent Organizations</h2>
          <Button asChild size="sm">
            <Link to="/organizations">
              View all
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : recentOrgs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-10">
              <Building2 className="h-10 w-10 text-muted-foreground/50" />
              <div className="text-center">
                <p className="font-medium">No organizations yet</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Create your first organization to get started.
                </p>
              </div>
              <Button asChild size="sm">
                <Link to="/organizations?new=1">
                  <Plus className="h-4 w-4" />
                  Create organization
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentOrgs.map((org) => (
              <Link key={org.id} to={`/organizations/${org.id}`}>
                <Card className="transition-shadow hover:shadow-md cursor-pointer">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{org.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {org.member_count} member{org.member_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Badge variant={org.type as OrgType}>
                      {ORG_TYPE_LABELS[org.type]}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
