# Production Deployment Guide - Avatar System

## 📋 Pre-deployment Checklist

- [ ] ติดตั้ง dependencies ครบถ้วน
- [ ] Build project สำเร็จ
- [ ] ทดสอบ avatar upload/delete ใน dev
- [ ] สร้าง `public/avatars` folder บน server
- [ ] ตั้งค่า permissions ของ folder

## 🚀 Deployment Steps

### 1. Build Application

```bash
# Clean previous build
npm run clean

# Generate Prisma Client
npx prisma generate

# Build Next.js application
npm run build
```

### 2. Setup Avatars Folder

```bash
# สร้าง folder ถ้ายังไม่มี
mkdir -p public/avatars

# ตั้งค่า permissions (Linux/Unix)
chmod 755 public/avatars

# Windows - ให้สิทธิ์ Read/Write
icacls public\avatars /grant Users:F
```

### 3. Environment Variables

ตรวจสอบ `.env` file:

```env
DATABASE_URL="mysql://user:password@localhost:3306/database"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="https://yourdomain.com"
```

### 4. Migrate Existing Data (ถ้ามี)

ถ้ามี avatar URLs แบบเก่าในฐานข้อมูล:

```bash
npm run migrate:avatars
```

### 5. Start Production Server

```bash
npm start
# หรือใช้ PM2
pm2 start npm --name "p-post" -- start
```

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Create avatars directory with proper permissions
RUN mkdir -p ./public/avatars
RUN chown -R nextjs:nodejs ./public/avatars

USER nextjs

EXPOSE 3003

ENV PORT 3003

CMD ["node", "server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3003:3003"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
    volumes:
      - ./public/avatars:/app/public/avatars
    restart: unless-stopped
```

## ☁️ Cloud Platform Specific

### Vercel

1. **Setup Build Command**
   ```
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

2. **Environment Variables**
   - เพิ่มทุก env variables ใน Vercel dashboard

3. **Storage Configuration**
   - ใช้ Vercel Blob Storage หรือ S3 สำหรับ avatars
   - อัพเดท upload API ให้ส่งไปยัง cloud storage

### AWS / DigitalOcean / VPS

1. **Install Dependencies**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   npm install -g pm2
   ```

2. **Clone & Setup**
   ```bash
   git clone <repository>
   cd p-post
   npm install
   npx prisma generate
   npm run build
   ```

3. **Start with PM2**
   ```bash
   pm2 start npm --name "p-post" -- start
   pm2 save
   pm2 startup
   ```

4. **Nginx Configuration**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3003;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       # Cache avatars
       location /api/avatars/ {
           proxy_pass http://localhost:3003;
           proxy_cache_valid 200 1y;
           add_header Cache-Control "public, max-age=31536000, immutable";
       }
   }
   ```

## 🔧 Troubleshooting

### Issue: รูปภาพไม่แสดงใน Production

**Solution:**
1. ตรวจสอบว่า `/api/avatars/[filename]` route ทำงาน
2. ตรวจสอบ permissions ของ `public/avatars` folder
3. ดู logs: `pm2 logs p-post`

### Issue: Upload ล้มเหลว

**Solution:**
1. ตรวจสอบ disk space: `df -h`
2. ตรวจสอบ folder permissions: `ls -la public/`
3. ตรวจสอบ memory: `free -m`

### Issue: Slow Image Loading

**Solution:**
1. ใช้ CDN (Cloudflare, CloudFront)
2. Enable Nginx cache
3. ตรวจสอบ image file size

## 📊 Monitoring

### Check Upload Stats
```bash
# Count avatars
ls -1 public/avatars/*.jpg | wc -l

# Check folder size
du -sh public/avatars/

# Check database records
mysql -e "SELECT COUNT(*) FROM police_personnel WHERE avatar_url IS NOT NULL;"
```

### Performance Monitoring
```bash
# PM2 monitoring
pm2 monit

# Logs
pm2 logs p-post --lines 100

# Memory usage
pm2 list
```

## 🔒 Security Checklist

- [ ] ตั้งค่า file upload limits (5MB)
- [ ] Validate file types
- [ ] Sanitize filenames
- [ ] Set proper folder permissions (755)
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Regular security updates

## 🔄 Backup Strategy

### Daily Backup Script

```bash
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR="/backups/avatars"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup avatars
tar -czf $BACKUP_DIR/avatars-$DATE.tar.gz public/avatars/

# Keep only last 30 days
find $BACKUP_DIR -name "avatars-*.tar.gz" -mtime +30 -delete
```

### Database Backup

```bash
# Backup database
mysqldump -u user -p database > backup-$(date +%Y%m%d).sql

# Restore
mysql -u user -p database < backup-20250121.sql
```

## 📈 Scaling Considerations

### High Traffic Solutions

1. **CDN Integration**
   - Cloudflare
   - CloudFront
   - Azure CDN

2. **Object Storage**
   - AWS S3
   - Google Cloud Storage
   - Azure Blob Storage

3. **Image Optimization**
   - WebP conversion
   - Lazy loading
   - Responsive images

### Example: S3 Integration

```typescript
// Update upload API to use S3
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function uploadToS3(buffer: Buffer, filename: string) {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `avatars/${filename}`,
      Body: buffer,
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );
  
  return `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/avatars/${filename}`;
}
```

## 📞 Support

หากพบปัญหา:
1. ตรวจสอบ logs
2. ดู documentation
3. ติดต่อทีมพัฒนา
