# XYZ Asset Management Server

A secure, role-based **Asset Management Backend API** built with **Node.js, Express, MongoDB, JWT authentication**, and **Stripe payments**, designed for HR managers and employees to manage company assets efficiently.

🔗 **Live API**  
https://asset-management-api-tf4m.onrender.com

---

## 🚀 Features

### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (**HR / Employee**)
- Secure protected routes
- Email normalization (lowercase & trimmed)

---

### 👤 User Management
- Create users (HR & Employee)
- Profile fetch & update
- HR can view all users
- Company affiliation handling
- Employee team assignment & removal

---

### 🧾 Asset Management (HR Only)
- Add, update, delete assets
- Search, filter, and sort assets
- Pagination support
- Limited-stock asset detection
- Assigned quantity tracking

---

### 📦 Asset Requests
- Employees can request assets
- HR can approve or reject requests
- Prevents over-assignment
- Returnable asset handling
- Monthly & pending request tracking

---

### 📊 HR Dashboard Analytics
- Pending requests summary
- Top requested assets
- Pie chart data (Returnable vs Non-returnable)
- Team & package statistics

---

### 👥 Team Management
- Add single or multiple employees
- Enforce team size limits
- Free employee discovery
- Package-based team expansion

---

### 💳 Payments (Stripe)
- Secure payment intent creation
- HR package upgrade handling
- Payment history storage

---

### ⚡ Real-Time Notifications (Socket.io)
- Instant notification delivery using Socket.io
- Users join private rooms using their email
- HR actions (asset approve/reject, team updates) trigger real-time events
- Live update of notification list & unread count on frontend
- Eliminates need for manual refresh

---

## 🔌 Real-Time Architecture
- Socket.io server integrated with Express
- Each user joins a unique room using email
- Backend emits `new-notification` events
- Frontend listens and updates UI via React Query

---

## 📡 Real-Time Event Example

1. Employee requests asset
2. HR approves request
3. Server emits `new-notification` event
4. Target user receives notification instantly
5. Frontend updates notification list automatically

## 🛠️ Tech Stack
- Node.js
- Express.js
- MongoDB Atlas
- JWT (jsonwebtoken)
- Stripe API
- CORS
- dotenv
- Socket.io
- Render (Deployment)

---

## 🌍 CORS Configuration

Allowed origins:

```js
[
  "http://localhost:5173",
  "https://xyz-company-61324.web.app",
  "https://xyz-company-61324.firebaseapp.com",
  "https://xyz-asset-management.vercel.app"
]


🔐 Environment Variables

Create a .env file in the root directory:

PORT=5000
DB_USER=your_mongodb_user
DB_PASS=your_mongodb_password
ACCESS_TOKEN_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=your_stripe_secret

▶️ Run Locally
npm install
node index.js

Server will run on:
http://localhost:5000

📡 API Base URL
https://asset-management-api-tf4m.onrender.com

🔑 Authorization Header Example
Authorization: Bearer <JWT_TOKEN>

Response:
HR Manager is sitting

👨‍💻 Author
Shahanara Aktar Laizu
Full Stack Developer (React • Node • MongoDB • Firebase)