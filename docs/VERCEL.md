# Backend-ийг Vercel-д байрлуулах

Frontend: https://front-end-dun-beta.vercel.app

## 1. Backend project

Vercel → Add New → Project → `Boona06/tengri` repository-г дахин import хийнэ.

- Project name: `tenger-atls-api` (эсвэл өөр сул нэр).
- Root Directory: **back-end**.
- Framework: **Express**. Next.js сонгохгүй.
- Build Command: `npm run vercel-build` (`vercel.json`-д тохируулсан).
- Output Directory-г өөрөө `dist` гэж тохируулахгүй; Express preset-ийн default-ыг хэрэглэнэ.

Backend project-ийн Environment Variables (Production):

| Нэр | Утга |
|---|---|
| `DATABASE_URL` | Prisma-ийн PostgreSQL connection string; локал ажиллаж буй нууц тохиргоо эсвэл Prisma Connect-оос авна. Dashboard URL биш. |
| `DIRECT_URL` | Migration-д зориулсан PostgreSQL connection string. |
| `ADMIN_SESSION_SECRET` | Өөрийн шинээр үүсгэсэн 32-оос урт санамсаргүй нууц. Git түүхэнд байсан хуучин нууцыг бүү ашигла. |
| `FRONTEND_ORIGIN` | `https://front-end-dun-beta.vercel.app` — төгсгөлд `/` нэмэхгүй. |
| `NODE_ENV` | `production` |

Нууц утгыг frontend project-ийн `NEXT_PUBLIC_*` хувьсагчид эсвэл Git-д оруулахгүй.
`ADMIN_EMAIL`, `ADMIN_PASSWORD` нь админ үүсгэх локал script-д хэрэглэгддэг; ажиллаж буй API-д шаардлагагүй.

Build нь Prisma client үүсгээд TypeScript шалгана. Database migration-ийг build болгонд автоматаар ажиллуулахгүй.
Шинэ database бол зөв database-ийн env тохируулсан `back-end` хавтаснаас `npm run db:migrate:deploy`
ажиллуулна. Одоо ашиглаж буй database-ийн мэдээллийг устгах/reset хийх шаардлагагүй.

Deploy дуусмагц бодитоор үүссэн backend URL дээр `/api/health` нээнэ.
200 + `database: CONNECTED` байх ёстой. `/api/contents` нь нийтэлсэн картуудыг буцаана.
Root `/` дээр 404 ирэх нь health шалгалт биш.
Frontend-ээс public API ашиглах тул production deployment нь Vercel login шаарддаг protection-оор хаагдаагүй байх ёстой.

## 2. Frontend холболт

Одоо байгаа frontend project → Settings → Environment Variables:

`NEXT_PUBLIC_API_URL` = `https://front-end-dun-beta.vercel.app` (frontend-ийн origin).

`BACKEND_API_URL` = deploy-оос гарсан backend-ийн **HTTPS origin**, төгсгөлд `/api` эсвэл `/` нэмэхгүй.

Next.js rewrite нь frontend-ийн `/api/*` хүсэлтийг backend рүү дамжуулна.
Ингэснээр browser-ийн админ cookie frontend domain дээр үлдэж, third-party cookie-оос хамаарахгүй.

Production environment-д хадгалж frontend-ийг **Redeploy** хийнэ.
Backend URL-ийг урьдчилж тааж тохируулахгүй. Database URL-ийг энэ хувьсагчид хэзээ ч оруулахгүй.

## 3. Баталгаажуулах

- Backend `/api/health` болон `/api/contents` 200.
- Frontend Network хүсэлт `localhost:4000` биш frontend-ийн `/api/*` руу очиж, rewrite-аар backend-д хүрнэ.
- CORS origin frontend-ийн яг одоогийн domain-тай таарна.
- Карт байхгүй үед холболтын алдаа биш хоосон контентын төлөв гарна.
- Admin login/logout/refresh-ийг тусад нь шалгана. Same-origin rewrite ашиглаж байгаа тул
  `HttpOnly`, `Secure`, `SameSite=Lax` cookie-г сулруулах шаардлагагүй.

Энэ нь production төлбөрийн бэлэн хувилбар биш: session/unlock болон QPay-ийн үлдсэн ажлыг `AUDIT.md`-ээс харна уу.

Албан ёсны заавар: https://vercel.com/docs/frameworks/backend/express
