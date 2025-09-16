# Salon Management System - Vercel Deployment Checklist

## ✅ Pre-Deployment Checklist

### Files to Upload to GitHub:
- [ ] All app/ folder contents
- [ ] components/ folder
- [ ] lib/ folder  
- [ ] public/ folder
- [ ] scripts/ folder (database migrations)
- [ ] styles/ folder
- [ ] types/ folder
- [ ] package.json
- [ ] package-lock.json or pnpm-lock.yaml
- [ ] next.config.mjs
- [ ] middleware.ts
- [ ] tsconfig.json
- [ ] vercel.json
- [ ] .gitignore
- [ ] tailwind.config.js (if exists)
- [ ] postcss.config.mjs

### ❌ Files NOT to Upload:
- [ ] .env.local (contains sensitive data)
- [ ] node_modules/ (will be installed by Vercel)
- [ ] .next/ (build folder)
- [ ] *.log files

## 🚀 Deployment Steps Completed:
- [ ] GitHub repository created
- [ ] Files uploaded to GitHub
- [ ] Vercel project created
- [ ] Environment variables configured
- [ ] First deployment successful
- [ ] Clerk URLs updated
- [ ] Application tested

## 🔧 Environment Variables to Set in Vercel:
- [ ] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- [ ] CLERK_SECRET_KEY
- [ ] DATABASE_URL
- [ ] REDIS_URL
- [ ] UPSTASH_REDIS_REST_URL
- [ ] UPSTASH_REDIS_REST_TOKEN
- [ ] NODE_ENV=production
- [ ] APP_URL (your vercel domain)
- [ ] ENCRYPTION_KEY
- [ ] JWT_SECRET