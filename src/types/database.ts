export type OrgType = 'school' | 'nonprofit' | 'business' | 'government' | 'healthcare'

export type MemberStatus = 'invited' | 'active' | 'declined'

export type MemberRole = 'admin' | 'member'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          is_admin?: boolean
          updated_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
          type: OrgType
          description: string | null
          created_by: string
          created_at: string
          updated_at: string
          // Type-specific fields
          school_district: string | null
          nonprofit_ein: string | null
          business_registration: string | null
          government_jurisdiction: string | null
          healthcare_license: string | null
        }
        Insert: {
          id?: string
          name: string
          type: OrgType
          description?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
          school_district?: string | null
          nonprofit_ein?: string | null
          business_registration?: string | null
          government_jurisdiction?: string | null
          healthcare_license?: string | null
        }
        Update: {
          name?: string
          type?: OrgType
          description?: string | null
          updated_at?: string
          school_district?: string | null
          nonprofit_ein?: string | null
          business_registration?: string | null
          government_jurisdiction?: string | null
          healthcare_license?: string | null
        }
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string | null
          email: string
          role: MemberRole
          status: MemberStatus
          invited_by: string
          invited_at: string
          joined_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          user_id?: string | null
          email: string
          role?: MemberRole
          status?: MemberStatus
          invited_by: string
          invited_at?: string
          joined_at?: string | null
        }
        Update: {
          user_id?: string | null
          role?: MemberRole
          status?: MemberStatus
          joined_at?: string | null
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      org_type: OrgType
      member_status: MemberStatus
      member_role: MemberRole
    }
  }
}

// Convenience aliases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Organization = Database['public']['Tables']['organizations']['Row']
export type OrganizationMember = Database['public']['Tables']['organization_members']['Row']

// Extended types for UI
export interface OrganizationWithCount extends Organization {
  member_count: number
}
