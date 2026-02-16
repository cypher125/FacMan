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

---

## 14. Docker Deployment (Alternative)

If you prefer using Docker instead of installing everything directly on the VPS, follow this section.

### 14.1 Install Docker on the VPS

SSH into your VPS and run:

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install prerequisites
sudo apt install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine and Docker Compose
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 14.2 Post-install setup

```bash
# Add your user to the docker group so you don't need sudo
sudo usermod -aG docker $USER

# Log out and back in for the group change to take effect
exit
ssh facman@YOUR_VPS_IP

# Verify Docker works
docker --version
docker compose version
docker run hello-world
```

### 14.3 Create the project structure on the VPS

```bash
sudo mkdir -p /var/www/facman
sudo chown $USER:$USER /var/www/facman
cd /var/www/facman

# Clone or upload your code
git clone YOUR_REPO_URL .
```

### 14.4 Create the Dockerfile

Create `/var/www/facman/Dockerfile`:

```dockerfile
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies for PostgreSQL client
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt && \
    pip install gunicorn

# Copy the project code
COPY . .

# Collect static files (will be overridden at runtime if needed)
WORKDIR /app/backend

EXPOSE 8000

CMD ["gunicorn", "backend.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--access-logfile", "-", "--error-logfile", "-"]
```

### 14.5 Create docker-compose.yml

Create `/var/www/facman/docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:15-alpine
    restart: always
    volumes:
      - postgres_data:/var/lib/postgresql/data
    env_file:
      - .env.docker
    environment:
      POSTGRES_DB: ${DB_NAME:-facman_db}
      POSTGRES_USER: ${DB_USER:-facman_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-facman_user} -d ${DB_NAME:-facman_db}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  web:
    build: .
    restart: always
    ports:
      - "8000:8000"
    env_file:
      - .env.docker
    volumes:
      - static_files:/app/backend/static
      - media_files:/app/backend/media
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: >
      sh -c "python manage.py migrate --noinput &&
             python manage.py collectstatic --noinput &&
             gunicorn backend.wsgi:application --bind 0.0.0.0:8000 --workers 3 --access-logfile - --error-logfile -"

  celery-worker:
    build: .
    restart: always
    env_file:
      - .env.docker
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    working_dir: /app/backend
    command: celery -A backend worker --loglevel=info

  celery-beat:
    build: .
    restart: always
    env_file:
      - .env.docker
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    working_dir: /app/backend
    command: celery -A backend beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - static_files:/var/www/static
      - media_files:/var/www/media
      - certbot_www:/var/www/certbot
      - certbot_conf:/etc/letsencrypt
    depends_on:
      - web

  certbot:
    image: certbot/certbot
    volumes:
      - certbot_www:/var/www/certbot
      - certbot_conf:/etc/letsencrypt

volumes:
  postgres_data:
  static_files:
  media_files:
  certbot_www:
  certbot_conf:
```

### 14.6 Create the Nginx config for Docker

