import React from 'react';

const Terms: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
      
      <div className="prose prose-gray dark:prose-invert max-w-none">
        <p className="text-lg text-muted-foreground mb-6">
          Last updated: {new Date().toLocaleDateString()}
        </p>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p className="mb-4">
            By accessing and using the Abundant Share platform, you accept and agree to be bound by the 
            terms and provision of this agreement.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Platform Purpose</h2>
          <p className="mb-4">
            Abundant Share is a platform designed to connect food donors with recipients to reduce food 
            waste and address food insecurity in communities.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. User Responsibilities</h2>
          <h3 className="text-xl font-medium mb-3">For Food Donors:</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>Ensure all donated food is safe for consumption</li>
            <li>Provide accurate information about food items, including expiry dates</li>
            <li>Make food available for pickup at agreed times</li>
            <li>Follow proper food safety and hygiene practices</li>
          </ul>
          
          <h3 className="text-xl font-medium mb-3">For Food Recipients:</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>Use claimed food responsibly and for its intended purpose</li>
            <li>Show up for scheduled pickups or notify donors of cancellations</li>
            <li>Respect donors' time and property</li>
            <li>Report any food safety concerns immediately</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Food Safety Disclaimer</h2>
          <p className="mb-4">
            While FoodShare facilitates food sharing, we do not guarantee the safety, quality, or 
            condition of food items. Users participate at their own risk and should use their 
            judgment regarding food safety.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Prohibited Uses</h2>
          <p className="mb-4">You may not use the platform to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>List unsafe, expired, or contaminated food items</li>
            <li>Engage in commercial sale of food items</li>
            <li>Harass, abuse, or discriminate against other users</li>
            <li>Violate any local, state, or federal laws</li>
            <li>Misrepresent your identity or food items</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Account Termination</h2>
          <p className="mb-4">
            We reserve the right to terminate or suspend accounts that violate these terms or 
            engage in behavior harmful to the community.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Limitation of Liability</h2>
          <p className="mb-4">
            FoodShare is not liable for any damages, illness, or injuries resulting from the use 
            of food items shared through our platform.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Changes to Terms</h2>
          <p className="mb-4">
            We reserve the right to modify these terms at any time. Users will be notified of 
            significant changes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Contact Information</h2>
          <p className="mb-4">
            For questions about these Terms of Service, contact us at:
          </p>
          <p className="mb-2">Email: abundantshare5@gmail.com</p>
          <p className="mb-2">Phone: +1 (555) 123-4567</p>
        </section>
      </div>
    </div>
  );
};

export default Terms;