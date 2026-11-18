import {defineConfig} from '@playwright/test'
export default defineConfig({
 testDir:'./e2e',testMatch:'meta-connections.spec.ts',timeout:45000,workers:1,
 use:{baseURL:'http://localhost:3110',browserName:'chromium',channel:process.env.CI?undefined:'chrome',trace:'retain-on-failure'},
 webServer:[
  {command:'node e2e/fixtures/meta-supabase.mjs',url:'http://127.0.0.1:3197/auth/v1/user',env:{NODE_ENV:'test'},reuseExistingServer:false},
  {command:'node_modules/.bin/next dev -p 3110',url:'http://localhost:3110/login',timeout:90000,reuseExistingServer:false,
   env:{NEXT_BUILD_DIR:'.next-meta-qa',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3197',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'dummy-anon-key',
    SUPABASE_SECRET_KEY:'dummy-service-role-key',NEXT_PUBLIC_APP_ENV:'local',LILLY_NATIVE_SALES_ENABLED:'true',LILLY_NATIVE_SALES_PRIMARY:'true'}},
 ],
})
