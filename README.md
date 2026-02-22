# Hatinh.vip – Landing Page + Admin Dashboard

> **Nền tảng làm website miễn phí cho quán xá, cửa hàng, doanh nghiệp tại Hà Tĩnh.**  
> Triển khai trên **Cloudflare Pages** (hosting miễn phí) + **Supabase** (database miễn phí).

---

## 🎯 Mục tiêu

Landing page 1 trang cho **hatinh.vip** – thu thập đăng ký từ chủ quán muốn có website miễn phí, kèm trang admin để quản lý danh sách đăng ký.

---

## ✅ Tính năng đã hoàn thiện

### Landing Page (`index.html`)

| Section | Nội dung |
|---|---|
| 🧭 Navbar cố định | Logo + nút CTA "Đăng ký miễn phí" |
| 🦸 Hero | Headline, mô tả, 2 nút CTA, trust indicators (24h / 0đ / 100%) |
| ❓ Problem | Mô tả hành vi khách tìm quán, vấn đề chưa có website |
| 💡 What is | Giải thích Hatinh.vip bằng ngôn ngữ dễ hiểu |
| 🌐 Domain Examples | 4 ví dụ tên miền + danh sách nội dung trong website |
| 💸 Free | Banner 0 đồng, danh sách cam kết miễn phí |
| 👑 VIP Explain | Giải thích vui VIP = Vào Internet Phải có |
| 👥 Who | 8 loại hình kinh doanh phù hợp |
| ⭐ Benefits | 6 lợi ích có website |
| 🔼 Upgrade | So sánh miễn phí vs nâng cấp |
| ⏱ Timeline | 4 bước quy trình làm web trong 24h |
| ❤️ Why | Lý do Hatinh.vip tồn tại |
| 📝 CTA Form | Form đăng ký → POST `/api/registrations` → Supabase |
| 🔻 Footer | Links + tagline |

### Admin Dashboard (`admin.html`)

| Tính năng | Mô tả |
|---|---|
| 📊 Stats cards | Tổng đăng ký / Chưa xử lý / Đã liên hệ / Hôm nay |
| 🔍 Filter & Search | Tìm theo tên, địa chỉ, SĐT; lọc theo trạng thái; sắp xếp |
| 📋 Data table | Phân trang 15 dòng/trang, đầy đủ thông tin |
| 👁 Modal chi tiết | Xem đầy đủ thông tin 1 đăng ký |
| ✅ Mark done | Đánh dấu "Đã liên hệ" (PATCH `/api/registrations/:id`) |
| 🗑 Delete | Xóa đăng ký (DELETE `/api/registrations/:id`) |
| 📤 Export CSV | Xuất danh sách đang filter ra file CSV (UTF-8 BOM) |
| 🔄 Auto-refresh | Tự động tải lại dữ liệu mỗi 60 giây |

### Cloudflare Pages Functions (Backend)

| File | Route | Methods |
|---|---|---|
| `functions/api/registrations.js` | `/api/registrations` | GET, POST |
| `functions/api/registrations/[id].js` | `/api/registrations/:id` | GET, PATCH, PUT, DELETE |

---

## 📁 Cấu trúc file

```
hatinh-vip/
├── index.html                          ← Landing page (1 file, ~41KB)
├── mau.html                            ← Gallery xem tất cả mẫu website
├── admin.html                          ← Admin dashboard (~34KB)
├── _redirects                          ← Cloudflare Pages redirect rules
├── wrangler.toml                       ← Cloudflare Wrangler config (deploy CLI)
├── README.md                           ← Tài liệu dự án (file này)
├── DEPLOY.md                           ← Hướng dẫn triển khai chi tiết đầy đủ
├── demo/
│   ├── quan-an.html                    ← Mẫu quán ăn / nhà hàng
│   ├── cafe.html                       ← Mẫu cà phê / trà sữa
│   ├── spa.html                        ← Mẫu spa / tiệm tóc / nail
│   ├── gara.html                       ← Mẫu gara / sửa chữa
│   ├── cua-hang.html                   ← Mẫu cửa hàng bán lẻ
│   └── phong-kham.html                 ← Mẫu phòng khám / nha khoa
└── functions/
    └── api/
        ├── registrations.js            ← Handler GET (list) + POST (create)
        └── registrations/
            └── [id].js                 ← Handler GET / PATCH / DELETE theo ID
```

---

## 🎨 Website Mẫu Demo

| Mẫu | File | Màu chủ đạo |
|---|---|---|
| 🍜 Quán ăn / Nhà hàng | `demo/quan-an.html` | Cam đất `#d97706` |
| ☕ Cà phê / Trà sữa | `demo/cafe.html` | Xanh navy `#1d4ed8` |
| 💆 Spa / Tiệm tóc | `demo/spa.html` | Tím `#9333ea` |
| 🔧 Gara / Sửa chữa | `demo/gara.html` | Xanh lá `#16a34a` |
| 🛍️ Cửa hàng bán lẻ | `demo/cua-hang.html` | Cam đỏ `#ea580c` |
| 🏥 Phòng khám / Nha khoa | `demo/phong-kham.html` | Xanh dương `#1d4ed8` |

