# App Quality & Technical Audit Report

**Project Name:** TruckSuperSoftware  
**Generated On:** 2026-07-26 07:58:29  
**Target Architecture:** Next.js / Supabase / Tailwind CSS / Vercel  

---

## 1. Codebase Overview & Metrics
* **Total Tracked Files:** 179
* **Source Code Files (.js, .jsx, .ts, .tsx):** 125
* **Total Lines of Code (LOC):** 17700
* **Automation Scripts (.sh):** 21

---

## 2. Directory Structure Breakdown
```text
total 337
drwx------.  15 u0_a558 u0_a558  3452 Jul 26 07:58 .
drwx------.  39 u0_a558 u0_a558  3452 Jul 25 15:28 ..
-rw-------.   1 u0_a558 u0_a558  1585 Jul  5 23:56 .env.local
-rw-------.   1 u0_a558 u0_a558  1291 Jul  5 23:52 .env.vercel
drwx------.   7 u0_a558 u0_a558  3452 Jul 13 01:28 .git
drwx------.   3 u0_a558 u0_a558  3452 Jun 17 16:25 .github
-rw-------.   1 u0_a558 u0_a558    89 Jul  8 01:16 .gitignore
drwx------.   7 u0_a558 u0_a558  3452 Jul 21 00:15 .next
drwx------.   2 u0_a558 u0_a558  3452 Jun 17 16:33 .vercel
-rw-------.   1 u0_a558 u0_a558     0 Jun 17 16:25 0
-rw-------.   1 u0_a558 u0_a558     0 Jun 17 16:25 Build
-rwx------.   1 u0_a558 u0_a558  2083 Jun 17 16:25 add_tracking.sh
-rwx------.   1 u0_a558 u0_a558  3077 Jun 17 16:25 analyze.sh
drwx------.  12 u0_a558 u0_a558  3452 Jul  4 16:06 app
-rwx------.   1 u0_a558 u0_a558  7218 Jun 17 16:25 audit.sh
-rwx------.   1 u0_a558 u0_a558  2339 Jul 26 07:58 audit_project.sh
-rwx------.   1 u0_a558 u0_a558  2098 Jun 17 16:25 business_valuation.sh
-rwx------.   1 u0_a558 u0_a558  4490 Jun 17 16:25 check.sh
-rwx------.   1 u0_a558 u0_a558  6851 Jun 17 16:25 check_ai.sh
-rwx------.   1 u0_a558 u0_a558  2465 Jun 17 16:25 check_routes.sh
drwx------.   2 u0_a558 u0_a558  3452 Jun 22 10:24 components
-rwx------.   1 u0_a558 u0_a558 56137 Jun 17 16:25 deploy_invoice_system.sh
-rwx------.   1 u0_a558 u0_a558  6173 Jun 17 16:25 enterprise_audit.sh
-rwx------.   1 u0_a558 u0_a558  2070 Jun 17 16:25 go_live_audit.sh
-rwx------.   1 u0_a558 u0_a558  3896 Jul 13 01:27 healthcheck.sh
-rw-------.   1 u0_a558 u0_a558    93 Jun 17 16:25 jsconfig.json
drwx------.   2 u0_a558 u0_a558  3452 Jun 20 00:16 lib
drwx------.   2 u0_a558 u0_a558  3452 Jun 27 01:06 logs
-rw-------.   1 u0_a558 u0_a558     0 Jun 17 16:25 main
-rw-------.   1 u0_a558 u0_a558   807 Jun 19 11:32 middleware.js
-rwx------.   1 u0_a558 u0_a558   938 Jun 17 16:25 monitor.sh
-rw-------.   1 u0_a558 u0_a558   860 Jun 17 16:25 next.config.js
drwx------. 131 u0_a558 u0_a558  8192 Jun 22 02:10 node_modules
-rw-------.   1 u0_a558 u0_a558 90575 Jun 22 02:10 package-lock.json
-rw-------.   1 u0_a558 u0_a558  1073 Jul  5 23:42 package.json
-rw-------.   1 u0_a558 u0_a558   210 Jun 17 16:25 playwright.config.js
-rw-------.   1 u0_a558 u0_a558    82 Jun 17 16:25 postcss.config.js
drwx------.   2 u0_a558 u0_a558  3452 Jul 13 01:22 public
-rw-------.   1 u0_a558 u0_a558 10743 Jun 17 16:25 report.txt
drwx------.   2 u0_a558 u0_a558  3452 Jun 27 01:13 scripts
drwx------.   3 u0_a558 u0_a558  3452 Jun 17 16:25 supabase
-rw-------.   1 u0_a558 u0_a558   303 Jun 17 16:25 tailwind.config.js
-rwx------.   1 u0_a558 u0_a558  5136 Jun 17 16:25 test_all.sh
-rwx------.   1 u0_a558 u0_a558  3071 Jun 17 16:25 test_api.sh
drwx------.   2 u0_a558 u0_a558  3452 Jun 17 16:25 tests
-rw-------.   1 u0_a558 u0_a558    98 Jun 17 16:25 vercel.json
```

