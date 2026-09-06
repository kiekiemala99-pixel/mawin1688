# ขึ้นโฮสต์ฟรี Mawin1688 ทีละขั้น

โปรเจกต์นี้เป็น **เว็บก้อนเดียว** (หน้าบ้าน + API อยู่โดเมนเดียวกัน)  
ฐานข้อมูลในโค้ดเป็น **PostgreSQL** ไม่ใช่ MySQL

แผนที่เข้ากับโค้ดจริงและฟรีจริง

| ส่วน | ใช้บริการนี้ | ทำไม |
|---|---|---|
| เว็บทั้งก้อน | Render แผน Free | รัน Node ได้, ไฟล์ตั้งค่ามีแล้ว |
| ฐานข้อมูล | Neon Postgres | ฟรี, ใส่ `DATABASE_URL` แล้วระบบใช้ทันที |
| เก็บโค้ด | GitHub | Render ดึงจากตรงนี้ |

อย่าแยก Frontend ไป Vercel แล้ว Backend ไป Render + MySQL  
ล็อกอิน ฝาก-ถอน สล็อต หวย จะพัง เพราะคุกกี้กับ API ต้องอยู่โดเมนเดียวกัน

---

## สิ่งที่ต้องเตรียมก่อนเริ่ม

1. บัญชี [GitHub](https://github.com)
2. บัญชี [Neon](https://neon.tech) (ฐานข้อมูลฟรี)
3. บัญชี [Render](https://render.com) (โฮสต์เว็บฟรี)
4. รหัสลับยาวอย่างน้อย 32 ตัว สำหรับล็อกอิน

สร้างรหัสลับบนเครื่องตัวเองด้วยคำสั่งนี้ แล้วเก็บไว้

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

ค่าที่ต้องมีครบก่อนกด Deploy

- `DATABASE_URL` จาก Neon
- `BETTER_AUTH_SECRET` จากคำสั่งด้านบน
- `BETTER_AUTH_URL` โดเมนเว็บจริง เช่น `https://mawin1688.onrender.com`
- `VITE_AUTH_ENABLED=true`
- `NODE_ENV=production`

ตัวอย่างอยู่ในไฟล์ `.env.example`

---

## ขั้นที่ 1 ดันโค้ดขึ้น GitHub

1. เปิด GitHub → **New repository**
2. ตั้งชื่อเช่น `mawin1688` → สร้างแบบ Private ก็ได้
3. อย่าใส่ไฟล์ `.env` จริงขึ้น GitHub
4. อัปโหลดทั้งโปรเจกต์ ยกเว้น `node_modules` และ `.env`

ถ้าใช้คำสั่งบนเครื่อง

```bash
git init
git add .
git commit -m "mawin1688"
git branch -M main
git remote add origin https://github.com/USER/mawin1688.git
git push -u origin main
```

ตรวจว่ามีไฟล์เหล่านี้ใน repo

- `package.json`
- `render.yaml`
- `vercel.json`
- `railway.toml`
- `nixpacks.toml`
- `Procfile`
- `.env.example`

---

## ขั้นที่ 2 สร้างฐานข้อมูลฟรีบน Neon

1. เปิด [neon.tech](https://neon.tech) แล้วสมัครด้วย GitHub
2. **New Project**
3. ตั้งชื่อ `mawin1688`
4. Region เลือก **Singapore** (ใกล้ไทย)
5. Postgres version ใช้ค่าเริ่มต้น
6. กด Create
7. ไปหน้า **Dashboard → Connection string**
8. เลือกแบบ **Pooled**
9. คัดลอกทั้งบรรทัด หน้าตาประมาณ

```
postgresql://USER:PASSWORD@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

เก็บเป็น `DATABASE_URL`

ทางเลือกอื่นที่เข้ากันได้: Supabase Postgres, Railway Postgres  
**อย่าใช้ phpMyAdmin / MySQL ฟรี** เพราะ SQL ทั้งระบบเป็น Postgres (`jsonb`, `::numeric`)

ตารางทั้งหมดถูกสร้างอัตโนมัติตอน build ผ่าน `npm run db:migrate`  
ไม่ต้องสร้างตารางมือ

---

## ขั้นที่ 3 ขึ้นเว็บบน Render (แนะนำ)

ไฟล์ที่ใช้: [render.yaml](render.yaml)

1. เปิด [render.com](https://render.com) สมัครด้วย GitHub
2. กด **New +** → **Blueprint**
   หรือ **New +** → **Web Service**
3. เชื่อม GitHub แล้วเลือก repo `mawin1688`
4. ถ้าไม่ใช้ Blueprint ให้ใส่ค่านี้

| ช่อง | ค่า |
|---|---|
| Runtime | Node |
| Region | Singapore |
| Branch | `main` |
| Build Command | `npm ci && npm run build:host` |
| Start Command | `npm start` |
| Instance | Free |

5. ไปแท็บ **Environment** ใส่ค่า

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` |
| `NITRO_PRESET` | `node-server` |
| `VITE_AUTH_ENABLED` | `true` |
| `DATABASE_URL` | วาง connection string จาก Neon |
| `BETTER_AUTH_SECRET` | รหัสลับที่สร้างไว้ |
| `BETTER_AUTH_URL` | ยังใส่ชั่วคราว `https://mawin1688.onrender.com` ได้ก่อน |

6. กด **Create Web Service** รอ build 3–8 นาที
7. เมื่อได้ลิงก์จริง เช่น `https://mawin1688.onrender.com`
8. กลับไปแก้ `BETTER_AUTH_URL` ให้ตรงลิงก์นั้นเป๊ะ แล้ว **Manual Deploy** อีกรอบ

แผนฟรีของ Render จะหลับเมื่อไม่มีคนเข้า ครั้งแรกอาจช้า 15–40 วินาที

---

## ขั้นที่ 3B ทางเลือก Vercel (ง่าย แต่หลับเป็นช่วง)

ไฟล์ที่ใช้: [vercel.json](vercel.json)

1. ดันโค้ดขึ้น GitHub ตามขั้นที่ 1
2. เปิด [vercel.com](https://vercel.com) Import โปรเจกต์
3. Framework ปล่อย Other ได้ ไฟล์ `vercel.json` บังคับคำสั่งแล้ว
4. ใส่ Environment Variables ชุดเดียวกับขั้นที่ 3
5. `BETTER_AUTH_URL` = `https://ชื่อโปรเจกต์.vercel.app`
6. Deploy
7. ได้โดเมนแล้วถ้าเปลี่ยนเอง ต้องแก้ `BETTER_AUTH_URL` แล้ว Redeploy

Vercel เหมาะกับหน้าเว็บนิ่ง แอปนี้มีเซสชันและเกม ถ้าช้าหรือหลุดเซสชันให้ย้ายไป Render

---

## ขั้นที่ 3C ทางเลือก Railway

ไฟล์ที่ใช้: [railway.toml](railway.toml) [nixpacks.toml](nixpacks.toml) [Procfile](Procfile)

1. เปิด [railway.app](https://railway.app) → New Project → GitHub repo
2. Variables ใส่ชุดเดียวกับขั้นที่ 3
3. Settings → Generate Domain
4. ใส่ `BETTER_AUTH_URL` ให้ตรงโดเมนนั้น แล้ว Redeploy

Railway มีเครดิตทดลอง ไม่ได้ฟรีตลอดแบบ Neon + Render

---

## ขั้นที่ 4 โดเมนเอง (ไม่บังคับ)

1. ซื้อโดเมน แล้วชี้ CNAME ไปที่ Render / Vercel
2. เปลี่ยน `BETTER_AUTH_URL` เป็น `https://โดเมนคุณ.com`
3. Redeploy ครั้งหนึ่ง เพื่อให้คุกกี้ล็อกอินตรงโดเมนใหม่

---

## สคริปต์ใน package.json ที่ใช้ตอนขึ้นโฮสต์

| คำสั่ง | ใช้เมื่อ |
|---|---|
| `npm run build` | Vercel (preset vercel + สร้างตาราง) |
| `npm run build:host` | Render / Railway (เซิร์ฟเวอร์ Node + สร้างตาราง) |
| `npm start` | เปิดไฟล์ `.output/server/index.mjs` พอร์ตจากโฮสต์ |
| `npm run db:migrate` | ใส่ schema ลง Postgres |

---

## ตรวจว่าขึ้นสำเร็จ

1. เปิด URL สาธารณะ ไม่ขึ้น 502
2. สมัครสมาชิกแล้วมียอดในกระเป๋า
3. รีเฟรชแล้วยังล็อกอินอยู่
4. ใน Neon SQL Editor มีตาราง `wallets`, `transactions`, `bets`, `coupons`
5. กดหมุนสล็อตแล้วยอดลด

อาการที่พบบ่อย

| อาการ | สาเหตุ | แก้ |
|---|---|---|
| ล็อกอินแล้วเด้งกลับหน้าแรก | `BETTER_AUTH_URL` ไม่ตรงโดเมนจริง | ใส่ `https://...` ให้ตรง แล้ว Redeploy |
| 500 ตอนหมุนเกม / ฝาก | `DATABASE_URL` ผิด หรือยังไม่ migrate | ใช้สตริงแบบ pooled + ssl แล้ว build ใหม่ |
| ครั้งแรกช้ามาก | แผนฟรีหลับ | รอ 15–40 วินาที หรือเปิดเว็บบ่อยๆ |
| สมัครไม่ได้ | ลืม `VITE_AUTH_ENABLED=true` | ใส่แล้ว Redeploy |

---

## ทำไมไม่ใช้ MySQL และไม่แยก Frontend / Backend

1. หน้าเว็บเรียกเซิร์ฟเวอร์แบบโดเมนเดียวกัน ไม่มี REST แยกทั้งระบบ
2. ระบบล็อกอินใช้คุกกี้ต้องอยู่ https โดเมนเดียว
3. SQL ทั้งโปรเจกต์เป็น Postgres

ถ้าจะแยก Vercel + Render + MySQL ต้องรื้อ API และฐานข้อมูลใหม่ทั้งก้อน ไม่คุ้มกับโฮสต์ฟรี
