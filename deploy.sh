#!/bin/bash

# Salon Management System - Vercel Deployment Script

echo "🚀 Starting Vercel deployment for Salon Management System..."

# Check if git repository exists
if [ ! -d ".git" ]; then
    echo "📝 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit for salon management system"
fi

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

echo "🔐 Please ensure you have set up the following in your Vercel dashboard:"
echo "   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
echo "   - CLERK_SECRET_KEY"
echo "   - DATABASE_URL"
echo "   - REDIS_URL"
echo "   - UPSTASH_REDIS_REST_URL"
echo "   - UPSTASH_REDIS_REST_TOKEN"
echo ""

echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment completed!"
echo "🌐 Your salon management system should now be live on Vercel!"