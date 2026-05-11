import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
      
      <div className="prose prose-green max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold text-gray-900">1. Data Collection</h2>
          <p>
            The Rolls-In Restaurant Manager application collects data necessary for operational management, 
            including restaurant information, staff profiles, and inventory data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">2. Device Permissions</h2>
          <p>
            <strong>Camera:</strong> Our application requests camera access primarily for scanning barcodes 
            or capturing images of receipts and inventory items. We do not transmit video or audio to our 
            servers without explicit user action.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">3. Security Standards (Android 16 Readiness)</h2>
          <p>
            We implement industry-standard security headers, including Content Security Policy (CSP), 
            Permissions Policy, and HTTPS-only transport, ensuring the highest level of security 
            for our users on modern mobile platforms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">4. Third-Party Services</h2>
          <p>
            We utilize Google Firebase for secure data storage and authentication. 
            Your data is stored in compliance with Firebase's security standards.
          </p>
        </section>

        <footer className="pt-8 border-t border-gray-200 text-sm text-gray-500">
          Last updated: May 2026
        </footer>
      </div>
    </div>
  );
}