---

## 3. Code Quality & Linting
⚠️ **ESLint Summary:** Issues detected during linting.
```text
Need to install the following packages:
eslint@10.8.0
Ok to proceed? (y) 
Oops! Something went wrong! :(

ESLint: 10.8.0

ESLint couldn't find an eslint.config.(js|mjs|cjs) file.

From ESLint v9.0.0, the default configuration file is now eslint.config.js.
If you are using a .eslintrc.* file, please follow the migration guide
to update your configuration file to the new format:

https://eslint.org/docs/latest/use/configure/migration-guide

If you still have problems after following the migration guide, please stop by
https://eslint.org/chat/help to chat with the team.
```

---

## 4. Security & Dependency Audit
```text
npm warn Unknown cli config "--summary". This will stop working in the next major version of npm.
# npm audit report

next  9.3.4-canary.0 - 16.3.0-preview.7
Severity: high
Next.js: Middleware / Proxy bypass in App Router applications using Turbopack and single locale - https://github.com/advisories/GHSA-6gpp-xcg3-4w24
Next.js: Denial of Service in App Router using Server Actions - https://github.com/advisories/GHSA-m99w-x7hq-7vfj
Next.js: Server-Side Request Forgery in Server Actions on custom servers - https://github.com/advisories/GHSA-89xv-2m56-2m9x
Next.js: Cache confusion of response bodies for requests with bodies - https://github.com/advisories/GHSA-68g3-v927-f742
Next.js: Cache confusion of response bodies for requests with bodies containing invalid UTF-8 byte sequences - https://github.com/advisories/GHSA-4633-3j49-mh5q
Next.js: Unbounded Server Action payload in Edge runtime - https://github.com/advisories/GHSA-4c39-4ccg-62r3
Next.js: Server-Side Request Forgery in rewrites via attacker-controlled destination hostname - https://github.com/advisories/GHSA-p9j2-gv94-2wf4
Next.js: Denial of Service in the Image Optimization API using SVGs - https://github.com/advisories/GHSA-q8wf-6r8g-63ch
Next.js: Unauthenticated disclosure of internal Server Function endpoints - https://github.com/advisories/GHSA-955p-x3mx-jcvp
Depends on vulnerable versions of postcss
Depends on vulnerable versions of sharp
fix available via `npm audit fix --force`
Will install next@16.2.12, which is outside the stated dependency range
node_modules/next

postcss  <=8.5.17
Severity: high
PostCSS has XSS via Unescaped </style> in its CSS Stringify Output - https://github.com/advisories/GHSA-qx2v-qp2m-jg93
PostCSS: Arbitrary file read and information disclosure via attacker-controlled sourceMappingURL in CSS comments - https://github.com/advisories/GHSA-6g55-p6wh-862q
PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure - https://github.com/advisories/GHSA-r28c-9q8g-f849
fix available via `npm audit fix --force`
Will install next@16.2.12, which is outside the stated dependency range
node_modules/next/node_modules/postcss
node_modules/postcss

sharp  <0.35.0
Severity: high
sharp inherited vulnerabilities in libvips: CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591 - https://github.com/advisories/GHSA-f88m-g3jw-g9cj
fix available via `npm audit fix --force`
Will install next@16.2.12, which is outside the stated dependency range
node_modules/sharp

3 high severity vulnerabilities

To address all issues, run:
  npm audit fix --force
```

---

## 5. Automation & Utility Inventory
Listed bash scripts responsible for CI/CD, route checking, and operational management:
* ./add_tracking.sh
* ./analyze.sh
* ./audit.sh
* ./business_valuation.sh
* ./check.sh
* ./check_ai.sh
* ./check_routes.sh
* ./deploy_invoice_system.sh
* ./enterprise_audit.sh
* ./go_live_audit.sh
* ./monitor.sh
* ./test_all.sh
* ./test_api.sh
* ./scripts/security-audit.sh
* ./scripts/smoke-test.sh
* ./scripts/pre-launch-check.sh
* ./scripts/audit-multitenant.sh
* ./scripts/health-check.sh
* ./scripts/e2e-test.sh
* ./healthcheck.sh
* ./audit_project.sh

---
*Report generated automatically via audit_project.sh*
