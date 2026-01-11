# Nginx Reverse Proxy Configuration

This directory contains the nginx configuration for the production reverse proxy that handles:
- Domain-based routing (vsrecorder.app, api.vsrecorder.app, beta.vsrecorder.app)
- SSL/TLS termination with Let's Encrypt certificates
- HTTP to HTTPS redirection

## Files

| File | Purpose |
|------|---------|
| `nginx.conf` | Main reverse proxy configuration with server blocks for each domain |
| `ssl-params.conf` | SSL/TLS security settings (protocols, ciphers, HSTS) |

## Architecture

```
Internet
    │
    ▼
┌─────────────────────────────────────────────────────┐
│                 Nginx Reverse Proxy                  │
│                   (Port 80/443)                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  vsrecorder.app      → frontend-prod:80             │
│  api.vsrecorder.app  → backend:8080                 │
│  beta.vsrecorder.app → frontend-beta:80             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## How It Works

1. **HTTP Requests (Port 80)**: Redirected to HTTPS, except for Let's Encrypt challenge paths
2. **HTTPS Requests (Port 443)**: Routed based on `server_name`:
   - `vsrecorder.app` → Production frontend container
   - `api.vsrecorder.app` → Backend API container
   - `beta.vsrecorder.app` → Beta frontend container

## SSL Certificate Setup

The configuration expects Let's Encrypt certificates at:
```
/etc/letsencrypt/live/vsrecorder.app/fullchain.pem
/etc/letsencrypt/live/vsrecorder.app/privkey.pem
```

### Generating Certificates (on EC2)

**First time setup** (before nginx is running):
```bash
# Stop nginx if running
sudo docker-compose -f docker-compose.prod.yml down nginx

# Generate certificates using standalone mode
sudo certbot certonly --standalone \
  -d vsrecorder.app \
  -d api.vsrecorder.app \
  -d beta.vsrecorder.app \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email
```

**If nginx is already running** (use webroot mode):
```bash
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d vsrecorder.app \
  -d api.vsrecorder.app \
  -d beta.vsrecorder.app
```

### Auto-Renewal

Set up a cron job for automatic renewal:
```bash
# Edit crontab
sudo crontab -e

# Add this line (runs twice daily)
0 0,12 * * * certbot renew --quiet && docker-compose -f /opt/vsrecorder/docker-compose.prod.yml exec nginx nginx -s reload
```

## Local Development

For local development, you typically don't need this reverse proxy. Instead:
- Frontend runs on `http://localhost:3000`
- Backend runs on `http://localhost:8080`
- Use `docker-compose.yml` (not `docker-compose.prod.yml`)

## Customization

### Adding a New Subdomain

1. Add a new `server` block in `nginx.conf`:
```nginx
server {
    listen 443 ssl;
    server_name newsubdomain.vsrecorder.app;

    ssl_certificate /etc/letsencrypt/live/vsrecorder.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vsrecorder.app/privkey.pem;
    include /etc/nginx/ssl-params.conf;

    location / {
        proxy_pass http://your-service:port;
        # ... proxy headers
    }
}
```

2. Add the subdomain to your SSL certificate:
```bash
sudo certbot certonly --expand -d vsrecorder.app -d api.vsrecorder.app -d beta.vsrecorder.app -d newsubdomain.vsrecorder.app
```

3. Add DNS record in Route 53 (or your DNS provider)

### Adjusting Rate Limits / Timeouts

Edit `nginx.conf` to add:
```nginx
# In http context or server block
client_max_body_size 10M;      # Max upload size
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```

## Troubleshooting

**Check nginx logs:**
```bash
docker-compose -f docker-compose.prod.yml logs nginx
```

**Test configuration:**
```bash
docker-compose -f docker-compose.prod.yml exec nginx nginx -t
```

**Reload after config changes:**
```bash
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

**Certificate issues:**
```bash
# Check certificate expiry
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal
```
