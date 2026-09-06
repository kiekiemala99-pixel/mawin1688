export const PAY_METHODS = ["พร้อมเพย์", "โอนธนาคาร", "ทรูมันนี่"] as const;
export type PayMethod = (typeof PAY_METHODS)[number];

export type PayAccount = {
  method: PayMethod;
  bank: string;
  name: string;
  account: string;
};

/** Demo receiving accounts — virtual credits only, not a live payment rail. */
export const SITE_PAY_ACCOUNTS: PayAccount[] = [
  { method: "พร้อมเพย์", bank: "พร้อมเพย์", name: "มาวิน 1688", account: "0800001688" },
  { method: "โอนธนาคาร", bank: "กสิกรไทย", name: "มาวิน 1688", account: "1234567890" },
  { method: "ทรูมันนี่", bank: "TrueMoney Wallet", name: "มาวิน 1688", account: "0954515360" },
];

export function accountFor(method: string): PayAccount {
  return SITE_PAY_ACCOUNTS.find((a) => a.method === method) ?? SITE_PAY_ACCOUNTS[0];
}
