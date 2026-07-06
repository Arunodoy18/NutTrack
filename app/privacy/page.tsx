import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-surface p-6 pb-24 font-sans text-ink">
      <div className="max-w-3xl mx-auto">
        <Link href="/profile" className="inline-flex items-center gap-2 text-ink-soft hover:text-ink transition-colors mb-8">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-bold text-sm">Back to Profile</span>
        </Link>
        
        <h1 className="text-3xl font-black tracking-tight mb-4">Privacy Policy</h1>
        <p className="text-sm font-medium text-ink-soft mb-8">Last Updated: {new Date().toLocaleDateString()}</p>
        
        <div className="space-y-8 text-sm leading-relaxed text-ink/90">
          <section>
            <h2 className="text-xl font-bold mb-3">1. Information We Collect</h2>
            <p className="mb-2">We collect the following types of information:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account Data:</strong> Email address and authentication credentials.</li>
              <li><strong>Biometric Data:</strong> Age, gender, height, weight, activity levels, and dietary goals.</li>
              <li><strong>User Generated Content:</strong> Photos of meals or fridge contents uploaded for AI analysis.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">2. How We Use Your Data</h2>
            <p>Your data is strictly used to provide the core services of DietBuddy, including calculating nutritional targets, logging meals, and generating recipes. We do not sell your personal data to data brokers.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">3. Third-Party Services (OpenAI)</h2>
            <p>To power our advanced features like "Fridge Raider", photos you upload are transmitted securely to OpenAI via API for analysis. OpenAI does not use your images to train their foundational models via our API integration. Please do not upload photos containing personally identifiable information.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">4. Data Deletion</h2>
            <p>You have the right to request the deletion of your account and all associated data. You can delete your account directly through the app settings or by contacting our support team.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">5. Security</h2>
            <p>We implement industry-standard security measures to protect your data, but no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
