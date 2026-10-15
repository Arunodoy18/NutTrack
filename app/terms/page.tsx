import React from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="select-text min-h-screen bg-surface p-6 pb-24 font-sans text-ink">
      <div className="max-w-3xl mx-auto">
        <Link href="/download" className="inline-flex items-center gap-2 text-ink-soft hover:text-ink transition-colors mb-8">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-bold text-sm">Back</span>
        </Link>
        
        <h1 className="text-3xl font-black tracking-tight mb-4">Terms of Service</h1>
        <p className="text-sm font-medium text-ink-soft mb-8">Last Updated: {new Date().toLocaleDateString()}</p>
        
        <div className="space-y-8 text-sm leading-relaxed text-ink/90">
          
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
              <h2 className="text-lg font-bold text-amber-800">Medical Disclaimer</h2>
            </div>
            <p className="text-amber-900 font-medium">
              Nura is designed for informational and educational purposes only and does not provide medical advice, diagnosis, or treatment. You should not rely on this information as a substitute for professional medical advice. Always consult with a physician or qualified healthcare provider before beginning any new diet, fitness program, or changing your nutritional habits.
            </p>
          </div>

          <section>
            <h2 className="text-xl font-bold mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using Nura, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">2. Accuracy of Information & AI</h2>
            <p>Nura utilizes Artificial Intelligence (AI) to estimate nutritional values, identify ingredients, and calculate bodily metrics. While we strive for accuracy, AI can make mistakes (hallucinate). You acknowledge that nutritional information provided is an estimate and should not be used to manage severe food allergies, medical conditions, or strict dietary requirements without independent verification.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">3. User Conduct</h2>
            <p>You agree not to upload inappropriate, offensive, or illegal content through our image upload features. We reserve the right to suspend or terminate accounts that violate these terms or abuse our API systems.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">4. Subscription and Payments</h2>
            <p>Nura is currently free to use. We apply a fair-use limit of 200 AI scans per account per day. If we introduce paid plans in future, we will tell you in the app before any charge, and nothing is charged without your explicit action.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">5. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law, Nura shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, resulting from your use of our services.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
