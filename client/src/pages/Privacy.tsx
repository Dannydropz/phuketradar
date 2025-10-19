import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <h1 className="text-4xl font-bold mb-8" data-testid="text-privacy-title">Privacy Policy</h1>
          
          <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
            <section>
              <p className="text-muted-foreground text-sm mb-6">
                <strong>Last Updated:</strong> October 19, 2025
              </p>
              
              <p className="text-lg leading-relaxed">
                Phuket Radar ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect information when you visit our website at phuketradar.com (the "Site").
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">1.1 Information You Provide</h3>
              <p className="leading-relaxed mb-4">
                If you choose to subscribe to our newsletter or contact us, we may collect:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Email address</li>
                <li>Name (if provided)</li>
                <li>Any other information you choose to provide in communications with us</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">1.2 Automatically Collected Information</h3>
              <p className="leading-relaxed mb-4">
                When you visit our Site, we may automatically collect:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Browser type and version</li>
                <li>Operating system</li>
                <li>IP address</li>
                <li>Pages visited and time spent on pages</li>
                <li>Referring website addresses</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
              <p className="leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Deliver news content and updates via our newsletter (if subscribed)</li>
                <li>Improve our Site and user experience</li>
                <li>Analyze Site usage and trends</li>
                <li>Respond to your inquiries and communications</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. News Content & Third-Party Sources</h2>
              <p className="leading-relaxed mb-4">
                Phuket Radar aggregates news content from publicly available Thai-language Facebook pages. We translate this content into English for the international community in Phuket. Our news aggregation service:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Scrapes publicly available posts from verified news sources</li>
                <li>Translates content using OpenAI's translation services</li>
                <li>Provides proper attribution to original sources</li>
                <li>Links back to original content</li>
              </ul>
              <p className="leading-relaxed mt-4">
                We do not claim ownership of the original news content. All rights to the original content remain with the original publishers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Cookies and Tracking Technologies</h2>
              <p className="leading-relaxed mb-4">
                We use cookies and similar tracking technologies to:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Remember your preferences (such as theme settings)</li>
                <li>Analyze Site traffic and usage patterns</li>
                <li>Improve Site functionality</li>
              </ul>
              <p className="leading-relaxed mt-4">
                You can control cookie settings through your browser preferences. Note that disabling cookies may affect Site functionality.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Data Sharing and Disclosure</h2>
              <p className="leading-relaxed mb-4">
                We do not sell, rent, or trade your personal information. We may share information:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>With service providers who help us operate our Site (e.g., hosting providers, email services)</li>
                <li>When required by law or to protect our rights</li>
                <li>With your consent</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Third-Party Services</h2>
              <p className="leading-relaxed mb-4">
                Our Site may use third-party services, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li><strong>OpenAI:</strong> For content translation and processing</li>
                <li><strong>Replit:</strong> For hosting and infrastructure</li>
                <li><strong>Facebook:</strong> For posting news summaries to our Facebook page</li>
              </ul>
              <p className="leading-relaxed mt-4">
                These services have their own privacy policies, and we encourage you to review them.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Data Security</h2>
              <p className="leading-relaxed">
                We implement reasonable security measures to protect your information from unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Your Rights</h2>
              <p className="leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your information</li>
                <li>Unsubscribe from our newsletter at any time</li>
                <li>Object to processing of your information</li>
              </ul>
              <p className="leading-relaxed mt-4">
                To exercise these rights, please contact us using the information below.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
              <p className="leading-relaxed">
                Our Site is not directed to children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. International Data Transfers</h2>
              <p className="leading-relaxed">
                Your information may be transferred to and processed in countries other than Thailand. By using our Site, you consent to the transfer of your information to countries that may have different data protection laws than Thailand.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Changes to This Privacy Policy</h2>
              <p className="leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. We encourage you to review this Privacy Policy periodically.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
              <p className="leading-relaxed mb-4">
                If you have any questions about this Privacy Policy or our privacy practices, please contact us:
              </p>
              <div className="bg-muted/50 p-6 rounded-lg">
                <p className="leading-relaxed">
                  <strong>Phuket Radar</strong><br />
                  Email: <a href="mailto:privacy@phuketradar.com" className="text-primary hover:underline">privacy@phuketradar.com</a><br />
                  Website: <a href="https://phuketradar.com" className="text-primary hover:underline">phuketradar.com</a>
                </p>
              </div>
            </section>

            <section className="border-t pt-8 mt-12">
              <h2 className="text-2xl font-semibold mb-4">GDPR Compliance (For EU Visitors)</h2>
              <p className="leading-relaxed mb-4">
                If you are located in the European Economic Area (EEA), you have additional rights under the General Data Protection Regulation (GDPR):
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Right to access your personal data</li>
                <li>Right to rectification of inaccurate data</li>
                <li>Right to erasure ("right to be forgotten")</li>
                <li>Right to restrict processing</li>
                <li>Right to data portability</li>
                <li>Right to object to processing</li>
                <li>Rights related to automated decision-making and profiling</li>
              </ul>
              <p className="leading-relaxed mt-4">
                Our lawful basis for processing your data includes consent, contractual necessity, and legitimate interests. To exercise your GDPR rights, please contact us at the address above.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
