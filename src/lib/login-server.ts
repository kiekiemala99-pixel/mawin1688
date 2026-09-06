import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { isThaiPhone, phoneToEmail } from "@/lib/phone";
import { logServerError, publicError } from "@/lib/server-log";

export const resolveLoginEmail = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.string().trim().min(1).parse(v))
  .handler(async ({ data }) => {
    try {
      const q = data.toLowerCase();
      if (isThaiPhone(q)) return phoneToEmail(q);
      const sql = await getSql();
      const rows = await sql<{ phone: string }>`select phone from wallets where username = ${q} limit 1`;
      if (rows[0] && isThaiPhone(rows[0].phone)) return phoneToEmail(rows[0].phone);
      return phoneToEmail(q);
    } catch (err) {
      throw publicError("resolveLoginEmail", err, "ตรวจเบอร์โทรไม่สำเร็จ");
    }
  });
