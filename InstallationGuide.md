# FacMan VPS Installation Guide

Complete guide for deploying the FacMan backend on a fresh Ubuntu VPS.

---

## 1. Initial VPS Setup

### 1.1 Log in as root

```bash
ssh root@YOUR_VPS_IP
```

### 1.2 Update the system

```bash
apt update && apt upgrade -y
```

### 1.3 Set the hostname

```bash
hostnamectl set-hostname facman-server
```

### 1.4 Set the timezone

```bash
timedatectl set-timezone UTC
```

---

## 2. Create a Dedicated User

Since you will host multiple apps on this VPS, create a dedicated user for FacMan.

```bash
adduser facman
usermod -aG sudo facman
```

Switch to the new user:

```bash
su - facman
```

From this point forward, all commands are run as the `facman` user (using `sudo` when needed).

---

## 3. Secure the VPS

### 3.1 Set up SSH key authentication (from your local machine)

```bash
# On your LOCAL machine, generate a key if you don't have one:
ssh-keygen -t ed25519 -C "facman-vps"

# Copy it to the server:
ssh-copy-id facman@YOUR_VPS_IP
```

### 3.2 Harden SSH

```bash
sudo nano /etc/ssh/sshd_config
```

Change/add these lines:

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Restart SSH:

```bash
sudo systemctl restart sshd
```

> **Important:** Keep your current SSH session open and test login in a new terminal before closing it.

### 3.3 Set up the firewall (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 4. Install System Dependencies

```bash
sudo apt install -y \
    python3 python3-pip python3-venv python3-dev \
    postgresql postgresql-contrib libpq-dev \
    redis-server \
    nginx \
    certbot python3-certbot-nginx \
    git curl build-essential \
    supervisor
```

### 4.1 Verify installations

```bash
python3 --version
psql --version
redis-cli ping        # Should return PONG
nginx -v
```

---

## 5. Set Up PostgreSQL

```bash
sudo -u postgres psql
```

Inside the PostgreSQL shell:

```sql
CREATE DATABASE facman_db;
CREATE USER facman_user WITH PASSWORD 'your-strong-password-here';
ALTER ROLE facman_user SET client_encoding TO 'utf8';
ALTER ROLE facman_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE facman_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE facman_db TO facman_user;
\q
```

---

## 6. Set Up Redis

Redis should already be running after install. Verify:

```bash
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping
```

---

## 7. Deploy the FacMan Backend

### 7.1 Create project directory

```bash
sudo mkdir -p /var/www/facman
sudo chown facman:facman /var/www/facman
```

### 7.2 Upload or clone the project

**Option A: Using Git (if you have a repo)**

```bash
cd /var/www/facman
git clone YOUR_REPO_URL .
```

**Option B: Using SCP (upload from local machine)**

From your local machine:

```bash
scp -r /path/to/FacMan/* facman@YOUR_VPS_IP:/var/www/facman/
```

### 7.3 Create virtual environment and install dependencies

```bash
cd /var/www/facman
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn
```

### 7.4 Create the .env file

```bash
cp .env.example .env
nano .env
```

Update these values for production:

```ini
# Django Settings
SECRET_KEY=generate-a-long-random-string-here
DEBUG=False
ALLOWED_HOSTS=YOUR_VPS_IP,yourdomain.com,www.yourdomain.com

# Database
DB_ENGINE=django.db.backends.postgresql
DB_NAME=facman_db
DB_USER=facman_user
DB_PASSWORD=your-strong-password-here
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Security - update these once you have a domain
CORS_ALLOWED_ORIGINS=https://yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com

# Facebook - fill in your app credentials
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_REDIRECT_URI=https://yourdomain.com/auth/facebook/callback

# Webhook
WEBHOOK_CALLBACK_URL=https://yourdomain.com/webhooks/facebook

# Production settings
USE_NGROK=False
```

To generate a Django secret key:

```bash
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

To generate an encryption key:

```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 7.5 Run Django setup

```bash
source /var/www/facman/venv/bin/activate
cd /var/www/facman/backend

python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

### 7.6 Test that it runs

```bash
python manage.py runserver 0.0.0.0:8000
```

Visit `http://YOUR_VPS_IP:8000/admin/` in your browser. If it loads, stop the dev server (Ctrl+C) and proceed.

---

## 8. Set Up Gunicorn

### 8.1 Test Gunicorn manually

```bash
cd /var/www/facman/backend
gunicorn backend.wsgi:application --bind 0.0.0.0:8000
```

If it works, stop it (Ctrl+C).

### 8.2 Create a Gunicorn systemd service

```bash
sudo nano /etc/systemd/system/facman.service
```

Paste:

```ini
[Unit]
Description=FacMan Gunicorn Daemon
After=network.target postgresql.service redis-server.service

[Service]
User=facman
Group=facman
WorkingDirectory=/var/www/facman/backend
EnvironmentFile=/var/www/facman/.env
ExecStart=/var/www/facman/venv/bin/gunicorn backend.wsgi:application \
    --workers 3 \
    --bind unix:/var/www/facman/facman.sock \
    --access-logfile /var/log/facman/access.log \
    --error-logfile /var/log/facman/error.log
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Create the log directory and start the service:

```bash
sudo mkdir -p /var/log/facman
sudo chown facman:facman /var/log/facman

