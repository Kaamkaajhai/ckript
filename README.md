# 🎬 ScriptBridge

A full-stack social platform connecting **creators, actors, investors, producers, and readers** in the entertainment industry. Share scripts, discover talent, fund projects, and collaborate — all in one place.

![MERN Stack](https://img.shields.io/badge/Stack-MERN-green) ![License](https://img.shields.io/badge/License-ISC-blue)

---

## ✨ Features

- **Role-Based Dashboards** — Tailored experiences for Creators, Actors, Investors, Producers, and Readers
- **Script Upload & Discovery** — Upload scripts with genre tagging, pricing, and premium content support
- **Social Feed** — Instagram-style post feed with likes, comments, shares, and saves
- **Real-Time Messaging** — Socket.io powered instant messaging between users
- **User Profiles** — Customizable profiles with skills, bio, followers, and portfolio
- **Search & Explore** — Search users and scripts with filtered, tabbed results
- **Stripe Payments** — Integrated payment processing for script purchases
- **Responsive UI** — Desktop sidebar, tablet icon-only sidebar, mobile bottom nav bar

## 🛠️ Tech Stack

### Frontend
- **React 19** with Vite
- **Tailwind CSS v4**
- **Framer Motion** — Animations
- **React Router v7** — Client-side routing
- **Socket.io Client** — Real-time messaging
- **Axios** — API calls

### Backend
- **Node.js** with Express 5
- **MongoDB** with Mongoose 9
- **JWT** — Authentication
- **Socket.io** — WebSocket server
- **Stripe** — Payment processing
- **bcryptjs** — Password hashing

## 📁 Project Structure

```
ScriptBridge/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Sidebar, PostCard, Modals
│   │   ├── context/        # AuthContext (JWT + user state)
│   │   ├── layouts/        # MainLayout (responsive wrapper)
│   │   ├── pages/          # Dashboard, Feed, Messages, Profile, etc.
│   │   ├── services/       # Axios API instance
│   │   └── utils/          # PrivateRoute
│   └── package.json
├── server/                 # Express backend
│   ├── config/             # MongoDB connection
│   ├── controllers/        # Auth, Posts, Scripts, Messages, etc.
│   ├── middleware/          # JWT auth middleware
│   ├── models/             # User, Post, Script, Message, etc.
│   ├── routes/             # API route definitions
│   ├── server.js           # Entry point + Socket.io setup
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **MongoDB** running locally or a MongoDB Atlas URI

### 1. Clone the repo

```bash
git clone https://github.com/Kaamkaajhai/scriptbridge.git
cd scriptbridge
```

### 2. Setup the backend

```bash
cd server
npm install
```

Create a `.env` file in `/server`:

```env
MONGO_URI=mongodb://localhost:27017/scriptbridge
JWT_SECRET=your_jwt_secret_here
STRIPE_SECRET_KEY=your_stripe_key_here
```

Start the server:

```bash
npm run dev
```

The backend runs on **http://localhost:5001**.

### 3. Setup the frontend

```bash
cd client
npm install
npm run dev
```

The frontend runs on **http://localhost:5173**.

## 📱 Responsive Design

| Screen | Navigation |
|--------|-----------|
| **Desktop** (lg+) | Full left sidebar — icons + titles |
| **Tablet** (md–lg) | Compact left sidebar — icons only |
| **Mobile** (<md) | Fixed bottom icon bar |

## 🔐 Authentication

- JWT-based auth with 30-day token expiry
- Passwords hashed with bcryptjs
- Protected routes via `PrivateRoute` component
- Auth state managed through React Context + localStorage

## 👥 User Roles

| Role | Dashboard Highlights |
|------|---------------------|
| **Creator** | Scripts uploaded, views, earnings, followers |
| **Actor** | Auditions, profile views, callbacks |
| **Investor** | Investments, portfolio value, ROI |
| **Producer** | Projects, team members, budget |
| **Reader** | Scripts read, saved, reviews, reading streak |

## 📄 License

ISC