**Gallery tổng hợp:** `mau.html` — lọc theo ngành, preview card browser mockup.

---

## 🌐 API Endpoints

> Base URL: `https://hatinh.vip` (sau khi deploy)

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/api/registrations` | Lấy danh sách đăng ký (phân trang, tìm kiếm) |
| `POST` | `/api/registrations` | Tạo đăng ký mới |
| `GET` | `/api/registrations/:id` | Lấy chi tiết 1 đăng ký |
| `PATCH` | `/api/registrations/:id` | Cập nhật trạng thái / thông tin |
| `DELETE` | `/api/registrations/:id` | Xóa đăng ký |

### Query parameters cho GET `/api/registrations`

| Param | Default | Mô tả |
|---|---|---|
| `page` | `1` | Số trang |
| `limit` | `100` | Số dòng mỗi trang |
| `search` | – | Tìm theo store_name, address, phone |
| `sort` | `created_at` | Trường để sắp xếp (DESC) |

---

## 🗄️ Data Model

### Supabase Table: `registrations`

| Field | Type | Nullable | Mô tả |
|---|---|---|---|
| `id` | UUID | NOT NULL | Primary key, tự sinh (`gen_random_uuid()`) |
| `store_name` | TEXT | NOT NULL | Tên quán / cửa hàng |
| `address` | TEXT | NOT NULL | Địa chỉ kinh doanh |
| `phone` | TEXT | NOT NULL | Số điện thoại / Zalo |
| `note` | TEXT | NULL | Ghi chú thêm |
| `status` | TEXT | NOT NULL | `new` \| `done` \| `skip` (default: `new`) |
| `submitted_at` | TIMESTAMPTZ | NOT NULL | Thời điểm đăng ký (từ client) |
| `created_at` | TIMESTAMPTZ | NOT NULL | Tự động (server) |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Tự động cập nhật qua trigger |

---

## ⚙️ Biến môi trường (Environment Variables)

Thiết lập trong **Cloudflare Pages → Settings → Environment variables**:

| Tên biến | Mô tả | Ví dụ |
|---|---|---|
| `SUPABASE_URL` | URL project Supabase | `https://xyzxyz.supabase.co` |
| `SUPABASE_ANON_KEY` | Anon/public key của Supabase | `eyJhbGciOiJI...` |

> **Xem hướng dẫn lấy credentials tại:** [DEPLOY.md – Phần 1.3](./DEPLOY.md)

---

## 🚀 Triển khai nhanh

```bash
# 1. Clone/download dự án
git clone https://github.com/YOUR_USERNAME/hatinh-vip.git
cd hatinh-vip

# 2. Deploy lên Cloudflare Pages
wrangler login
wrangler pages deploy . --project-name=hatinh-vip

# 3. Set biến môi trường
wrangler pages secret put SUPABASE_URL --project-name=hatinh-vip
wrangler pages secret put SUPABASE_ANON_KEY --project-name=hatinh-vip
```

> **Hướng dẫn đầy đủ** (bao gồm Supabase SQL, custom domain, bảo mật admin): xem **[DEPLOY.md](./DEPLOY.md)**

---

## 🔗 URLs sau khi deploy

| URL | Mô tả |
|---|---|
| `https://hatinh.vip` | Landing page |
| `https://hatinh.vip/admin.html` | Admin dashboard |
| `https://hatinh.vip/api/registrations` | API endpoint |
| `https://YOUR-PROJECT.pages.dev` | Cloudflare Pages preview URL |

---

## 🛠 Stack công nghệ

| Layer | Công nghệ | Ghi chú |
|---|---|---|
| Hosting | Cloudflare Pages | Free tier – unlimited bandwidth |
| Backend/API | Cloudflare Pages Functions (Edge Workers) | Serverless, edge computing |
| Database | Supabase (PostgreSQL) | Free tier – 500MB storage, 2GB bandwidth/tháng |
| Frontend | HTML + CSS + Vanilla JS | Không cần framework |
| Fonts | Google Fonts – Be Vietnam Pro | CDN |
| Icons | Font Awesome 6 | CDN |

---

## 📋 Chưa triển khai / Gợi ý bước tiếp theo

- [x] ~~Website mẫu demo~~ → **mau.html + demo/*.html** ✅ (6 mẫu)
- [ ] **Bảo mật Admin**: Thêm Cloudflare Access (OTP email) để chặn truy cập trái phép vào `/admin.html`
- [ ] **Thông báo Telegram/Zalo**: Gửi tin nhắn tự động khi có đăng ký mới (xem DEPLOY.md Phần 5.2)
- [ ] **SEO nâng cao**: Thêm `og:image`, `og:title`, sitemap.xml, schema.org
- [ ] **Trang portfolio**: Danh sách các website đã làm cho khách hàng thực tế
- [ ] **Trang FAQ**: Câu hỏi thường gặp riêng
- [ ] **Rate limiting**: Chống spam form đăng ký (Cloudflare WAF hoặc IP throttle trong Function)
- [ ] **Analytics**: Tích hợp Cloudflare Web Analytics (miễn phí, không cookie)

---

*© 2026 HaTinh.Vip – Nền tảng website miễn phí cho Hà Tĩnh*
