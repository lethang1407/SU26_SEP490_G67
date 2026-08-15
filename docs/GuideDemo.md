2.1 System Requirements
To support the Khoi Que Restaurant Management System (RMN), the following hardware, software, and configuration requirements must be met. These are optimized for a cloud-hosted environment such as Digital Ocean, ensuring scalability for multi-user access in a restaurant setting.
Hardware (Minimum for Development/Testing):
CPU: 2 cores (e.g., Intel i5 or equivalent)
RAM: 8 GB
Storage: 50 GB SSD (for database and application files)
Hardware (Recommended for Production on Digital Ocean):
Use a Droplet with at least 4 GB RAM, 2 vCPUs, and 80 GB SSD
For high-traffic restaurants (e.g., peak hours with many concurrent orders), scale to:
8 GB RAM
Enable auto-scaling via Digital Ocean App Platform
Software:
Operating System: Ubuntu 22.04 LTS (or Windows Server 2022 for MSSQL compatibility)
Backend: .NET 8 SDK/Runtime
Frontend: Node.js v20+ and npm v10+ (for ReactJS application)
Database: Microsoft SQL Server 2019+ (Express for development, Standard for production)
Web Server: Nginx or IIS (for hosting frontend and reverse proxy API)
Real-time Communication: SignalR (integrated with .NET backend)
Containerization (Optional): Docker v24+ and Docker Compose v2+
Browser Support: Latest versions of Chrome, Firefox, Edge (desktop & tablet for POS usage)
Configurations:
Firewall Ports:
80 (HTTP)
443 (HTTPS)
1433 (MSSQL)
Environment Variables:
Database connection string
JWT secret key
Cloudinary API (image upload)
Payment gateway (e.g., SePay / VietQR)
Email service (SMTP credentials)
SSL:
Required for production
Use Let's Encrypt or Digital Ocean managed SSL
Dependencies:
Internet access for npm and NuGet package restore
System Capability Support:
These requirements ensure stable performance for:
Real-time order updates (kitchen ↔ cashier ↔ staff)
Table management and reservation handling
Payment processing and billing
Inventory tracking and reporting
2.2 Installation Instructions
Follow these steps to install and deploy the Khoi Que RMN system on a Digital Ocean server.
1. Prepare the Server
Create a Digital Ocean Droplet (Ubuntu 22.04, ≥ 4GB RAM)
Connect via SSH:
 ssh root@your-droplet-ip
Update system:
 apt update && apt upgrade -y
Install required tools:
 apt install curl git unzip -y
2. Install .NET 8 (Backend)
Add Microsoft package repository:
 wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
dpkg -i packages-microsoft-prod.deb
Install .NET SDK:
 apt update
apt install -y dotnet-sdk-8.0
Verify installation:
 dotnet --version
3. Install Node.js (Frontend)
Install Node.js:
 curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
Verify:
 node -v
npm -v
4. Set Up SQL Server
Install SQL Server:
 apt install -y mssql-server
Configure:
 sudo /opt/mssql/bin/mssql-conf setup
Start service:
 systemctl enable mssql-server
systemctl start mssql-server
Create database:
 sqlcmd -S localhost -U SA -P 'YourStrongPassword' -Q "CREATE DATABASE KhoiQueRMN;"
Run schema & seed data:
 sqlcmd -S localhost -U SA -P 'YourStrongPassword' -d KhoiQueRMN -i schema.sql
5. Deploy Backend (.NET API)
Clone project:
 git clone <your-repo>
cd backend
Restore & build:
 dotnet restore
dotnet publish -c Release -o out
Run:
 dotnet out/YourProject.dll
6. Deploy Frontend (React)
Navigate to frontend:
 cd frontend
Install dependencies:
 npm install
Build project:
 npm run build
7. Configure Nginx (Reverse Proxy)
Install Nginx:
 apt install nginx -y
Configure:
 nano /etc/nginx/sites-available/default
Example config:
 server {
    listen 80;
    server_name your-domain.com;
    location / {
        root /var/www/react-build;
        index index.html;
        try_files $uri /index.html;
    }
    location /api/ {
        proxy_pass http://localhost:5000/;
    }
}
Restart:
 systemctl restart nginx
8. Enable SSL
Install Certbot:
 apt install certbot python3-certbot-nginx -y
Enable HTTPS:
 certbot --nginx
