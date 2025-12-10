export default function PrivacyPolicyContent() {
  return (
    <article className="space-y-12 text-foreground">
      {/* Intro */}
      <div className="space-y-4 pb-8 border-b border-border">
        <p className="text-lg text-muted-foreground leading-relaxed">
          Moai LLC ("Moai," "we," "our," or "us") provides a social fitness platform designed to help people stay
          consistent through AI coaching, human support, and shared progress.
        </p>
        <p className="text-lg text-muted-foreground leading-relaxed">
          This Privacy Policy explains what information we collect, how we use it, how it is shared, and the choices you
          have regarding your data.
        </p>
        <p className="text-lg text-muted-foreground leading-relaxed">
          <strong>By using Moai, you agree to this Privacy Policy.</strong>
        </p>
      </div>

      {/* Section 1 */}
      <section data-section id="section-1" className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">1. Information We Collect</h2>
          <p className="text-muted-foreground">We collect the following categories of information when you use Moai:</p>
        </div>

        <div className="space-y-6 pl-4 border-l-2 border-primary/30">
          <div>
            <h3 className="font-semibold text-lg mb-3">1.1 Information You Provide</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <strong>Account / Identity Data:</strong> name, email, password (encrypted), profile photo, and optional
                demographic information.
              </li>
              <li>
                <strong>Movement & Activity Data:</strong> workouts, logged activities, goals, streaks, notes, and
                reflections.
              </li>
              <li>
                <strong>Social Data:</strong> interactions with your Moai groups, reactions, invitations, comments, and
                shared progress.
              </li>
              <li>
                <strong>Coaching Data:</strong> messages exchanged with human coaches and information you choose to
                provide for personalized support.
              </li>
              <li>
                <strong>AI Interaction Data:</strong> prompts, check-ins, and responses used for AI coaching features.
              </li>
              <li>
                <strong>Support Communications:</strong> messages sent to Moai support.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-3">1.2 Automatically Collected Information</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <strong>Device data:</strong> device model, OS version, unique identifiers, language settings.
              </li>
              <li>
                <strong>Usage data:</strong> app interactions, performance logs, session length, and feature usage
                patterns.
              </li>
              <li>
                <strong>Diagnostic data:</strong> crash logs, load times, and error reports.
              </li>
            </ul>
            <p className="text-muted-foreground mt-4">
              We do not collect precise GPS location unless you explicitly opt into a feature that requires it.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-3">1.3 Information from Integrations</h3>
            <p className="text-muted-foreground mb-3">
              If you connect third-party services (e.g., Apple Health), we may receive:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Activity summaries</li>
              <li>• Workout details</li>
              <li>• Health metrics you choose to share</li>
            </ul>
            <p className="text-muted-foreground mt-4">You can disconnect integrations at any time.</p>
          </div>
        </div>
      </section>

      {/* Section 2 */}
      <section data-section id="section-2" className="space-y-6">
        <h2 className="text-2xl font-bold">2. How We Use Your Information</h2>
        <p className="text-muted-foreground">We use your information to:</p>
        <ul className="space-y-2 text-muted-foreground pl-4 border-l-2 border-primary/30">
          <li>• Operate and improve the Moai platform</li>
          <li>• Personalize your AI coaching and weekly goals</li>
          <li>• Provide human coaching and support</li>
          <li>• Display movement data to your Moai groups</li>
          <li>• Facilitate community, accountability, and shared progress</li>
          <li>• Send reminders, notifications, and check-ins</li>
          <li>• Monitor service performance and prevent misuse</li>
          <li>• Conduct analytics to understand engagement and improve features</li>
          <li>• Comply with legal obligations</li>
        </ul>
        <p className="text-lg font-medium text-foreground mt-6">Moai does not sell your personal data.</p>
      </section>

      {/* Section 3 */}
      <section data-section id="section-3" className="space-y-6">
        <h2 className="text-2xl font-bold">3. How We Share Information</h2>
        <p className="text-muted-foreground">We share information only under the following circumstances:</p>

        <div className="space-y-6 pl-4 border-l-2 border-primary/30">
          <div>
            <h3 className="font-semibold text-lg mb-3">3.1 With Your Consent or Intent</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>• When you interact within Moai groups</li>
              <li>• When you connect with others</li>
              <li>• When you enable integrations or share progress</li>
              <li>• When you engage with a human coach</li>
            </ul>
            <p className="text-muted-foreground mt-4">You control what you share and with whom.</p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-3">3.2 Service Providers</h3>
            <p className="text-muted-foreground mb-3">
              We work with trusted vendors who help us operate Moai, including:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Database and hosting providers</li>
              <li>• Payment processors</li>
              <li>• Analytics tools</li>
              <li>• AI service providers</li>
              <li>• Customer support tools</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              These companies access data only as needed to perform services for us and must comply with confidentiality
              and data protection requirements.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-3">3.3 For Safety, Legal, and Compliance Purposes</h3>
            <p className="text-muted-foreground">We may disclose information if required to:</p>
            <ul className="space-y-2 text-muted-foreground mt-3">
              <li>• Comply with law</li>
              <li>• Respond to legal requests</li>
              <li>• Protect rights, property, or safety</li>
              <li>• Detect, prevent, or address fraud or abuse</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 4 */}
      <section data-section id="section-4" className="space-y-6">
        <h2 className="text-2xl font-bold">4. How Social Features Use Your Data</h2>
        <div className="bg-card p-6 rounded-lg border border-border space-y-3">
          <p className="text-muted-foreground">
            Moai includes social features designed around accountability and shared progress:
          </p>
          <ul className="space-y-2 text-muted-foreground">
            <li>• Members of your Moai can see your name, avatar, movement goals, and progress data.</li>
            <li>• Broader connections may see milestones or achievements you choose to share.</li>
            <li>• Private information is never made public outside your app relationships.</li>
            <li>• You may leave groups at any time.</li>
          </ul>
        </div>
      </section>

      {/* Section 5 */}
      <section data-section id="section-5" className="space-y-6">
        <h2 className="text-2xl font-bold">5. AI Data Practices</h2>
        <p className="text-muted-foreground mb-4">
          Moai uses AI to provide personalized coaching. When using AI features:
        </p>
        <div className="space-y-3 text-muted-foreground pl-4 border-l-2 border-primary/30">
          <p>• Your prompts, notes, and activity summaries may be processed to deliver coaching responses.</p>
          <p>• AI providers process only what is necessary to operate the feature.</p>
          <p>• We do not allow AI vendors to train general models on your data.</p>
          <p>• Data is stored according to our normal retention practices.</p>
        </div>
      </section>

      {/* Section 6 */}
      <section data-section id="section-6" className="space-y-6">
        <h2 className="text-2xl font-bold">6. Coaching Access</h2>
        <p className="text-muted-foreground mb-4">If you opt into human coaching:</p>
        <div className="space-y-3 text-muted-foreground pl-4 border-l-2 border-primary/30">
          <p>• Coaches may view your logged activities, goals, summaries, and messages you send them.</p>
          <p>• Coaches cannot access private messages outside the coaching context.</p>
          <p>• You may end coaching at any time.</p>
        </div>
      </section>

      {/* Section 7 */}
      <section data-section id="section-7" className="space-y-6">
        <h2 className="text-2xl font-bold">7. Your Choices & Controls</h2>
        <p className="text-muted-foreground mb-4">You have control over:</p>
        <ul className="space-y-2 text-muted-foreground pl-4 border-l-2 border-primary/30">
          <li>• Profile visibility</li>
          <li>• Group participation</li>
          <li>• Data connected through integrations</li>
          <li>• Notification settings</li>
          <li>• Data downloads</li>
          <li>• Account deletion</li>
        </ul>
        <p className="text-muted-foreground mt-4">You can manage many preferences directly in-app.</p>
      </section>

      {/* Section 8 */}
      <section data-section id="section-8" className="space-y-6">
        <h2 className="text-2xl font-bold">8. Data Retention</h2>
        <p className="text-muted-foreground">
          We retain your data as long as your account is active. If you delete your account, we will delete or anonymize
          your data within a reasonable timeframe unless retention is required by law.
        </p>
      </section>

      {/* Section 9 */}
      <section data-section id="section-9" className="space-y-6">
        <h2 className="text-2xl font-bold">9. Your Rights</h2>
        <p className="text-muted-foreground mb-4">Depending on your location, you may have rights to:</p>
        <ul className="space-y-2 text-muted-foreground pl-4 border-l-2 border-primary/30">
          <li>• Access your data</li>
          <li>• Correct inaccurate information</li>
          <li>• Request deletion</li>
          <li>• Request data portability</li>
          <li>• Restrict or object to processing</li>
        </ul>
        <p className="text-muted-foreground mt-4">
          To exercise these rights, contact:{" "}
          <a href="mailto:jay@withmoai.co" className="text-primary hover:underline font-medium">
            jay@withmoai.co
          </a>
        </p>
      </section>

      {/* Section 10 */}
      <section data-section id="section-10" className="space-y-6">
        <h2 className="text-2xl font-bold">10. Security</h2>
        <p className="text-muted-foreground">
          Moai uses industry-standard security measures such as encryption, secure storage, and access controls to
          protect your data. No system is 100% secure, but we work continually to safeguard your information.
        </p>
      </section>

      {/* Section 11 */}
      <section data-section id="section-11" className="space-y-6">
        <h2 className="text-2xl font-bold">11. Children's Privacy</h2>
        <p className="text-muted-foreground">
          Moai is not intended for children under 13 (or the minimum age in your region). We do not knowingly collect
          personal data from children.
        </p>
      </section>

      {/* Section 12 */}
      <section data-section id="section-12" className="space-y-6">
        <h2 className="text-2xl font-bold">12. International Data Transfers</h2>
        <p className="text-muted-foreground">
          Moai may process and store data in the United States or other countries. We use appropriate safeguards when
          transferring data across borders.
        </p>
      </section>

      {/* Section 13 */}
      <section data-section id="section-13" className="space-y-6">
        <h2 className="text-2xl font-bold">13. Changes to This Policy</h2>
        <p className="text-muted-foreground">
          We may update this Privacy Policy from time to time. Material updates will be communicated through the app or
          by email.
        </p>
      </section>

      {/* Section 14 */}
      <section data-section id="section-14" className="space-y-6 pb-12 border-b border-border">
        <h2 className="text-2xl font-bold">14. Contact Us</h2>
        <div className="bg-card p-6 rounded-lg border border-border">
          <p className="text-muted-foreground mb-3">For questions or data requests:</p>
          <div className="space-y-2 text-muted-foreground">
            <p>
              <strong>Moai LLC</strong>
            </p>
            <p>
              Email:{" "}
              <a href="mailto:jay@withmoai.co" className="text-primary hover:underline font-medium">
                jay@withmoai.co
              </a>
            </p>
          </div>
        </div>
      </section>
    </article>
  )
}