sudo systemctl daemon-reload
sudo systemctl enable facman
sudo systemctl start facman
sudo systemctl status facman
```

---

## 9. Set Up Celery (Background Tasks)

### 9.1 Celery worker service

```bash
sudo nano /etc/systemd/system/facman-celery.service
```

Paste:

```ini
[Unit]
Description=FacMan Celery Worker
After=network.target redis-server.service

[Service]
User=facman
Group=facman
WorkingDirectory=/var/www/facman/backend
EnvironmentFile=/var/www/facman/.env
ExecStart=/var/www/facman/venv/bin/celery -A backend worker \
    --loglevel=info \
    --logfile=/var/log/facman/celery-worker.log
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 9.2 Celery beat service (scheduled tasks)

```bash
sudo nano /etc/systemd/system/facman-celerybeat.service
```

Paste:

```ini
[Unit]
Description=FacMan Celery Beat Scheduler
After=network.target redis-server.service

[Service]
User=facman
Group=facman
WorkingDirectory=/var/www/facman/backend
EnvironmentFile=/var/www/facman/.env
ExecStart=/var/www/facman/venv/bin/celery -A backend beat \
    --loglevel=info \
    --logfile=/var/log/facman/celery-beat.log \
    --scheduler django_celery_beat.schedulers:DatabaseScheduler
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 9.3 Enable and start both

```bash
sudo systemctl daemon-reload
sudo systemctl enable facman-celery facman-celerybeat
sudo systemctl start facman-celery facman-celerybeat
```

---

## 10. Set Up Nginx

### 10.1 Create Nginx config

```bash
sudo nano /etc/nginx/sites-available/facman
```

Paste:

```nginx
server {
    listen 80;
    server_name YOUR_VPS_IP;
    # When you get a domain, change the line above to:
    # server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 10M;

    location /static/ {
        alias /var/www/facman/backend/static/;
    }

    location /media/ {
        alias /var/www/facman/backend/media/;
    }

    location / {
        proxy_pass http://unix:/var/www/facman/facman.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 10.2 Enable the site

```bash
sudo ln -s /etc/nginx/sites-available/facman /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default    # Remove default site
sudo nginx -t                                # Test config
sudo systemctl restart nginx
```

Visit `http://YOUR_VPS_IP/admin/` to verify it works.

---

## 11. Domain & SSL (When You Purchase Your Domain)

### 11.1 Point your domain

In your domain registrar's DNS settings, add:

| Type | Name | Value         |
|------|------|---------------|
| A    | @    | YOUR_VPS_IP   |
| A    | www  | YOUR_VPS_IP   |

Wait for DNS propagation (can be a few minutes to 48 hours).

### 11.2 Update Nginx config

```bash
sudo nano /etc/nginx/sites-available/facman
```

Change the `server_name` line:

```nginx
server_name yourdomain.com www.yourdomain.com;
```

```bash
sudo nginx -t
sudo systemctl restart nginx
```

### 11.3 Install SSL with Let's Encrypt

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts. Certbot will auto-configure Nginx for HTTPS and set up auto-renewal.

Verify auto-renewal works:

```bash
sudo certbot renew --dry-run
```

### 11.4 Update Django settings

Update your `.env` file:

```ini
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com
FACEBOOK_REDIRECT_URI=https://yourdomain.com/auth/facebook/callback
WEBHOOK_CALLBACK_URL=https://yourdomain.com/webhooks/facebook
```

Restart the backend:

```bash
sudo systemctl restart facman
```

---

## 12. Useful Management Commands

```bash
# Check service status
sudo systemctl status facman
sudo systemctl status facman-celery
sudo systemctl status facman-celerybeat
sudo systemctl status nginx
sudo systemctl status redis-server
sudo systemctl status postgresql

# Restart services after code or config changes
sudo systemctl restart facman
sudo systemctl restart facman-celery
sudo systemctl restart facman-celerybeat

# View logs
sudo journalctl -u facman -f
sudo tail -f /var/log/facman/access.log
sudo tail -f /var/log/facman/error.log
sudo tail -f /var/log/facman/celery-worker.log

# Django management (always activate venv first)
cd /var/www/facman/backend
source /var/www/facman/venv/bin/activate
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser

# Update code from git
cd /var/www/facman
git pull
source venv/bin/activate
pip install -r requirements.txt
cd backend
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart facman facman-celery facman-celerybeat
```

---

## 13. Security Checklist

- [ ] SSH key auth only, root login disabled
- [ ] UFW firewall enabled (22, 80, 443 only)
- [ ] `DEBUG=False` in `.env`
- [ ] Strong `SECRET_KEY` generated
- [ ] Strong database password set
- [ ] `.env` file permissions restricted: `chmod 600 /var/www/facman/.env`
- [ ] SSL certificate installed (after domain setup)
- [ ] Regular system updates: `sudo apt update && sudo apt upgrade -y`
