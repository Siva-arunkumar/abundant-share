import React from 'react';

const Privacy: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
      
      <div className="prose prose-gray dark:prose-invert max-w-none">
        <p className="text-lg text-muted-foreground mb-6">
          Last updated: {new Date().toLocaleDateString()}
        </p>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
          <p className="mb-4">
            We collect information you provide directly to us, such as when you create an account, 
            list food donations, or contact us for support.
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Personal information (name, email address, phone number)</li>
            <li>Location data for food pickup and delivery</li>
            <li>Food listing details and images</li>
            <li>Communication records</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
          <p className="mb-4">We use the information we collect to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Provide and maintain our food sharing platform</li>
            <li>Connect food donors with recipients</li>
            <li>Send notifications about food availability</li>
            <li>Improve our services and user experience</li>
            <li>Ensure platform safety and prevent fraud</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Information Sharing</h2>
          <p className="mb-4">
            We do not sell, trade, or otherwise transfer your personal information to third parties 
            except as described in this policy. We may share information:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>With other users for the purpose of food sharing coordination</li>
            <li>When required by law or to protect our rights</li>
            <li>With service providers who assist in our operations</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
          <p className="mb-4">
            We implement appropriate security measures to protect your personal information against 
            unauthorized access, alteration, disclosure, or destruction.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
          <p className="mb-4">You have the right to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Access and update your personal information</li>
            <li>Delete your account and associated data</li>
            <li>Opt out of non-essential communications</li>
            <li>Request data portability</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Contact Us</h2>
          <p className="mb-4">
            If you have any questions about this Privacy Policy, please contact us at:
          </p>
          <p className="mb-2">Email: abundantshare5@gmail.com</p>
          <p className="mb-2">Phone: +1 (555) 123-4567</p>
        </section>
      </div>
    </div>
  );
};

export default Privacy;