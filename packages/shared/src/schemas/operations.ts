import { z } from 'zod';
import { OperationType, Periodicity } from '../constants/enums';

// Base schema with common fields
const baseOperationSchema = {
  operationDate: z.union([z.date(), z.string()]).transform((val) => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  }),
  amount: z.number().positive('Amount must be a positive number'),
  currency: z.string().min(1, 'Currency is required'),
  description: z.string().optional(),
  repeat: z.nativeEnum(Periodicity).optional(),
  recurrenceEndDate: z
    .union([z.date(), z.string()])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    }),
  isTemplate: z.boolean().optional(),
  counterpartyId: z.string().optional(),
  dealId: z.string().optional(),
  departmentId: z.string().optional(),
};

// Income/Expense operation schema
const incomeExpenseOperationSchema = z
  .object({
    type: z.literal(OperationType.INCOME).or(z.literal(OperationType.EXPENSE)),
    accountId: z
      .string()
      .min(1, 'Account is required for income/expense operations'),
    articleId: z
      .string()
      .min(1, 'Article is required for income/expense operations'),
    sourceAccountId: z.string().optional(),
    targetAccountId: z.string().optional(),
    ...baseOperationSchema,
  })
  .strict();

// Transfer operation schema
const transferOperationSchema = z
  .object({
    type: z.literal(OperationType.TRANSFER),
    sourceAccountId: z
      .string()
      .min(1, 'Source account is required for transfer operations'),
    targetAccountId: z
      .string()
      .min(1, 'Target account is required for transfer operations'),
    accountId: z.string().optional(),
    articleId: z.string().optional(),
    ...baseOperationSchema,
  })
  .superRefine((data, ctx) => {
    if (data.sourceAccountId === data.targetAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Source and target accounts must be different',
        path: ['targetAccountId'],
      });
    }
  });

// Union for all operation types (using regular union instead of discriminated union
// because superRefine creates ZodEffects which is incompatible with discriminated union)
export const CreateOperationSchema = z.union([
  incomeExpenseOperationSchema,
  transferOperationSchema,
]);

// Type inference from schema
export type CreateOperationInput = z.infer<typeof CreateOperationSchema>;

// Update operation schema - all fields optional, but if type is provided, validate accordingly
export const UpdateOperationSchema = z
  .object({
    type: z.nativeEnum(OperationType).optional(),
    operationDate: z
      .union([z.date(), z.string()])
      .optional()
      .transform((val) => {
        if (!val) return undefined;
        if (typeof val === 'string') {
          return new Date(val);
        }
        return val;
      }),
    amount: z.number().positive('Amount must be a positive number').optional(),
    currency: z.string().min(1, 'Currency is required').optional(),
    accountId: z.string().optional(),
    sourceAccountId: z.string().optional(),
    targetAccountId: z.string().optional(),
    articleId: z.string().optional(),
    description: z.string().optional(),
    repeat: z.nativeEnum(Periodicity).optional(),
    recurrenceEndDate: z
      .union([z.date(), z.string()])
      .optional()
      .transform((val) => {
        if (!val) return undefined;
        if (typeof val === 'string') {
          return new Date(val);
        }
        return val;
      }),
    isTemplate: z.boolean().optional(),
    counterpartyId: z.string().optional(),
    dealId: z.string().optional(),
    departmentId: z.string().optional(),
  })
  .refine(
    (data) => {
      // If type is provided, validate type-specific requirements
      if (data.type === OperationType.TRANSFER) {
        if (
          data.sourceAccountId !== undefined &&
          data.targetAccountId !== undefined
        ) {
          return data.sourceAccountId !== data.targetAccountId;
        }
      }
      return true;
    },
    {
      message: 'Source and target accounts must be different',
      path: ['targetAccountId'],
    }
  );

export type UpdateOperationInput = z.infer<typeof UpdateOperationSchema>;
