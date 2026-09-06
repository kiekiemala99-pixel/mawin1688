export type PayChannel = {
  name: string;
  group: "bank" | "wallet";
  digits: number;
  hint: string;
};

export const PAY_CHANNELS: PayChannel[] = [
  { name: "กสิกรไทย", group: "bank", digits: 10, hint: "เลขบัญชี 10 หลัก" },
  { name: "ไทยพาณิชย์", group: "bank", digits: 10, hint: "เลขบัญชี 10 หลัก" },
  { name: "กรุงไทย", group: "bank", digits: 10, hint: "เลขบัญชี 10 หลัก" },
  { name: "กรุงเทพ", group: "bank", digits: 10, hint: "เลขบัญชี 10 หลัก" },
  { name: "กรุงศรีอยุธยา", group: "bank", digits: 10, hint: "เลขบัญชี 10 หลัก" },
  { name: "ทหารไทยธนชาต (ttb)", group: "bank", digits: 10, hint: "เลขบัญชี 10 หลัก" },
  { name: "ออมสิน", group: "bank", digits: 12, hint: "เลขบัญชี 12 หลัก" },
  { name: "ธ.ก.ส.", group: "bank", digits: 12, hint: "เลขบัญชี 12 หลัก" },
  { name: "ซีไอเอ็มบี (CIMB)", group: "bank", digits: 10, hint: "เลขบัญชี 10 หลัก" },
  { name: "เกียรตินาคินภัทร", group: "bank", digits: 10, hint: "เลขบัญชี 10 หลัก" },
  { name: "TrueMoney Wallet", group: "wallet", digits: 10, hint: "เบอร์โทร TrueMoney 10 หลัก" },
];

export function channelByName(name: string) {
  return PAY_CHANNELS.find((c) => c.name === name);
}

export function normalizePayAccount(raw: string) {
  return raw.replace(/\D/g, "");
}

export function validatePayAccount(channelName: string, raw: string): string | null {
  const channel = channelByName(channelName);
  if (!channel) return "เลือกธนาคารหรือกระเป๋าเงิน";
  const digits = normalizePayAccount(raw);
  if (channel.group === "wallet") {
    if (!/^0[689]\d{8}$/.test(digits)) return "กรอกเบอร์ TrueMoney 10 หลัก เช่น 08xxxxxxxx";
    return null;
  }
  if (digits.length !== channel.digits) return `${channel.hint} ของ${channel.name}`;
  if (!/^\d+$/.test(digits)) return "เลขบัญชีต้องเป็นตัวเลข";
  return null;
}
