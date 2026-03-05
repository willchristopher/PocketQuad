import { z } from 'zod'

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
  .regex(/[0-9]/, 'Password must include at least one number')

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
})

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: passwordSchema,
    role: z.enum(['STUDENT', 'FACULTY', 'ADMIN']).default('STUDENT'),
  })
  .superRefine(({ email, role }, context) => {
    if (role === 'ADMIN') {
      return
    }

    if (!email.endsWith('.edu')) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'A .edu email address is required for student and faculty accounts',
      })
    }
  })

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
})

export const facultyRequestOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
})

export const facultyVerifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  code: z.string().trim().min(6, 'Code must be at least 6 characters').max(12, 'Code is too long'),
})

export const facultySetPasswordSchema = z.object({
  password: passwordSchema,
})

export const studentRequestOtpSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: passwordSchema,
  })
  .superRefine(({ email }, context) => {
    if (!email.endsWith('.edu')) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'A .edu email address is required for student accounts',
      })
    }
  })

export const studentVerifyOtpSchema = studentRequestOtpSchema.extend({
  code: z.string().trim().min(6, 'Code must be at least 6 characters').max(12, 'Code is too long'),
})