Create `/var/www/facman/nginx.conf`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 10M;

    # For Let's Encrypt certificate validation
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location /static/ {
        alias /var/www/static/;
    }

    location /media/ {
        alias /var/www/media/;
    }

    location / {
        proxy_pass http://web:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 14.7 Create the Docker environment file

```bash
cp .env.example .env.docker
nano .env.docker
```

Update these values — notice the hostnames use Docker service names instead of `localhost`:

```ini
# Django
SECRET_KEY=generate-a-long-random-string-here
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,YOUR_VPS_IP

# Database — host is the Docker service name "db", not "localhost"
DB_ENGINE=django.db.backends.postgresql
DB_NAME=facman_db
DB_USER=facman_user
DB_PASSWORD=your-strong-password-here
DB_HOST=db
DB_PORT=5432

# Redis — host is the Docker service name "redis", not "localhost"
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

# Celery — uses "redis" as hostname
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Security
CORS_ALLOWED_ORIGINS=https://yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com

# Facebook
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_REDIRECT_URI=https://yourdomain.com/api/auth/facebook/callback/

# Encryption key
ENCRYPTION_KEY=generate-with-fernet

# Production
USE_NGROK=False
```

> **Important:** In Docker, services communicate by their service names (`db`, `redis`), not `localhost`. This is the most common mistake.

Generate your keys:

```bash
# Django secret key
docker run --rm python:3.11-slim python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())" 2>/dev/null || python3 -c "import secrets; print(secrets.token_urlsafe(50))"

# Encryption key
docker run --rm python:3.11-slim sh -c "pip install cryptography -q && python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
```

### 14.8 Create .dockerignore

Create `/var/www/facman/.dockerignore`:

```
venv/
__pycache__/
*.pyc
.env
.env.docker
.git/
*.sqlite3
node_modules/
frontend/node_modules/
```

### 14.9 Build and start

```bash
cd /var/www/facman

# Build and start all containers in the background
docker compose up -d --build

# Check that all containers are running
docker compose ps

# View logs (follow mode)
docker compose logs -f

# View logs for a specific service
docker compose logs -f web
```

### 14.10 Create the superuser

```bash
docker compose exec web python manage.py createsuperuser
```

Visit `http://YOUR_VPS_IP/admin/` to verify everything works.

### 14.11 Set up SSL with Let's Encrypt (Docker)

**Step 1:** Make sure your domain's DNS A record points to your VPS IP and that port 80 is open.

**Step 2:** Get the certificate:

```bash
docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    -d yourdomain.com -d www.yourdomain.com \
    --email your-email@example.com \
    --agree-tos \
    --no-eff-email
```

**Step 3:** Update `nginx.conf` to add the HTTPS server block:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    client_max_body_size 10M;

    location /static/ {
        alias /var/www/static/;
    }

    location /media/ {
        alias /var/www/media/;
    }

    location / {
        proxy_pass http://web:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Step 4:** Restart Nginx:

```bash
docker compose restart nginx
```

**Step 5:** Set up auto-renewal with a cron job:

```bash
crontab -e
```

Add this line:

```
0 3 * * * cd /var/www/facman && docker compose run --rm certbot renew && docker compose restart nginx
```

### 14.12 Docker management commands

```bash
# Stop all containers
docker compose down

# Stop and remove all data (volumes too) — DESTRUCTIVE
docker compose down -v

# Restart a specific service
docker compose restart web

# Run Django management commands
docker compose exec web python manage.py migrate
docker compose exec web python manage.py collectstatic --noinput
docker compose exec web python manage.py createsuperuser

# View running containers
docker compose ps

# View resource usage
docker stats

# Pull latest code and rebuild
cd /var/www/facman
git pull
docker compose up -d --build

# View database directly
docker compose exec db psql -U facman_user -d facman_db
```

---

## 15. Facebook App Setup Guide

This section walks you through creating and configuring a Facebook App for FacMan. Since you are not submitting the app for Facebook's App Review, it will work in **Development Mode** — meaning only users added as testers/developers/admins in the app dashboard can use the Facebook login and page management features.

### 15.1 Create a Facebook Developer account

1. Go to [https://developers.facebook.com](https://developers.facebook.com)
2. Click **Get Started** or **Log In** with your personal Facebook account
3. Complete the registration (accept terms, verify email/phone if prompted)

### 15.2 Create a new app

1. Go to [https://developers.facebook.com/apps](https://developers.facebook.com/apps)
2. Click **Create App**
3. Select app type: **Business** (this gives access to page management APIs)
4. Fill in:
   - **App Name:** `FacMan` (or whatever you want)
   - **App Contact Email:** your email
   - **Business Account:** Select one or create a new one (you can use a personal business portfolio)
5. Click **Create App**

### 15.3 Get your App ID and App Secret

1. In the app dashboard, go to **App Settings > Basic** (left sidebar)
2. You will see:
   - **App ID** — copy this to your `.env` as `FACEBOOK_APP_ID`
   - **App Secret** — click **Show**, enter your password, then copy it to your `.env` as `FACEBOOK_APP_SECRET`
3. While you're here, fill in:
   - **App Domains:** `yourdomain.com` (or `localhost` for dev)
   - **Privacy Policy URL:** Any valid URL for now (can be a placeholder page on your domain)
   - **Terms of Service URL:** Same as above (optional but recommended)
4. Click **Save Changes**

### 15.4 Add Facebook Login product

1. In the left sidebar, click **Add Product** (or go to **Products** section)
2. Find **Facebook Login** and click **Set Up**
3. Choose **Web** as the platform
4. Enter your **Site URL:** `https://yourdomain.com` (or `http://localhost:8000` for dev)
5. Click **Save**, then go to **Facebook Login > Settings** in the sidebar
6. Configure these settings:
   - **Client OAuth Login:** Yes
   - **Web OAuth Login:** Yes
   - **Valid OAuth Redirect URIs:** Add your callback URL(s):
     - For production: `https://yourdomain.com/api/auth/facebook/callback/`
     - For local dev: `http://localhost:8000/api/auth/facebook/callback/`
   - **Enforce HTTPS:** Yes (turn off only if testing on localhost without HTTPS)
7. Click **Save Changes**

### 15.5 Request permissions (Development Mode — no review needed)

In Development Mode, you can use **any** permission without going through App Review, but only for users who have a role on your app (admins, developers, testers).

The permissions FacMan needs:

| Permission | What it does |
|---|---|
| `public_profile` | Access user's name and profile picture |
| `email` | Access user's email address |
| `pages_show_list` | See the list of Pages the user manages |
| `pages_read_engagement` | Read engagement data (likes, comments, shares) |
| `pages_manage_posts` | Create, edit, and delete posts on Pages |
| `pages_manage_metadata` | Read and update Page settings and metadata |
| `pages_manage_engagement` | Like/delete comments, send responses |
| `pages_messaging` | Send and receive messages as a Page |
| `pages_read_user_content` | Read user-generated content on Pages |

You do NOT need to submit these for review in Development Mode. They are already available to your app's test users.

To verify permissions are enabled:

1. Go to **App Review > Permissions and Features** in the sidebar
2. You should see all the permissions listed
3. In Development Mode, they will show as available without needing approval

### 15.6 Add test users (so others can use the app)

Since the app is in Development Mode, only people with roles can use it.

**Add yourself and any team members:**

1. Go to **App Roles > Roles** in the sidebar
2. You (the creator) are already an Admin
3. To add others, click **Add People**:
   - **Administrators** — Full control over the app settings
   - **Developers** — Can use all API features and test
   - **Testers** — Can use the app's login and features but can't change settings
4. Enter their Facebook name or user ID and send the invitation
5. They must **accept the invitation** from their Facebook notifications or from [https://developers.facebook.com/requests](https://developers.facebook.com/requests)

> **Important:** Each test user must also be an **admin or editor** of the Facebook Pages they want to manage through FacMan. The app can only access Pages that the logged-in user actually manages on Facebook.

### 15.7 Configure the "Use Cases" (newer dashboard layout)

Facebook's newer developer dashboard uses a **Use Cases** section. If you see this instead of the classic permissions layout:

1. Go to **Use Cases** in the left sidebar
2. Click **Customize** on the **Authenticate and request data from users with Facebook Login** use case
3. Under **Permissions**, click **Add** for each of these:
   - `email`
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `pages_manage_metadata`
   - `pages_manage_engagement`
   - `pages_messaging`
   - `pages_read_user_content`
4. `public_profile` is granted by default — you don't need to add it

> In Development Mode, you can add all these permissions without providing any verification or review submissions. They work immediately for your app's test users.

### 15.8 Link a Facebook Page for testing

Make sure you have at least one Facebook Page to test with:

1. If you don't have a Page, create one at [https://www.facebook.com/pages/create](https://www.facebook.com/pages/create)
2. Make sure the Facebook account you're logging in with is an **admin** of that Page
3. When you log in through FacMan and grant permissions, that Page will appear when you call the sync endpoint

### 15.9 Test the full OAuth flow

1. Start FacMan (either locally or on your VPS)
2. Call the login endpoint:
   ```
   GET /api/auth/facebook/login/
   ```
   This returns a Facebook authorization URL
3. Open that URL in your browser
4. Log in with a Facebook account that has a role on your app
5. Grant all the requested permissions when prompted
6. Facebook redirects back to your callback URL
7. FacMan exchanges the code for an access token and creates the user account
8. You get back an API token — use it for all subsequent requests
9. Call `POST /api/pages/sync/` to pull in your Pages

### 15.10 Development Mode limitations

Be aware of these limitations when NOT going through App Review:

| Limitation | Detail |
|---|---|
| **Users** | Only people with roles on the app (admin/developer/tester) can log in |
| **Max test users** | Up to 100 test users on a standard app |
| **Pages** | Can only manage Pages owned by test users |
| **Rate limits** | Same as production (200 calls/user/hour) |
| **Data access** | Full access to all granted permissions for test users |
| **Webhooks** | Work normally in Development Mode |
| **No public access** | Regular Facebook users cannot use your app |

### 15.11 If you ever want to go live (App Review)

If you eventually want non-testers to use FacMan, you'd need to:

1. Submit each permission for **App Review** with:
   - A description of how you use each permission
   - A screencast video showing the functionality
   - A privacy policy URL
2. Complete **Business Verification** (upload business documents)
3. Switch the app from Development to **Live Mode**

But for personal use or a small team, Development Mode is sufficient — you get full API access with no restrictions on functionality.

### 15.12 Troubleshooting Facebook integration

**"App not set up" error:**
- Make sure Facebook Login product is added and configured (step 15.4)
- Check that the redirect URI in `.env` exactly matches what's in the Facebook dashboard

**"Invalid scope" error:**
- Go to Use Cases or Permissions and make sure all 9 permissions are added

**"User is not a tester" error:**
- The Facebook account must have a role on the app (step 15.6)
- The user must have accepted the role invitation

**No Pages showing after sync:**
- The logged-in user must be an admin/editor of at least one Facebook Page
- Try revoking and re-granting permissions: go to Facebook Settings > Business Integrations > remove FacMan > log in again

**Token expired errors:**
- User access tokens expire after ~60 days
- Have the user log in again through the OAuth flow to get a fresh token
- Page tokens obtained via `pages_show_list` can be extended to long-lived (never expire)

**"Error validating access token":**
- The token may have been invalidated (user changed password, removed app)
- Re-authenticate through the OAuth flow
