export default function TermsOfServiceContent() {
  const sections = [
    {
      id: "eligibility",
      title: "1. Eligibility",
      subsections: [
        "You must be at least 13 years old to use the Services.",
        "If you are under the age of majority in your jurisdiction, you may use the Services only with the consent of a parent or legal guardian.",
        "You represent and warrant that all registration information you submit is accurate and that you will maintain its accuracy.",
      ],
    },
    {
      id: "account-registration",
      title: "2. Account Registration and Security",
      subsections: [
        "You are responsible for maintaining the confidentiality of your login credentials and for all activities occurring under your account.",
        "You agree to notify us immediately of any unauthorized access or security breach.",
        "Moai reserves the right to suspend or terminate accounts that violate these Terms or that pose a risk to the platform or other users.",
      ],
    },
    {
      id: "health-safety",
      title: "3. Health & Safety Notice (No Medical Advice)",
      subsections: [
        "Moai provides social accountability tools, workout tracking, activity logging, and optional access to coaches.",
        "Moai does NOT provide medical, nutritional, or healthcare advice, diagnosis, or treatment.",
        "By using the Services, you agree:",
        "• You understand the risks inherent in physical activity",
        "• You are voluntarily participating at your own risk",
        "• You will consult a qualified healthcare professional before starting any new fitness or wellness program, especially if pregnant, postpartum, injured, or managing a medical condition",
        "• You will stop any activity that causes pain, dizziness, or discomfort",
        "Moai LLC is not responsible for any injuries, health outcomes, or damages arising from your participation in fitness activities or your use of the Services.",
      ],
    },
    {
      id: "coaching",
      title: "4. Coaching, Programs & Recommendations",
      subsections: [
        "Guided Moais and coaching features provide general fitness guidance.",
        "Coaches are independent professionals and are not employees of Moai LLC.",
        "You acknowledge:",
        "• Coaches do not provide medical or clinical services",
        "• Recommendations are informational only",
        "• Results vary and are not guaranteed",
        "• You are solely responsible for evaluating and acting on any recommendations",
        "Moai may modify or discontinue coaching features at any time.",
      ],
    },
    {
      id: "payments",
      title: "5. Payments, Subscriptions & Billing",
      subsections: [
        "Some features—such as Guided Moais—require a paid subscription or recurring membership.",
        "By purchasing, you authorize Moai (and third-party processors such as Stripe or Apple) to charge your payment method for recurring fees until canceled.",
        "You understand:",
        "• Subscription fees renew automatically unless canceled before the renewal date",
        "• Refunds follow the policies of the platform used for purchase (e.g., Apple App Store) or Moai's internal policy if purchased directly",
        "• Pricing may change with prior notice",
        "• Moai may offer discounts, trials, or promotions that are subject to change",
        "You are responsible for managing your subscription settings.",
      ],
    },
    {
      id: "community-standards",
      title: "6. Community Standards",
      subsections: [
        "You agree to use the Services respectfully and not to engage in conduct that:",
        "• Harasses, threatens, or abuses others",
        "• Posts harmful, illegal, defamatory, or explicit content",
        "• Violates privacy or intellectual property rights",
        "• Involves spam, commercial solicitation, or unauthorized advertising",
        "• Disrupts the functionality or security of the platform",
        "Moai may remove content, restrict access, or terminate accounts that violate these standards.",
      ],
    },
    {
      id: "user-content",
      title: "7. User Content & License",
      subsections: [
        "You may submit activity logs, workout notes, messages, group interactions, and other material ('User Content').",
        "You retain ownership of your User Content. However, by submitting User Content, you grant Moai a non-exclusive, worldwide, royalty-free, sublicensable license to use, reproduce, modify, display, distribute, and process such content solely for:",
        "• Providing and improving the Services",
        "• Operating app features (e.g., Moai groups, feeds, analytics)",
        "• Ensuring safety and compliance",
        "You represent that you have the rights to submit the User Content and that it does not violate any laws or third-party rights.",
      ],
    },
    {
      id: "privacy",
      title: "8. Privacy & Data Practices",
      subsections: [
        "Your privacy is important to us.",
        "Our data practices—including the types of data we collect, how it is used, and your rights—are described in our Privacy Policy.",
        "By using the Services, you consent to the collection and processing of your information as described in the Privacy Policy.",
      ],
    },
    {
      id: "acceptable-use",
      title: "9. Acceptable Use",
      subsections: [
        "You agree not to:",
        "• Access systems without authorization",
        "• Interfere with security features or network operations",
        "• Copy, scrape, reverse engineer, or attempt to derive source code",
        "• Use automated tools that violate usage limits",
        "• Upload malware or harmful code",
        "Moai may enforce technical restrictions to protect the platform.",
      ],
    },
    {
      id: "intellectual-property",
      title: "10. Ownership & Intellectual Property",
      subsections: [
        "All intellectual property, including the Moai name, logos, branding, software, design, and features, is owned or licensed by Moai LLC.",
        "Nothing in these Terms grants you rights to use Moai's intellectual property without prior written consent.",
      ],
    },
    {
      id: "changes",
      title: "11. Changes to the Services",
      subsections: [
        "Moai is continuously improving and may:",
        "• Add or remove features",
        "• Update, modify, or discontinue parts of the Services",
        "• Release new versions or impose usage limits",
        "We will provide notice of material changes when required.",
      ],
    },
    {
      id: "termination",
      title: "12. Termination",
      subsections: [
        "We may suspend or terminate your access if:",
        "• You violate these Terms",
        "• Your conduct risks harm to users or Moai",
        "• Required for legal, regulatory, or security reasons",
        "You may delete your account at any time by contacting support or using in-app settings.",
        "Section rights that reasonably should survive termination—such as limitations of liability—will survive.",
      ],
    },
    {
      id: "disclaimers",
      title: "13. Disclaimers",
      subsections: [
        "To the fullest extent permitted by law:",
        "• The Services are provided 'as is' and 'as available'",
        "• We disclaim all warranties—express, implied, or statutory—including fitness for a particular purpose, accuracy, reliability, and non-infringement",
        "• We do not guarantee uninterrupted availability or error-free operation",
        "• Fitness outcomes, performance improvements, or group results are not guaranteed",
      ],
    },
    {
      id: "liability",
      title: "14. Limitation of Liability",
      subsections: [
        "To the maximum extent permitted by law, Moai LLC and its officers, directors, employees, contractors, and partners are not liable for:",
        "• Personal injury or health complications",
        "• Lost profits, revenue, or data",
        "• Indirect, incidental, or consequential damages",
        "• Unauthorized access to your data",
        "Our total liability to you for any claim will not exceed the amount you paid Moai in the twelve (12) months preceding the event giving rise to the claim.",
        "Some jurisdictions do not allow certain limitations; in those cases, limits apply to the fullest extent permitted.",
      ],
    },
    {
      id: "indemnification",
      title: "15. Indemnification",
      subsections: [
        "You agree to indemnify and hold harmless Moai LLC from any claims, damages, liabilities, and expenses arising from:",
        "• Your use of the Services",
        "• Your User Content",
        "• Your violation of these Terms",
        "• Your interaction with coaches or other users",
      ],
    },
    {
      id: "governing-law",
      title: "16. Governing Law & Dispute Resolution",
      subsections: [
        "These Terms are governed by the laws of the State of California, without regard to conflict-of-law principles.",
        "Any dispute shall be resolved through binding arbitration or small-claims court unless prohibited by law.",
        "You waive the right to participate in class actions or class-wide arbitration.",
      ],
    },
    {
      id: "contact",
      title: "17. Contact",
      subsections: ["Moai LLC", "Los Angeles, California", "Email: jay@withmoai.co"],
    },
  ]

  return (
    <div className="space-y-8">
      <div className="bg-card border border-border rounded-lg p-6">
        <p className="text-muted-foreground">
          {`These Terms of Service ("Terms") govern your access to and use of the Moai mobile application, website, products, and services (collectively, the "Services") provided by Moai LLC ("Moai," "we," "our," or "us").`}
        </p>
        <p className="text-muted-foreground mt-4">
          By creating an account or using the Services, you acknowledge that you have read, understand, and agree to be
          bound by these Terms.
        </p>
        <p className="text-muted-foreground mt-4 font-semibold">
          If you do not agree to these Terms, you may not use the Services.
        </p>
      </div>

      {sections.map((section) => (
        <div key={section.id} id={section.id} className="scroll-mt-24">
          <h2 className="text-2xl font-bold text-foreground mb-4">{section.title}</h2>
          <div className="space-y-3">
            {section.subsections.map((subsection, idx) => (
              <p key={idx} className="text-foreground leading-relaxed">
                {subsection}
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
