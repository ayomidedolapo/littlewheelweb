// /lib/vault/hooks.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Customer, Vault, Transaction } from "./types";

export function useCustomers() {
  return useQuery<{ success: boolean; data: Customer[] }>({
    queryKey: ["customers"],
    queryFn: async () => (await fetch("/api/mock/customers")).json(),
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Customer>) =>
      (
        await fetch("/api/mock/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      ).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useVaults(customerId: string) {
  return useQuery<{ success: boolean; data: Vault[] }>({
    queryKey: ["vaults", customerId],
    queryFn: async () =>
      (await fetch(`/api/mock/customers/${customerId}/vaults`)).json(),
    enabled: !!customerId,
  });
}

export function useCreateVault(customerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; targetAmount?: number }) =>
      (
        await fetch(`/api/mock/customers/${customerId}/vaults`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      ).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vaults", customerId] }),
  });
}

export function useDeposit(vaultId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amount: number) =>
      (
        await fetch(`/api/mock/vaults/${vaultId}/deposit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount }),
        })
      ).json(),
    onSuccess: (_, _vars, ctx: any) => {
      // invalidate all vault queries
      qc.invalidateQueries({ queryKey: ["vaults"] });
    },
  });
}
