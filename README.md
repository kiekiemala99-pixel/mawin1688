# มาวิน1688

เว็บหวย + บอล + คูปอง + เกม 10 ตัว  
สมัครใหม่ยอดเป็น **0** ไม่มีเครดิตทดลอง

## ขึ้นโฮสต์ฟรี (Render + Neon)

ใช้ 3 ที่นี้เท่านั้น: **GitHub** (มีแล้ว) · **Neon** (ฐานข้อมูล) · **Render** (เว็บ)

### 1) สร้างฐานข้อมูล Neon

1. เปิด https://neon.tech แล้วสมัครด้วย GitHub
2. New Project ชื่อ `mawin1688` Region **Singapore**
3. คัดลอก Connection string แบบ **Pooled** (มีคำว่า `pooler` และ `sslmode=require`)

### 2) สร้างเว็บบน Render

1. เปิด https://dashboard.render.com สมัครด้วย GitHub
2. New + → **Web Service** → เลือก repo `mawin1688`
3. ใส่ค่านี้

| ช่อง | ค่า |
|---|---|
| Runtime | Node |
| Region | Singapore |
| Branch | `main` |
| Root Directory | ว่างไว้ (อย่าใส่ `src`) |
| Build Command | `npm ci && npm run build:host` |
| Start Command | `npm start` |
| Instance | Free |

4. Environment ใส่ให้ครบ

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` |
| `NITRO_PRESET` | `node-server` |
| `VITE_AUTH_ENABLED` | `true` |
| `DATABASE_URL` | สตริงจาก Neon |
| `BETTER_AUTH_SECRET` | รหัสลับยาว 32 ตัวขึ้นไป |
| `BETTER_AUTH_URL` | `https://mawin1688.onrender.com` (แก้เป็นลิงก์จริงหลังได้โดเมน) |
| `STAFF_PHONES` | `0954515360` |

5. Create Web Service รอ 5–10 นาที
6. เมื่อได้ลิงก์จริง กลับไปแก้ `BETTER_AUTH_URL` ให้ตรง แล้วกด **Manual Deploy**

สร้างรหัสลับ:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### ตรวจว่าขึ้นสำเร็จ

- เปิดลิงก์ได้ ไม่ขึ้น 502
- สมัครใหม่ยอดเป็น 0
- เบอร์ใน `STAFF_PHONES` เท่านั้นที่เห็นเมนูแอดมิน

แอดมิน: `https://โดเมนคุณ.onrender.com/app/admin`

แผนฟรีของ Render จะหลับตอนไม่มีคนเข้า ครั้งแรกอาจช้า 15–40 วินาที
