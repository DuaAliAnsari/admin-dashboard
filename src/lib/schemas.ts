import { z } from 'zod'

export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
})

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const orgTypeEnum = z.enum([
  'school',
  'nonprofit',
  'business',
  'government',
  'healthcare',
])

export const createOrgSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be under 100 characters'),
    type: orgTypeEnum,
    description: z.string().max(500, 'Description too long').optional(),
    // Type-specific conditional fields
    school_district: z.string().optional(),
    nonprofit_ein: z
      .string()
      .regex(/^\d{2}-\d{7}$/, 'EIN format: XX-XXXXXXX')
      .optional(),
    business_registration: z.string().optional(),
    government_jurisdiction: z.string().optional(),
    healthcare_license: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'school' && !data.school_district) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'School district is required for School organizations',
        path: ['school_district'],
      })
    }
    if (data.type === 'nonprofit' && !data.nonprofit_ein) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'EIN is required for Nonprofit organizations',
        path: ['nonprofit_ein'],
      })
    }
  })

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member']).default('member'),
})

export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type CreateOrgInput = z.infer<typeof createOrgSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
