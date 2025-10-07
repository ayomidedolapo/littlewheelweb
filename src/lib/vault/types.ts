// /lib/vault/types.ts
import { z } from "zod";

export type ID = string;

export const CustomerSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  createdAt: z.string(),
});
export type Customer = z.infer<typeof CustomerSchema>;

export const VaultSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  name: z.string(), // e.g. "Rent Vault"
  targetAmount: z.number().optional(),
  balance: z.number().nonnegative(),
  createdAt: z.string(),
});
export type Vault = z.infer<typeof VaultSchema>;

export const TxnSchema = z.object({
  id: z.string(),
  vaultId: z.string(),
  type: z.enum(["DEPOSIT", "WITHDRAW"]),
  amount: z.number().positive(),
  createdAt: z.string(),
});
export type Transaction = z.infer<typeof TxnSchema>;
