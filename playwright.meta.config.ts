import {defineConfig} from '@playwright/test'
export default defineConfig({
 // Dev-mode `next dev` JIT-compiles each route on first hit, and /stratix-mkt is heavy;
 // under load the default 5s expect() timeout and even the 45s test timeout got flaky
 // (confirmed: 8/10 runs failed at various `toBeVisible` assertions or a `page.goto`
 // before this fix, same symptom `playwright.config.ts`'s own comment already describes
 // for a different route). Raised, not removed — same assertions, more real time to settle.
 testDir:'./e2e',testMatch:'meta-connections.spec.ts',timeout:90000,workers:1,
 expect:{timeout:15000},
 use:{baseURL:'http://localhost:3110',browserName:'chromium',channel:process.env.CI?undefined:'chrome',trace:'retain-on-failure'},
 webServer:[
  {command:'node e2e/fixtures/meta-supabase.mjs',url:'http://127.0.0.1:3197/auth/v1/user',env:{NODE_ENV:'test'},reuseExistingServer:false},
  {command:'node_modules/.bin/next dev -p 3110',url:'http://localhost:3110/login',timeout:90000,reuseExistingServer:false,
   env:{NEXT_BUILD_DIR:'.next-meta-qa',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3197',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'dummy-anon-key',
    SUPABASE_SECRET_KEY:'dummy-service-role-key',NEXT_PUBLIC_APP_ENV:'local',LILLY_NATIVE_SALES_ENABLED:'true',LILLY_NATIVE_SALES_PRIMARY:'true'}},
 ],
})
