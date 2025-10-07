// /lib/vault/mockDb.ts
import { Customer, Vault, Transaction, ID } from "./types";

const KEY = "lw_mock_db_v1";
type DB = { customers: Customer[]; vaults: Vault[]; txns: Transaction[] };

function now() {
  return new Date().toISOString();
}
function uid() {
  return crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function load(): DB {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "") as DB;
  } catch {
    return { customers: [], vaults: [], txns: [] };
  }
}
function save(db: DB) {
  localStorage.setItem(KEY, JSON.stringify(db));
}

export const mockDb = {
  seed() {
    const db = load();
    if (db.customers.length) return;
    const c1: Customer = {
      id: uid(),
      firstName: "Ada",
      lastName: "Okonkwo",
      phone: "2348012345678",
      createdAt: now(),
    };
    const v1: Vault = {
      id: uid(),
      customerId: c1.id,
      name: "Main Vault",
      balance: 25000,
      createdAt: now(),
    };
    save({ customers: [c1], vaults: [v1], txns: [] });
  },

  listCustomers(): Customer[] {
    return load().customers;
  },
  getCustomer(id: ID): Customer | undefined {
    return load().customers.find((c) => c.id === id);
  },
  createCustomer(
    input: Pick<Customer, "firstName" | "lastName" | "phone">
  ): Customer {
    const db = load();
    const c: Customer = { id: uid(), ...input, createdAt: now() };
    db.customers.push(c);
    save(db);
    return c;
  },

  listVaults(customerId: ID): Vault[] {
    return load().vaults.filter((v) => v.customerId === customerId);
  },
  createVault(customerId: ID, name: string, targetAmount?: number): Vault {
    const db = load();
    const v: Vault = {
      id: uid(),
      customerId,
      name,
      targetAmount,
      balance: 0,
      createdAt: now(),
    };
    db.vaults.push(v);
    save(db);
    return v;
  },

  deposit(vaultId: ID, amount: number): { vault: Vault; txn: Transaction } {
    const db = load();
    const v = db.vaults.find((x) => x.id === vaultId)!;
    v.balance += amount;
    const txn: Transaction = {
      id: uid(),
      vaultId,
      type: "DEPOSIT",
      amount,
      createdAt: now(),
    };
    db.txns.push(txn);
    save(db);
    return { vault: v, txn };
  },

  withdraw(vaultId: ID, amount: number): { vault: Vault; txn: Transaction } {
    const db = load();
    const v = db.vaults.find((x) => x.id === vaultId)!;
    if (amount > v.balance) throw new Error("Insufficient balance");
    v.balance -= amount;
    const txn: Transaction = {
      id: uid(),
      vaultId,
      type: "WITHDRAW",
      amount,
      createdAt: now(),
    };
    db.txns.push(txn);
    save(db);
    return { vault: v, txn };
  },

  listTxns(vaultId: ID): Transaction[] {
    return load()
      .txns.filter((t) => t.vaultId === vaultId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
};
