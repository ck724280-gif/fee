## 2026-08-15T07:46:49Z
Task Assignment: Worker M5 (Authentication, Security, Audit Logging & Deployment Specialist)
Working directory: d:\antigravity programme\tuition_manager\.agents\worker_m5
Authoritative requirements: d:\antigravity programme\tuition_manager\.agents\ORIGINAL_REQUEST.md
Project blueprint: d:\antigravity programme\tuition_manager\PROJECT.md
Features and Security spec: d:\antigravity programme\tuition_manager\.agents\miner_survey_3\features_spec.md
Workspace root: d:\antigravity programme\tuition_manager

Task Details:
1. `src/lib/auth.ts`:
   - Edge-compatible JWT signing and verification using `jose` (`SignJWT`, `jwtVerify`, HS256).
   - Password hashing and comparison using `bcryptjs` (`hashPassword`, `comparePassword`).
   - Cookie management constants and helpers (`COOKIE_NAME = 'dpr_auth_token'`, `signToken`, `verifyToken`).
   - User session helpers (`getCurrentUser`, `createSession`).
2. `src/middleware.ts`:
   - Next.js Edge middleware protecting all dashboard routes (`/`, `/dashboard`, `/(dashboard)/*`, `/students/*`, `/classes/*`, `/fees/*`, `/payments/*`, `/reports/*`, `/settings/*`) and API routes `/api/*` (except public routes: `/api/auth/login`, `/api/documents/*`).
   - Returns JSON `{ error: 'Unauthorized', message: 'Authentication required' }` with status 401 for unauthenticated `/api/*` requests.
   - Redirects unauthenticated page requests to `/login`.
   - Passes authenticated user headers (`x-user-id`, `x-user-email`, `x-user-role`) downstream.
3. `src/app/login/page.tsx`:
   - Premium, clean SaaS login page with "DPR Private Tuition" branding, lock/shield icons, email and password inputs, form validation with Zod, demo credentials helper pill (`admin@dprtuition.com` / `Admin@123`), error state alert, and redirect upon successful login.
4. API Route Handlers:
   - `src/app/api/auth/login/route.ts`: Validates email and password against `User` table using `bcryptjs`, issues `jose` signed JWT, sets `httpOnly`, `secure`, `sameSite: 'lax'`, `path: '/'` cookie, and logs LOGIN event in AuditLog.
   - `src/app/api/auth/logout/route.ts`: Clears auth cookie and logs LOGOUT event.
   - `src/app/api/auth/me/route.ts`: Returns current authenticated admin profile.
5. `src/lib/audit.ts`:
   - `createAuditLog({ userId, action, entity, entityId, details, ipAddress })` recording to `AuditLog` table.
   - Integrate with login, logout, student CRUD, class CRUD, fee generation, payment recording, and settings updates.
6. `vercel.json`:
   - Vercel configuration for deployment.
7. `README.md`:
   - Exhaustive documentation with features summary, tech stack, architecture, local setup guide, environment variables reference, seed credentials (`admin@dprtuition.com` / `Admin@123`), test execution instructions (`npx tsx tests/run-all.ts`), and Vercel deployment guide.
8. Execution and verification:
   - Run `npx prisma validate`
   - Run `npx tsc --noEmit`
   - Run `npm run build`
   - Run `npx tsx tests/run-all.ts`
   - Run security tests `npx tsx tests/tier1_features/08_security_audit.test.ts` and `npx tsx tests/tier2_boundaries/03_security_boundaries.test.ts`
9. Write comprehensive handoff report to `handoff.md` and notify parent.
