#!/usr/bin/env bash
# ==============================================================================
# AI Accounting Frontend Deployment Script for VPS
# Usage: bash deploy.sh
# ==============================================================================

set -e

echo "🚀 Starting AI Accounting Frontend Deployment on VPS..."

WEB_ROOT="/var/www/aicount-ui"
NGINX_CONF_SRC="nginx.conf"
NGINX_CONF_DEST="/etc/nginx/sites-available/aicount.conf"
NGINX_CONF_LINK="/etc/nginx/sites-enabled/aicount.conf"

# 1. Setup Nginx Configuration if not already linked
if [ ! -f "$NGINX_CONF_DEST" ] && [ -f "$NGINX_CONF_SRC" ]; then
    echo "📄 Configuring Nginx..."
    cp "$NGINX_CONF_SRC" "$NGINX_CONF_DEST"
    ln -sf "$NGINX_CONF_DEST" "$NGINX_CONF_LINK"
    nginx -t
    systemctl reload nginx
    echo "✅ Nginx configured and reloaded."
fi

# 2. Build and Deploy Frontend
echo "🎨 Building Frontend (Vite)..."
npm install
npm run build

mkdir -p "$WEB_ROOT"
rm -rf "$WEB_ROOT"/*
cp -r dist/* "$WEB_ROOT"/
chown -R www-data:www-data "$WEB_ROOT"
chmod -R 755 "$WEB_ROOT"

echo "✅ Frontend static files deployed to $WEB_ROOT!"
echo "🎉 Frontend Deployment complete!"
