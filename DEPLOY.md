# 🚀 Hướng dẫn triển khai – Hatinh.vip trên Cloudflare Pages + Supabase

> **Thời gian ước tính:** ~20–30 phút  
> **Chi phí:** Miễn phí hoàn toàn (Cloudflare Pages Free + Supabase Free Tier)

---

## 📋 Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────┐
│                  Cloudflare Pages                    │
│                                                      │
│  ┌────────────┐   ┌──────────────────────────────┐  │
│  │ Static     │   │  Pages Functions (Edge)      │  │
│  │ index.html │──▶│  /api/registrations          │  │
│  │ admin.html │   │  /api/registrations/[id]     │  │
│  └────────────┘   └──────────────┬───────────────┘  │
└────────────────────────────────── │ ────────────────┘
                                    │ HTTPS REST
                                    ▼
                         ┌──────────────────┐
                         │    Supabase      │
                         │  PostgreSQL DB   │
                         │  (registrations) │
                         └──────────────────┘
```

**Luồng hoạt động:**
1. Người dùng điền form trên `index.html` → gọi `POST /api/registrations`
2. Cloudflare Pages Function nhận request → gọi Supabase REST API
3. Supabase lưu vào bảng `registrations` (PostgreSQL)
4. Admin mở `admin.html` → gọi `GET /api/registrations` → hiển thị danh sách

---

## PHẦN 1 – Tạo Supabase Database

### Bước 1.1 – Tạo tài khoản & project Supabase

1. Truy cập [https://supabase.com](https://supabase.com) → **Start for free**
2. Đăng ký bằng GitHub hoặc email
3. Click **New project**
4. Điền thông tin:
   - **Name:** `hatinh-vip`
   - **Database Password:** (đặt mật khẩu mạnh, lưu lại)
   - **Region:** `Southeast Asia (Singapore)` ← gần nhất với Việt Nam
5. Click **Create new project** → chờ ~2 phút để khởi tạo

### Bước 1.2 – Tạo bảng `registrations`

Vào **SQL Editor** trong Supabase dashboard, chạy lệnh SQL sau:

```sql
-- Tạo bảng registrations
CREATE TABLE IF NOT EXISTS public.registrations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name   TEXT        NOT NULL,
  address      TEXT        NOT NULL,
  phone        TEXT        NOT NULL,
  note         TEXT,
  status       TEXT        NOT NULL DEFAULT 'new'
                           CHECK (status IN ('new', 'done', 'skip')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index để tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_registrations_status     ON public.registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON public.registrations(created_at DESC);

-- Trigger tự cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Bật Row Level Security (RLS)
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Policy: cho phép INSERT từ anonymous (form đăng ký public)
CREATE POLICY "Allow public insert"
  ON public.registrations
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: cho phép SELECT, UPDATE, DELETE từ service_role (dùng trong Functions)
-- Hoặc dùng anon key nếu muốn đơn giản (xem ghi chú bên dưới)
CREATE POLICY "Allow anon select"
  ON public.registrations
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon update"
  ON public.registrations
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete"
  ON public.registrations
  FOR DELETE
  TO anon
  USING (true);
```

> **⚠️ Lưu ý bảo mật:**  
> Các policy trên cho phép anonymous key đọc/ghi/xóa – phù hợp với project nhỏ.  
> Nếu muốn bảo mật hơn, thay `TO anon` bằng `TO authenticated` và dùng `service_role` key trong Cloudflare Functions (set biến `SUPABASE_SERVICE_KEY` thay vì `SUPABASE_ANON_KEY`).

### Bước 1.3 – Lấy Supabase credentials

Vào **Project Settings → API**:

| Thông tin | Nơi tìm | Ghi chú |
|---|---|---|
| **Project URL** | `https://xxxxx.supabase.co` | Copy từ "Project URL" |
| **anon/public key** | `eyJhbGciOiJIUzI1NiIsInR...` | Copy từ "Project API Keys → anon public" |

> **KHÔNG dùng** `service_role` key cho client-side!  
> Chỉ dùng `anon` key hoặc `service_role` trong Cloudflare Functions.

---

## PHẦN 2 – Triển khai lên Cloudflare Pages

### Cách A – Deploy qua GitHub (Khuyến nghị)

#### Bước 2A.1 – Push code lên GitHub

```bash
# Khởi tạo Git repo (nếu chưa có)
git init
git add .
git commit -m "Initial commit: Hatinh.vip landing page + admin"

# Tạo repo trên GitHub rồi push
git remote add origin https://github.com/YOUR_USERNAME/hatinh-vip.git
git branch -M main
git push -u origin main
```

#### Bước 2A.2 – Kết nối với Cloudflare Pages

1. Truy cập [https://pages.cloudflare.com](https://pages.cloudflare.com)
2. Đăng nhập hoặc tạo tài khoản Cloudflare (miễn phí)
3. Click **Create a project** → **Connect to Git**
4. Chọn **GitHub** → Authorize Cloudflare
5. Chọn repo `hatinh-vip`
6. Cấu hình build:
   - **Project name:** `hatinh-vip`
   - **Production branch:** `main`
   - **Build command:** *(để trống)*
   - **Build output directory:** `/` hoặc `.`
7. Click **Save and Deploy**

#### Bước 2A.3 – Thiết lập Environment Variables

Trong Cloudflare Pages dashboard → **Settings → Environment variables**:

| Variable name | Value | Environment |
|---|---|---|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | Production + Preview |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Production + Preview |

Sau khi thêm biến → **Save** → **Redeploy** (trigger lại deployment)

---

### Cách B – Deploy bằng Wrangler CLI

```bash
# Cài Wrangler CLI
npm install -g wrangler

# Đăng nhập Cloudflare
wrangler login

# Deploy project
wrangler pages deploy . --project-name=hatinh-vip

# Set biến môi trường
wrangler pages secret put SUPABASE_URL --project-name=hatinh-vip
# (nhập URL Supabase khi được hỏi)

wrangler pages secret put SUPABASE_ANON_KEY --project-name=hatinh-vip
# (nhập anon key khi được hỏi)
```

---

## PHẦN 3 – Gắn tên miền hatinh.vip

> Yêu cầu: Bạn đã mua domain `hatinh.vip` và quản lý DNS trên Cloudflare.

### Bước 3.1 – Thêm domain vào Cloudflare

1. Trong Cloudflare dashboard → **Websites** → **Add a site**
2. Nhập `hatinh.vip` → chọn Free plan
3. Cập nhật Nameserver tại registrar (nơi mua domain) sang Cloudflare NS

### Bước 3.2 – Gắn custom domain vào Pages project

1. Vào **Pages project (hatinh-vip) → Custom domains**
2. Click **Set up a custom domain**
3. Nhập `hatinh.vip` → **Continue**
4. Cloudflare tự tạo CNAME record → **Activate domain**
5. Chờ ~5–10 phút để DNS propagate

> **Kết quả:** Site chạy tại `https://hatinh.vip` với SSL tự động!

---

## PHẦN 4 – Kiểm tra sau khi deploy

### Checklist

```
□ 1. Truy cập https://hatinh.vip → trang landing hiển thị đúng
□ 2. Điền form đăng ký → submit → hiện thông báo thành công
□ 3. Vào Supabase → Table Editor → registrations → có dữ liệu mới
□ 4. Truy cập https://hatinh.vip/admin.html → hiển thị dashboard
□ 5. Trang admin hiển thị đúng số liệu thống kê
□ 6. Test filter, search trên admin
□ 7. Test "Đánh dấu đã liên hệ" → status đổi thành "done"
□ 8. Test xuất CSV
□ 9. Kiểm tra API endpoint: https://hatinh.vip/api/registrations
□ 10. Mở DevTools → Console → không có lỗi CORS
```

### Test API thủ công (curl)

```bash
# Test GET registrations
curl https://hatinh.vip/api/registrations

# Test POST (tạo đăng ký mới)
curl -X POST https://hatinh.vip/api/registrations \
  -H "Content-Type: application/json" \
  -d '{
    "store_name": "Quán Test",
    "address": "123 Trần Phú, Hà Tĩnh",
    "phone": "0912345678",
    "note": "Test từ curl"
  }'
```

---

## PHẦN 5 – Cấu hình nâng cao (Tùy chọn)

### 5.1 – Bảo mật trang Admin

Trang `admin.html` hiện không có xác thực. Để bảo vệ, dùng **Cloudflare Access** (miễn phí):

1. Cloudflare dashboard → **Zero Trust → Access → Applications**
2. **Add an application → Self-hosted**
3. **App domain:** `hatinh.vip/admin.html`
4. **Policy:** Email authentication (chỉ cho phép email của bạn)
5. Cloudflare sẽ yêu cầu OTP email trước khi vào admin

### 5.2 – Gửi thông báo Telegram khi có đăng ký mới

Thêm vào `functions/api/registrations.js` sau khi tạo record thành công:

```javascript
// Gửi Telegram notification
async function notifyTelegram(env, record) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  const msg = `🆕 Đăng ký mới!\n👤 ${record.store_name}\n📍 ${record.address}\n📞 ${record.phone}${record.note ? '\n📝 ' + record.note : ''}`;
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: msg })
  });
}
```

Sau đó thêm biến môi trường:
- `TELEGRAM_BOT_TOKEN` – token từ @BotFather
- `TELEGRAM_CHAT_ID` – ID nhóm/kênh Telegram của bạn

### 5.3 – Auto-refresh admin (đã có sẵn)

`admin.html` đã có `setInterval(loadData, 60000)` – tự động reload dữ liệu mỗi 60 giây.

---

## PHẦN 6 – Cấu trúc file dự án

```
hatinh-vip/
├── index.html                          ← Landing page
├── admin.html                          ← Admin dashboard
├── wrangler.toml                       ← Cloudflare config (optional CLI)
├── README.md                           ← Tài liệu dự án
├── DEPLOY.md                           ← File này – hướng dẫn deploy
└── functions/
    └── api/
        ├── registrations.js            ← GET /api/registrations
        │                                  POST /api/registrations
        └── registrations/
            └── [id].js                 ← GET    /api/registrations/:id
                                           PATCH  /api/registrations/:id
                                           DELETE /api/registrations/:id
```

---

## PHẦN 7 – Xử lý sự cố thường gặp

### ❌ Lỗi "CORS error" khi submit form

**Nguyên nhân:** Function chưa được deploy hoặc sai URL  
**Giải pháp:**
- Kiểm tra tab **Functions** trong Cloudflare Pages → đảm bảo functions đang chạy
- Thử deploy lại (trigger redeploy)

### ❌ Lỗi "Server misconfigured"

**Nguyên nhân:** Biến môi trường chưa được set  
**Giải pháp:**
- Vào Pages Settings → Environment variables
- Kiểm tra `SUPABASE_URL` và `SUPABASE_ANON_KEY` đã được thêm
- Redeploy sau khi thêm biến

### ❌ Admin không hiển thị dữ liệu

**Nguyên nhân:** RLS policy Supabase chưa cho phép SELECT  
**Giải pháp:** Chạy lại SQL trong Supabase SQL Editor:
```sql
CREATE POLICY "Allow anon select" ON public.registrations
  FOR SELECT TO anon USING (true);
```

### ❌ Form submit bị lỗi 422

**Nguyên nhân:** Thiếu trường bắt buộc (store_name, address, phone)  
**Giải pháp:** Đảm bảo form gửi đủ 3 trường bắt buộc

### ❌ Deploy thành công nhưng `/api/registrations` trả về 404

**Nguyên nhân:** Thư mục `functions/` chưa được đẩy lên hoặc sai cấu trúc  
**Giải pháp:**
- Kiểm tra thư mục `functions/api/registrations.js` tồn tại trong repo
- Cloudflare Pages tự động nhận diện thư mục `functions/` là Functions

---

## 📞 Hỗ trợ

- Zalo: [https://zalo.me/0888140868](https://zalo.me/0888140868)
- Cloudflare Docs: [https://developers.cloudflare.com/pages/functions/](https://developers.cloudflare.com/pages/functions/)
- Supabase Docs: [https://supabase.com/docs](https://supabase.com/docs).
