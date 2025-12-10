export default function TermsOfUseContent() {
  return (
    <div className="space-y-12 text-foreground">
      {/* Header Info */}
      <div className="pb-8 border-b border-border">
        <p className="text-muted-foreground mb-2">
          <strong>Company:</strong> Moai LLC
        </p>
        <p className="text-muted-foreground">
          <strong>Contact:</strong>{" "}
          <a href="mailto:jay@withmoai.co" className="text-primary hover:underline">
            jay@withmoai.co
          </a>
        </p>
      </div>

      <div className="prose prose-sm max-w-none dark:prose-invert">
        <p className="text-base leading-relaxed text-foreground">
          These Terms of Use ("Terms") govern your access to and use of the Moai mobile application, website, products,
          and services (collectively, the "Services") provided by Moai LLC ("Moai," "we," "our," or "us").
        </p>
        <p className="text-base leading-relaxed text-foreground">
          By creating an account or using the Services, you acknowledge that you have read, understand, and agree to be
          bound by these Terms.
        </p>
        <p className="text-base leading-relaxed text-foreground font-semibold">
          If you do not agree to these Terms, you may not use the Services.
        </p>
      </div>

      {/* Section 1 */}
      <section id="eligibility" className="space-y-4">
        <h2 className="text-2xl font-bold">1. Eligibility</h2>
        <ul className="space-y-3 list-disc list-inside text-foreground">
          <li>You must be at least 13 years old to use the Services.</li>
          <li>
            If you are under the age of majority in your jurisdiction, you may use the Services only with the consent of
            a parent or legal guardian.
          </li>
          <li>
            You represent and warrant that all registration information you submit is accurate and that you will
            maintain its accuracy.
          </li>
        </ul>
      </section>

      {/* Section 2 */}
      <section id="account-registration" className="space-y-4">
        <h2 className="text-2xl font-bold">2. Account Registration and Security</h2>
        <ul className="space-y-3 list-disc list-inside text-foreground">
          <li>
            You are responsible for maintaining the confidentiality of your login credentials and for all activities
            occurring under your account.
          </li>
          <li>You agree to notify us immediately of any unauthorized access or security breach.</li>
          <li>
            Moai reserves the right to suspend or terminate accounts that violate these Terms or that pose a risk to the
            platform or other users.
          </li>
        </ul>
      </section>

      {/* Section 3 */}
      <section id="health-safety" className="space-y-4">
        <h2 className="text-2xl font-bold">3. Health & Safety Notice (No Medical Advice)</h2>
        <p className="text-foreground">
          Moai provides social accountability tools, workout tracking, activity logging, and optional access to coaches.{" "}
          <strong>Moai does NOT provide medical, nutritional, or healthcare advice, diagnosis, or treatment.</strong>
        </p>
        <p className="text-foreground font-semibold">By using the Services, you agree:</p>
        <ul className="space-y-3 list-disc list-inside text-foreground">
          <li>you understand the risks inherent in physical activity;</li>
          <li>you are voluntarily participating at your own risk;</li>
          <li>
            you will consult a qualified healthcare professional before starting any new fitness or wellness program,
            especially if pregnant, postpartum, injured, or managing a medical condition;
          </li>
          <li>you will stop any activity that causes pain, dizziness, or discomfort.</li>
        </ul>
        <p className="text-foreground">
          <strong>
            Moai LLC is not responsible for any injuries, health outcomes, or damages arising from your participation in
            fitness activities or your use of the Services.
          </strong>
        </p>
      </section>

      {/* Section 4 */}
      <section id="coaching" className="space-y-4">
        <h2 className="text-2xl font-bold">4. Coaching, Programs & Recommendations</h2>
        <p className="text-foreground">
          Guided Moais and coaching features provide general fitness guidance. Coaches are independent professionals and
          are not employees of Moai LLC.
        </p>
        <p className="text-foreground font-semibold">You acknowledge:</p>
        <ul className="space-y-3 list-disc list-inside text-foreground">
          <li>coaches do not provide medical or clinical services;</li>
          <li>recommendations are informational only;</li>
          <li>results vary and are not guaranteed;</li>
          <li>you are solely responsible for evaluating and acting on any recommendations.</li>
        </ul>
        <p className="text-foreground">Moai may modify or discontinue coaching features at any time.</p>
      </section>

      {/* Section 5 */}
      <section id="payments" className="space-y-4">
        <h2 className="text-2xl font-bold">5. Payments, Subscriptions & Billing</h2>

        <h3 className="text-lg font-semibold">5.1 Subscription Tiers</h3>
        <p className="text-foreground">Moai offers the following subscription tiers:</p>

        <div className="pl-4 space-y-4">
          <div>
            <h4 className="font-semibold text-foreground">5.1.1 Free Tier</h4>
            <p className="text-foreground font-medium">Includes:</p>
            <ul className="space-y-2 list-disc list-inside text-foreground">
              <li>Unlimited chat with Mili (AI coach)</li>
              <li>Unlimited Village members (1-on-1 connections)</li>
              <li>Access to 1 Moai (circle) forever</li>
              <li>All workout features (view, start, complete workouts)</li>
              <li>Community feed access</li>
              <li>Personal stats and progress tracking</li>
            </ul>
            <p className="text-foreground font-medium mt-3">Limitations:</p>
            <ul className="space-y-2 list-disc list-inside text-foreground">
              <li>Limited to 1 Moai creation</li>
              <li>Workout swaps are not available (upgrade prompts shown)</li>
              <li>Fitness Coach chat access is not available</li>
              <li>Priority Moai IRL access is not available</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground">5.1.2 Moai Premium ($14.99/month)</h4>
            <p className="text-foreground font-medium">Includes all Free Tier features, plus:</p>
            <ul className="space-y-2 list-disc list-inside text-foreground">
              <li>Unlimited Moai creation</li>
              <li>Workout swaps (bodyweight library + manual entry)</li>
              <li>Priority access to Moai IRL (when available)</li>
            </ul>
            <p className="text-foreground">
              <strong>Does not include:</strong> Fitness Coach chat access
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground">5.1.3 Moai Coach ($80/month)</h4>
            <p className="text-foreground font-medium">Includes all Moai Premium features, plus:</p>
            <ul className="space-y-2 list-disc list-inside text-foreground">
              <li>1-on-1 Coach Chat with certified fitness coach</li>
              <li>Personalized form analysis & feedback</li>
              <li>Recovery strategies and rest guidance</li>
              <li>Asynchronous support throughout the week</li>
              <li>Optional video check-ins via Calendly</li>
            </ul>
          </div>
        </div>

        <h3 className="text-lg font-semibold mt-6">5.2 Billing and Payment</h3>
        <p className="text-foreground">
          Some features—such as Moai Premium and Moai Coach subscriptions—require a paid subscription or recurring
          membership.
        </p>
        <p className="text-foreground">
          By purchasing a subscription, you authorize Moai (and third-party processors such as Stripe, Apple App Store,
          or Google Play Store) to charge your payment method for recurring fees until canceled.
        </p>
        <p className="text-foreground font-semibold">You understand:</p>
        <ul className="space-y-3 list-disc list-inside text-foreground">
          <li>Subscription fees are billed on a recurring monthly basis</li>
          <li>Payment is processed through your selected payment method</li>
          <li>You are responsible for ensuring your payment information is accurate and up to date</li>
          <li>All prices are in USD unless otherwise stated</li>
          <li>Prices may vary by region due to currency conversion and local taxes</li>
        </ul>

        <h3 className="text-lg font-semibold mt-6">5.3 Auto-Renewal</h3>
        <p className="text-foreground">
          Subscription fees renew automatically unless canceled before the renewal date.
        </p>
        <p className="text-foreground">You will be charged the subscription fee on your renewal date.</p>
        <p className="text-foreground">
          To avoid being charged, you must cancel your subscription at least 24 hours before the end of the current
          billing period. Cancellation can be done through your account settings or through the App Store/Play Store
          subscription management.
        </p>

        <h3 className="text-lg font-semibold mt-6">5.4 Cancellation</h3>
        <p className="text-foreground">
          You may cancel your subscription at any time through your account settings or through the platform used for
          purchase (e.g., Apple App Store, Google Play Store).
        </p>
        <ul className="space-y-3 list-disc list-inside text-foreground">
          <li>Cancellation takes effect at the end of your current billing period</li>
          <li>You will retain access to all premium features until the end of your paid period</li>
          <li>No refunds will be provided for the current billing period after cancellation</li>
          <li>Upon cancellation, your account will revert to the Free Tier at the end of the billing period</li>
        </ul>

        <h3 className="text-lg font-semibold mt-6">5.5 Refunds</h3>
        <p className="text-foreground">
          Refunds follow the policies of the platform used for purchase (e.g., Apple App Store, Google Play Store) or
          Moai's internal policy if purchased directly through Stripe.
        </p>
        <p className="text-foreground">
          Refunds are generally not provided for subscription fees. We may, at our sole discretion, provide refunds or
          credits in exceptional circumstances.
        </p>
        <p className="text-foreground">
          If you believe you are entitled to a refund, please contact us through the app's support features or at{" "}
          <a href="mailto:jay@withmoai.co" className="text-primary hover:underline">
            jay@withmoai.co
          </a>
          .
        </p>

        <h3 className="text-lg font-semibold mt-6">5.6 Subscription Changes</h3>
        <p className="text-foreground">
          You may upgrade or downgrade your subscription at any time through your account settings.
        </p>
        <ul className="space-y-3 list-disc list-inside text-foreground">
          <li>
            Upgrades take effect immediately, and you will be charged a prorated amount for the remainder of the billing
            period
          </li>
          <li>Downgrades take effect at the end of your current billing period</li>
          <li>When downgrading, you will retain access to premium features until the end of your paid period</li>
        </ul>

        <h3 className="text-lg font-semibold mt-6">5.7 Feature Access</h3>
        <ul className="space-y-3 list-disc list-inside text-foreground">
          <li>Subscription features are tied to your account and cannot be transferred</li>
          <li>Access to premium features requires an active, paid subscription</li>
          <li>We reserve the right to modify, add, or remove features from any subscription tier</li>
          <li>Significant changes to subscription features will be communicated to affected users</li>
        </ul>

        <h3 className="text-lg font-semibold mt-6">5.8 Pricing Changes</h3>
        <p className="text-foreground">Pricing may change with prior notice.</p>
        <ul className="space-y-3 list-disc list-inside text-foreground">
          <li>Price changes will not affect your current billing period</li>
          <li>You will be notified of price changes before your next billing cycle</li>
          <li>Continued use of the service after a price change constitutes acceptance of the new price</li>
        </ul>

        <h3 className="text-lg font-semibold mt-6">5.9 Promotions and Trials</h3>
        <p className="text-foreground">Moai may offer discounts, trials, or promotions that are subject to change.</p>
        <ul className="space-y-3 list-disc list-inside text-foreground">
          <li>
            Trial periods, if offered, will automatically convert to a paid subscription unless canceled before the
            trial ends
          </li>
          <li>Promotional pricing may be limited-time offers and may not be available to all users</li>
        </ul>

        <h3 className="text-lg font-semibold mt-6">5.10 Subscription Termination</h3>
        <p className="text-foreground">
          We reserve the right to suspend or terminate your subscription if you violate these Terms. Violations may
          result in immediate termination without refund.
        </p>
        <p className="text-foreground">
          We may also suspend or terminate subscriptions for any reason, with or without notice.
        </p>
        <p className="text-foreground">
          Upon termination, your account will revert to the Free Tier. You are responsible for managing your
          subscription settings.
        </p>
      </section>

      {/* Section 6 */}
      <section id="community-standards" className="space-y-4">
        <h2 className="text-2xl font-bold">6. Community Standards</h2>
        <p className="text-foreground">You agree to use the Services respectfully and not to engage in conduct that:</p>
        <ul className="space-y-3 list-disc list-inside text-foreground">
          <li>harasses, threatens, or abuses others;</li>
          <li>posts harmful, illegal, defamatory, or explicit content;</li>
          <li>violates privacy or intellectual property rights;</li>
          <li>involves spam, commercial solicitation, or unauthorized advertising;</li>
          <li>disrupts the functionality or security of the platform.</li>
        </ul>
        <p className="text-foreground">
          Moai may remove content, restrict access, or terminate accounts that violate these standards.
        </p>
      </section>

      {/* Section 7 */}
      <section id="user-content" className="space-y-4">
        <h2 className="text-2xl font-bold">7. User Content & License</h2>
        <p className="text-foreground">
          You may submit activity logs, workout notes, messages, group interactions, and other material ("User
          Content").
        </p>
        <p className="text-foreground">
          <strong>You retain ownership of your User Content.</strong> However, by submitting User Content, you grant
          Moai a non-exclusive, worldwide, royalty-free, sublicensable license to use, reproduce, modify, display,
          distribute, and process such content solely for:
        </p>
        <ul className="space-y-3 list-disc list-inside text-foreground">
          <li>providing and improving the Services;</li>
          <li>operating app features (e.g., Moai groups, feeds, analytics);</li>
          <li>ensuring safety and compliance.</li>
        </ul>
        <p className="text-foreground">
          You represent that you have the rights to submit the User Content and that it does not violate any laws or
          third-party rights.
        </p>
      </section>

      {/* Section 8 */}
      <section id="privacy" className="space-y-4">
        <h2 className="text-2xl font-bold">8. Privacy & Data Practices</h2>
        <p className="text-foreground">
          Your privacy is important to us. Our data practices—including the types of data we collect, how it is used,
          and your rights—are described in our{" "}
          <a href="/privacy" className="text-primary hover:underline font-semibold">
            Privacy Policy
          </a>
        </p>
        <p className="text-foreground">
          By using the Services, you consent to the collection and processing of your information as described in the
          Privacy Policy.
        </p>
      </section>

      {/* Section 9 */}
      <section id="acceptable-use" className="space-y-4">
        <h2 className="text-2xl font-bold">9. Acceptable Use</h2>
        <p className="text-foreground">You agree not to:</p>
        <ul className="space-y-3 list-disc list-inside text-foreground">
          <li>access systems without authorization;</li>
          <li>interfere with security features or network operations;</li>
          <li>copy, scrape, reverse engineer, or attempt to derive source code;</li>
          <li>use automated tools that violate usage limits;</li>
          <li>upload malware or harmful code.</li>
        </ul>
        <p className="text-foreground">Moai may enforce technical restrictions to protect the platform.</p>
      </section>

      {/* Section 10 */}
      <section id="ownership" className="space-y-4">
        <h2 className="text-2xl font-bold">10. Ownership & Intellectual Property</h2>
        <p className="text-foreground">
          All intellectual property, including the Moai name, logos, branding, software, design, and features, is owned
          or licensed by Moai LLC. Nothing in these Terms grants you rights to use Moai's intellectual property without
          prior written consent.
        </p>
      </section>

      {/* Section 11 */}
      <section id="changes-to-services" className="space-y-4">
        <h2 className="text-2xl font-bold">11. Changes to the Services</h2>
        <p className="text-foreground">Moai is continuously improving and may:</p>
        <ul className="space-y-3 list-disc list-inside text-foreground">
          <li>add or remove features;</li>
          <li>update, modify, or discontinue parts of the Services;</li>
          <li>release new versions or impose usage limits.</li>
        </ul>
        <p className="text-foreground">We will provide notice of material changes when required.</p>
      </section>

      {/* Section 12 */}
      <section id="termination" className="space-y-4">
        <h2 className="text-2xl font-bold">12. Termination</h2>
        <p className="text-foreground">We may suspend or terminate your access if:</p>
        <ul className="space-y-3 list-disc list-inside text-foreground">
          <li>you violate these Terms;</li>
          <li>your conduct risks harm to users or Moai;</li>
          <li>required for legal, regulatory, or security reasons.</li>
        </ul>
        <p className="text-foreground">
          You may delete your account at any time by contacting support or using in-app settings.
        </p>
        <p className="text-foreground">
          Section rights that reasonably should survive termination—such as limitations of liability—will survive.
        </p>
      </section>

      {/* Section 13 */}
      <section id="disclaimers" className="space-y-4">
        <h2 className="text-2xl font-bold">13. Disclaimers</h2>
        <p className="text-foreground">To the fullest extent permitted by law:</p>
        <ul className="space-y-3 list-disc list-inside text-foreground">
          <li>the Services are provided "as is" and "as available";</li>
          <li>
            we disclaim all warranties—express, implied, or statutory—including fitness for a particular purpose,
            accuracy, reliability, and non-infringement;
          </li>
          <li>we do not guarantee uninterrupted availability or error-free operation;</li>
          <li>fitness outcomes, performance improvements, or group results are not guaranteed.</li>
        </ul>
      </section>

      {/* Section 14 */}
      <section id="limitation-of-liability" className="space-y-4">
        <h2 className="text-2xl font-bold">14. Limitation of Liability</h2>
        <p className="text-foreground">
          To the maximum extent permitted by law, Moai LLC and its officers, directors, employees, contractors, and
          partners are not liable for:
        </p>
        <ul className="space-y-3 list-disc list-inside text-foreground">
          <li>personal injury or health complications;</li>
          <li>lost profits, revenue, or data;</li>
          <li>indirect, incidental, or consequential damages;</li>
          <li>unauthorized access to your data.</li>
        </ul>
        <p className="text-foreground">
          Our total liability to you for any claim will not exceed the amount you paid Moai in the twelve (12) months
          preceding the event giving rise to the claim.
        </p>
        <p className="text-foreground">
          Some jurisdictions do not allow certain limitations; in those cases, limits apply to the fullest extent
          permitted.
        </p>
      </section>

      {/* Section 15 */}
      <section id="indemnification" className="space-y-4">
        <h2 className="text-2xl font-bold">15. Indemnification</h2>
        <p className="text-foreground">
          You agree to indemnify and hold harmless Moai LLC from any claims, damages, liabilities, and expenses arising
          from:
        </p>
        <ul className="space-y-3 list-disc list-inside text-foreground">
          <li>your use of the Services;</li>
          <li>your User Content;</li>
          <li>your violation of these Terms;</li>
          <li>your interaction with coaches or other users.</li>
        </ul>
      </section>

      {/* Section 16 */}
      <section id="governing-law" className="space-y-4">
        <h2 className="text-2xl font-bold">16. Governing Law & Dispute Resolution</h2>
        <p className="text-foreground">
          These Terms are governed by the laws of the State of California, without regard to conflict-of-law principles.
        </p>
        <p className="text-foreground">
          Any dispute shall be resolved through binding arbitration or small-claims court unless prohibited by law. You
          waive the right to participate in class actions or class-wide arbitration.
        </p>
      </section>

      {/* Section 17 */}
      <section id="contact" className="space-y-4">
        <h2 className="text-2xl font-bold">17. Contact</h2>
        <div className="space-y-2 text-foreground">
          <p>
            <strong>Moai LLC</strong>
          </p>
          <p>Los Angeles, California</p>
          <p>
            Email:{" "}
            <a href="mailto:jay@withmoai.co" className="text-primary hover:underline">
              jay@withmoai.co
            </a>
          </p>
        </div>
      </section>
    </div>
  )
}
