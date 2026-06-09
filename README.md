<div align="center">
  <img src="https://raw.githubusercontent.com/Arunodoy18/NutTrack/main/public/banner.png" alt="dietBuddy Banner" width="100%" />

  # 🥑 dietBuddy
  
  **Snap your food. Know your macros. Instantly. Grow your health. Instantly.**

  [![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Neon Postgres](https://img.shields.io/badge/Neon-00E599?style=for-the-badge&logo=postgresql&logoColor=black)](https://neon.tech/)
</div>

<br/>

## 🚀 The Ultimate AI Nutrition Tracker
**dietBuddy** eliminates the friction of traditional calorie counting. Instead of manually searching databases for food items, simply snap a picture of your plate. Our advanced AI vision engine instantly dissects your meal, calculates the exact macronutrients (Protein, Fats, Carbs, Fiber), and logs it directly to your daily goals.

<br/>

## ✨ Key Features

- 📸 **AI Vision Scanning:** Powered by Google Gemini 1.5 Flash via OpenRouter. Just upload a photo or use your mobile camera to instantly parse food items.
- 🎯 **Macro Accuracy:** Cross-references AI visual data with the official **USDA Food Database** for perfectly accurate calorie and macronutrient estimations.
- 🔐 **Bank-Grade Security:** Fully integrated **NextAuth.js** with Google OAuth and a custom 6-digit email OTP Forgot Password flow powered by **Resend**.
- 💳 **Seamless Monetization:** Integrated **Razorpay Orders API** for a frictionless ₹199 lifetime premium upgrade.
- 📊 **Dynamic Dashboard:** Real-time progress rings, streak tracking, and daily goals beautifully animated with **Framer Motion**.
- ☁️ **Instant Sync:** All data is securely stored in a lightning-fast **Neon Serverless Postgres** database using **Drizzle ORM**.

<br/>

## 🛠 Tech Stack

| Category | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS & Framer Motion |
| **Database** | Neon (PostgreSQL) |
| **ORM** | Drizzle ORM |
| **Authentication**| NextAuth.js v4 |
| **Email API** | Resend |
| **Payment Gateway**| Razorpay |
| **AI Engine** | OpenRouter (Gemini Pro Vision) |
| **Nutrition Data** | USDA Food API |

<br/>

## 🚦 Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Arunodoy18/NutTrack.git
   cd NutTrack
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Rename `.env.example` to `.env` and fill in all the required API keys (NextAuth, Neon DB, Resend, Razorpay, OpenRouter, and USDA).

4. **Run Database Migrations:**
   ```bash
   npx drizzle-kit push:pg
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```
   *The app will be running at `http://localhost:3000`*

<br/>

## 📜 License
This project is proprietary. All rights reserved.
