# TENGER ATLS — audit ба хэрэгжүүлэлтийн төлөв

2026-11-16. Одоо байгаа Next.js 16 / React 19 / Tailwind 4 / React Three Fiber frontend,
Express 5 / Prisma 7 / PostgreSQL backend-ийг хадгална. Энэ удаагийн хэрэгжүүлэлт: Phase 1.

## Өөрчлөлтийн өмнөх шалгалт

- [x] Frontend TypeScript ба Webpack production build амжилттай.
- [x] Backend TypeScript build, 5 API сценар (6 test result) амжилттай.
- [ ] Frontend lint: 3 алдаа, 5 warning (Next Link, R3F camera mutation, hook dependencies, PostCSS export).
- [x] Өмнөх бодит туршилт: админаас хадгалалт, нийтлэл/ноорог, динамик зураг/асуулт/3 хариулт.
- [ ] Бүрэн браузерын regression suite байгаагүй.

## Checklist

| Хэсэг | Хийгдсэн | Дутуу / асуудал |
|---|---|---|
| Phase 1: дүрслэл | Бараан/алтлаг UI, API зураг, 3D хөвөх/эргэх хөдөлгөөн | WebGL fallback, reduced-motion, зөвхөн keyboard-аар сонгох, төвлөсөн responsive layout, 12 картын хязгаар/санамсаргүй дараалал |
| Phase 1: урсгал | Сэдэв → 3 сонголт → хариулт; давхар даралтын ref хамгаалалт | Modal focus trap/Escape/body scroll, урт текст, алдаатай API payload, хоцорсон хүсэлтийн хамгаалалт |
| Phase 2: schema | Content (TOPIC/QUESTION), Answer, AdminUser, SiteSettings; анхны migration | MediaAsset, VisitorSession, CardSelection, Payment, AuditLog; тусдаа нүүр/арын URL; тогтвортой Answer ID |
| Phase 2: API | Нийтэлсэн контент, admin validation, CRUD transaction | Session/эрхийн серверийн шалгалт, refresh сэргээх, төлбөртэй answer хамгаалалт |
| Phase 3: admin | Login/logout/me, bcrypt, HttpOnly cookie, rate limit, контент CRUD, статус/эрэмбэ, 3 хариултын URL/icon | Upload/хэмжээ/MIME шалгалт, үнэ, үнэгүй тоо, site settings, password change, dashboard статистик/график, payment list |
| Phase 4: QPay | Түр тайлбартай идэвхгүй төлбөрийн цонх | Invoice/QR/bank links/check/webhook, серверийн давхар баталгаажуулалт, idempotency, expiration, transaction unlock, test environment |
| Phase 5: production | .gitignore, frontend/backend build, API тест | SEO бүрэн багц, хууль/нөхцөл/холбоо барих, privacy statistics, backup/restore, CI/deployment, upload security, secret rotation |

## Production-д гаргахаас өмнөх хориглох асуудал

1. `POST /api/contents/:contentId/answers/:answerId/reveal` одоогоор зочны эрх шалгахгүй.
   Frontend-ийн эхний үнэгүй/дараагийн түгжээ нь зөвхөн demo UI; төлбөрийн хамгаалалт биш.
2. Refresh дээр нээсэн картын client state арилна. LocalStorage-д эрх бичиж засахгүй:
   серверийн session + CardSelection + Payment хэрэгтэй (Phase 2/4).
3. `back-end/.env` өмнөх Git commit-д бүртгэгдсэн. Одоогийн index-ээс салгах нь түүхийг
   цэвэрлэхгүй. Тэнд байсан бодит нууцуудыг үйлчилгээ бүр дээр солих шаардлагатай.
4. Админ контент засахад Answer мөрүүд устаж дахин үүсдэг. Unlock migration хийхээс өмнө
   ID хадгалсан update/versioning хэрэгтэй.
5. Бодит DB-д 12 нийтлэгдсэн, зурагтай контент бэлдэх ёстой. Frontend дутуу картыг
   зохиож нэмэхгүй; эхний 12 нийтлэгдсэн картыг харуулна. Демо тестийн fixture нь production контент биш.

## Phase 1-ийн хил

Нүүр/арын зураг тусдаа дүрслэх frontend гэрээг (`backImageUrl`) бэлтгэнэ; одоогийн schema-д
байхгүй талбарын migration/upload/admin UI нь Phase 2/3-д үлдэнэ. Нүүр болон гурван хариулт
одоогийн API зураг/icon-ыг ашиглана. QPay-ийн амжилтыг дуурайлган харуулахгүй.
Сэдэв ба асуулт хоёул гурван сонголттой; төрөл, асуултын текст UI-д тусдаа харагдана.

## Дараагийн дараалал

1. Additive migration: media/front/back, тогтвортой AnswerOption, VisitorSession/selection/payment/audit.
2. Transaction-тай free allowance ба серверийн эрх, session сэргээх; шууд reveal-ийг хаах.
3. Admin upload/settings/statistics болон 12 бодит контентын seed/import.
4. QPay credentials-ийг зөвхөн server env-д, test mode-ийг ил тэмдэглэж, invoice/check/callback баталгаажуулах.
5. Security/SEO/legal/deploy/backup болон бодит төлбөрийн acceptance test.

## Phase 1 — хэрэгжүүлсэн үр дүн

- API-аас эхний 12 нийтэлсэн картыг авч санамсаргүй байрлуулна; production контентыг hardcode хийгээгүй.
- OracleScene: responsive 3D байрлал, зөөлөн flip, тусдаа нүүр/арын зураг дүрслэх боломж,
  WebGL тасрах/дэмжихгүй үед 2D fallback, reduced-motion, modal нээлттэй үед animation pause.
- Drei Html portal-ийг DOM button давхаргаар сольж, keyboard сонголт болон unmount урсгалыг зассан.
- Гурван хариулт тус бүр API зураг/icon хэрэглэнэ. Modal focus trap, Escape, focus буцаах,
  урт текст, loading/error/retry, давхар даралт болон хоцорсон хүсэлтийн хамгаалалт нэмсэн.
- Монгол кирилл фонт, metadata, бараан/алтлаг картын хүрээ; хуучин үндсэн загварыг хадгалсан.
- Windows build-д Webpack + албан ёсны Tailwind PostCSS ашиглав.
- Шинэ dev dependency: `@playwright/test` — давтагдах браузерын regression тестэд.
- `.env`-ийг Git tracking-аас хасаж, нууцгүй example нэмсэн. Өмнөх түүх дэх нууцуудыг солих шаардлага хэвээр.

### Баталгаажуулалт

- Frontend lint, TypeScript, production build амжилттай.
- Backend build болон API тест: 6/6 амжилттай.
- Chrome E2E: 12/12 амжилттай. 390/768/1440px байрлал, 3 сонголт, хоёр дахь картын demo түгжээ,
  алдаа/дахин оролдох, хуучирсан хүсэлт, WebGL fallback/context loss, reduced-motion,
  keyboard/focus, refresh-д өөрчлөгдсөн API контент болон давхар даралт шалгасан.
- E2E нь API-г mock хийсэн. Бодит админ API-ийн өмнөх smoke шалгалтаар үүсгэх/засах/нийтлэх/нуух,
  зураг/асуулт/хариултын шинэчлэлтийг шалгаж, түр контентыг цэвэрлэсэн.
- Бодит QPay төлбөр, серверийн эрх, refresh-д unlock сэргээх, бодит гар утасны GPU performance
  энэ үе шатанд баталгаажаагүй. Phase 2–5 үлдсэн.
