import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Shield, Trash2, Mail, Eye } from "lucide-react";
import blIcon from "@/assets/blIcon.png";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.location.href = '/'}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <img src={blIcon} className="w-8 h-8 mr-2" alt="Basketball Logo" />
          <h1 className="text-xl font-semibold">basketbo-lista</h1>
        </div>

        <Card className="p-8">
          <div className="text-center mb-8">
            <Shield className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Privacy Policy</h1>
            <p className="text-gray-600">Last updated: {new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <div className="prose max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Introduction</h2>
              <p className="text-gray-600 mb-4">
                Welcome to basketbo-lista ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our basketball event management platform and mobile application (the "Service").
              </p>
              <p className="text-gray-600">
                By using our Service, you agree to the collection and use of information in accordance with this Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-lg font-semibold text-gray-700 mb-3">2.1 Information You Provide</h3>
              <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-1">
                <li>Account information (name, email address)</li>
                <li>Profile information from social media accounts (Google)</li>
                <li>Event registration details and preferences</li>
                <li>Group/league management information</li>
                <li>Communications with us</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-700 mb-3">2.2 Information Collected Automatically</h3>
              <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-1">
                <li>Device information and identifiers</li>
                <li>Usage data and analytics</li>
                <li>IP address and location data</li>
                <li>Browser type and version</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-700 mb-3">2.3 Third-Party Information</h3>
              <p className="text-gray-600">
                When you connect through Google, we receive basic profile information including your name, email address, and profile picture as permitted by your privacy settings on those platforms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6 text-gray-600 space-y-1">
                <li>Provide and maintain our Service</li>
                <li>Process event registrations and manage leagues</li>
                <li>Send notifications about events and updates</li>
                <li>Improve and personalize user experience</li>
                <li>Communicate with you about your account</li>
                <li>Prevent fraud and ensure security</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Information Sharing</h2>
              <p className="text-gray-600 mb-4">
                We do not sell, trade, or otherwise transfer your personal information to third parties except in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-1">
                <li>With your explicit consent</li>
                <li>To league administrators for event management purposes</li>
                <li>To service providers who assist in operating our platform</li>
                <li>To comply with legal requirements or protect rights and safety</li>
                <li>In connection with a business transfer or merger</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Data Security</h2>
              <p className="text-gray-600">
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Your Rights and Choices</h2>
              
              <div className="bg-blue-50 p-6 rounded-lg mb-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Access and Portability
                </h3>
                <p className="text-blue-700 mb-2">You have the right to:</p>
                <ul className="list-disc pl-6 text-blue-700 space-y-1">
                  <li>Access your personal data</li>
                  <li>Request a copy of your data in a portable format</li>
                  <li>Update or correct your information</li>
                </ul>
              </div>

              <div className="bg-red-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-red-800 mb-3 flex items-center">
                  <Trash2 className="w-5 h-5 mr-2" />
                  Data Deletion
                </h3>
                <p className="text-red-700 mb-4">
                  You have the right to request deletion of your personal data. When you request deletion:
                </p>
                <ul className="list-disc pl-6 text-red-700 space-y-1 mb-4">
                  <li>We will delete your account and associated personal information</li>
                  <li>Your event registrations will be anonymized</li>
                  <li>Some data may be retained for legal compliance (30 days)</li>
                  <li>Backup copies may take up to 90 days to be fully purged</li>
                </ul>
                
                <div className="bg-white p-4 rounded border border-red-200">
                  <h4 className="font-semibold text-red-800 mb-2">How to Request Data Deletion:</h4>
                  <ol className="list-decimal pl-6 text-red-700 space-y-1">
                    <li>Email us at <a href="mailto:boss.basketbolista@gmail.com" className="underline">boss.basketbolista@gmail.com</a></li>
                    <li>Include "Data Deletion Request" in the subject line</li>
                    <li>Provide your account email and any additional verification</li>
                    <li>We will process your request within 30 days</li>
                  </ol>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Children's Privacy</h2>
              <p className="text-gray-600">
                Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you become aware that a child has provided us with personal information, please contact us.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. International Users</h2>
              <p className="text-gray-600">
                If you are accessing our Service from outside the United States, please be aware that your information may be transferred to, stored, and processed in the United States where our servers are located.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">9. Third-Party Services</h2>
              <p className="text-gray-600 mb-4">
                Our Service integrates with third-party services including:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-1">
                <li><strong>Google:</strong> For authentication and calendar integration</li>
                {/* <li><strong>Facebook:</strong> For authentication and social features</li> */}
                <li><strong>Firebase:</strong> For data storage and authentication</li>
              </ul>
              <p className="text-gray-600 mt-4">
                These services have their own privacy policies, and we encourage you to review them.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">10. Updates to This Policy</h2>
              <p className="text-gray-600">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">11. Contact Us</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-600 mb-4">
                  If you have any questions about this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="flex items-center text-gray-700">
                  <Mail className="w-5 h-5 mr-3" />
                  <div>
                    <p className="font-semibold">Email:</p>
                    <a href="mailto:boss.basketbolista@gmail.com" className="text-blue-600 hover:underline">
                      boss.basketbolista@gmail.com
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* <section className="border-t pt-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Facebook Data Deletion Instructions</h2>
              <div className="bg-blue-50 p-6 rounded-lg">
                <p className="text-blue-700 mb-4">
                  <strong>For Facebook Users:</strong> To delete your data associated with our app through Facebook:
                </p>
                <ol className="list-decimal pl-6 text-blue-700 space-y-2">
                  <li>Go to your Facebook Settings &amp; Privacy</li>
                  <li>Click on "Settings"</li>
                  <li>Look for "Apps and Websites" in the left-hand column</li>
                  <li>Find "basketbo-lista" in your list of apps</li>
                  <li>Click "Remove" to revoke app permissions and delete associated data</li>
                </ol>
                <p className="text-blue-700 mt-4">
                  Alternatively, you can email us directly at <a href="mailto:boss.basketbolista@gmail.com" className="underline">boss.basketbolista@gmail.com</a> for manual data deletion.
                </p>
              </div>
            </section> */}
          </div>
        </Card>

        <div className="mt-8 text-center">
          <Button onClick={() => window.location.href = '/'} variant="outline">
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;