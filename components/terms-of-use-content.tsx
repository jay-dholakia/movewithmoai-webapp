import Link from "next/link"

type Block =
  | { type: "p"; text: string }
  | { type: "strong"; text: string }
  | { type: "quote"; text: string }
  | { type: "h3"; text: string }
  | { type: "list"; items: string[] }
  | { type: "email"; before: string; email: string; after: string }
  | { type: "privacy"; before: string; after: string }
  | { type: "contact" }
  | { type: "address" }

const sections: { id: string; title: string; blocks: Block[] }[] = [
  {
    id: "what-moai-is",
    title: "1. What Moai Is — and What It Isn't",
    blocks: [
      { type: "p", text: "Moai is a fitness and wellness platform designed to help people build consistent exercise habits through structured workout programming, accountability, community, progress tracking, and, where applicable, coaching." },
      { type: "p", text: "Depending on the Services you use, Moai may provide or facilitate:" },
      {
        type: "list",
        items: [
          "Structured fitness programs and workouts;",
          "Coach-led fitness groups;",
          "Peer accountability groups;",
          "Workout logging and progress tracking;",
          "Fitness recommendations and personalization;",
          "Group and direct messaging;",
          "Commitment and consistency tracking;",
          "AI-assisted features;",
          "Integration with compatible devices or third-party services; and",
          "Other fitness, wellness, community, or coaching features.",
        ],
      },
      { type: "strong", text: "Moai is not a healthcare provider." },
      { type: "p", text: "The Services are provided for general fitness, educational, motivational, and wellness purposes only. Nothing provided through Moai—including workouts, programs, coach communications, AI-generated content, recommendations, progress metrics, or information from other members—is intended to constitute medical advice, diagnosis, treatment, physical therapy, nutritional treatment, or another healthcare service." },
      { type: "p", text: "Before beginning or changing an exercise program, you should consult a physician or other qualified healthcare professional if appropriate for your circumstances, particularly if you have an existing medical condition, injury, physical limitation, are taking medication, are pregnant or postpartum, or have concerns about whether exercise is appropriate for you." },
      { type: "p", text: "You are responsible for determining whether you are physically able to perform any exercise or participate in any activity made available through the Services." },
      { type: "p", text: "Fitness results vary substantially between individuals. Moai does not guarantee any particular result, including weight loss, strength gains, improvements in health, adherence, performance, or physical appearance." },
    ],
  },
  {
    id: "assumption-of-risk",
    title: "2. Assumption of Risk",
    blocks: [
      { type: "strong", text: "Physical exercise involves inherent risks." },
      { type: "p", text: "These risks may include muscle soreness, strains, sprains, falls, fractures, aggravation of existing conditions, cardiovascular events, serious injury, and, in rare cases, death." },
      { type: "p", text: "By participating in workouts, programs, challenges, coaching, or other physical activities offered or facilitated through Moai, you acknowledge and voluntarily assume the risks associated with physical exercise to the fullest extent permitted by applicable law." },
      { type: "p", text: "You agree to stop exercising and seek appropriate medical attention if you experience symptoms such as chest pain, severe shortness of breath, dizziness, loss of consciousness, unusual pain, or any other symptom that may indicate a medical problem." },
      { type: "p", text: "You are responsible for using proper equipment, maintaining a safe workout environment, selecting appropriate resistance and intensity, and exercising within your abilities." },
    ],
  },
  {
    id: "who-can-use",
    title: "3. Who Can Use Moai",
    blocks: [
      { type: "p", text: "You must be at least 18 years old to create a Moai account or use the Services unless Moai expressly permits otherwise for a particular Service." },
      { type: "p", text: "By using the Services, you represent that:" },
      {
        type: "list",
        items: [
          "You meet the applicable age requirement;",
          "You have the legal capacity to agree to these Terms;",
          "The information you provide to Moai is accurate and current; and",
          "Your use of the Services does not violate applicable law.",
        ],
      },
      { type: "p", text: "You are responsible for keeping your account credentials secure and for activity occurring through your account." },
      { type: "email", before: "If you believe your account has been accessed without authorization, contact us promptly at ", email: "support@withmoai.co", after: "." },
      { type: "p", text: "Moai is not responsible for unauthorized account access resulting from your failure to reasonably protect your account credentials or devices." },
    ],
  },
  {
    id: "coaches",
    title: "4. Coaches and Coaching Services",
    blocks: [
      { type: "p", text: "Certain Moai Services may connect you with fitness coaches or provide access to coach-led groups." },
      { type: "p", text: "Unless Moai expressly states otherwise, coaches offering services through Moai may be independent contractors and are not employees, agents, healthcare providers, or legal representatives of Moai." },
      { type: "p", text: "Coaches may provide fitness programming, accountability, general wellness information, feedback, encouragement, and other coaching services." },
      { type: "p", text: "Coaches are not authorized through the Moai platform to diagnose medical conditions, prescribe medical treatment, provide physical therapy, or replace the advice of a licensed healthcare professional." },
      { type: "p", text: "You understand that:" },
      {
        type: "list",
        items: [
          "Coaching through Moai may occur in a group setting rather than one-on-one;",
          "Coaches may work with multiple members at the same time;",
          "Coach availability and response times may vary;",
          "A coach may modify workouts or programming based on information you provide;",
          "You remain responsible for determining whether a workout or recommendation is appropriate for you; and",
          "Moai does not guarantee the actions, qualifications, performance, availability, statements, or results of any particular coach except as required by applicable law.",
        ],
      },
      { type: "p", text: "Moai may replace, remove, suspend, or reassign coaches when reasonably necessary to operate the Services." },
    ],
  },
  {
    id: "community",
    title: "5. Community and Group Features",
    blocks: [
      { type: "p", text: "Moai is designed around accountability and community. Certain Services may allow you to interact with coaches and other members through group chats, direct messages, activity feeds, workout updates, progress information, reactions, or other social features." },
      { type: "p", text: "Information you choose to share within a group may be visible to other members of that group." },
      { type: "p", text: "You should not share information with other members that you do not want them to know or retain." },
      { type: "p", text: "Although Moai may establish community standards and take reasonable steps to enforce them, Moai does not control everything other members say or do and does not guarantee the conduct, identity, accuracy, or reliability of another user." },
      { type: "p", text: "You are responsible for your interactions with other members." },
      { type: "p", text: "You may not use Moai to harass, threaten, abuse, stalk, exploit, discriminate against, or otherwise harm another person." },
    ],
  },
  {
    id: "your-content",
    title: "6. Your Content",
    blocks: [
      { type: "p", text: "The Services may allow you to submit information including:" },
      {
        type: "list",
        items: [
          "Profile information;",
          "Fitness goals;",
          "Exercise history;",
          "Workout logs;",
          "Exercise performance;",
          "Progress information;",
          "Equipment availability;",
          "Injury or limitation information;",
          "Photos;",
          "Messages;",
          "Coach communications;",
          "Group posts;",
          "Comments;",
          "Notes;",
          "Feedback; and",
          "Other information or materials you submit through Moai.",
        ],
      },
      { type: "p", text: "Collectively, this is “User Content.”" },
      { type: "p", text: "You retain ownership of your User Content." },
      { type: "p", text: "By submitting User Content through Moai, you grant Moai a worldwide, non-exclusive, royalty-free, transferable, and sublicensable license to host, store, reproduce, process, transmit, analyze, modify, display, and otherwise use your User Content as reasonably necessary to:" },
      {
        type: "list",
        items: [
          "Operate the Services;",
          "Provide your fitness and coaching experience;",
          "Personalize your experience;",
          "Enable interactions with coaches and other members;",
          "Maintain, secure, and improve the Services;",
          "Develop features and analytics;",
          "Comply with applicable law; and",
          "Enforce these Terms.",
        ],
      },
      { type: "privacy", before: "Our handling of personal information is also governed by our ", after: " and, where applicable, any Consumer Health Data Privacy Notice maintained by Moai." },
      { type: "p", text: "You represent that you have the rights necessary to submit your User Content and permit Moai to use it as described in these Terms." },
    ],
  },
  {
    id: "fitness-health-info",
    title: "7. Fitness and Health Information",
    blocks: [
      { type: "p", text: "Moai may ask you to provide information relating to your fitness, exercise history, goals, injuries, physical limitations, available equipment, health considerations, or other information to help personalize your experience." },
      { type: "p", text: "Moai may also receive fitness or activity information from third-party services that you choose to connect." },
      { type: "p", text: "The fact that Moai collects or uses this information does not mean Moai has evaluated or confirmed that any workout, exercise, program, recommendation, coach communication, or other activity is medically appropriate for you." },
      { type: "p", text: "Information provided to Moai may be incomplete, outdated, inaccurate, or misunderstood. You are responsible for updating relevant information and seeking professional medical advice when appropriate." },
    ],
  },
  {
    id: "third-party",
    title: "8. Wearables and Third-Party Integrations",
    blocks: [
      { type: "p", text: "The Services may integrate with third-party platforms, devices, applications, payment providers, health or fitness platforms, or other services." },
      { type: "p", text: "Examples may include wearable-device platforms, health-data platforms, payment processors, app stores, communications providers, or authentication services." },
      { type: "p", text: "These third parties operate independently from Moai and may be governed by their own terms and privacy policies." },
      { type: "p", text: "When you choose to connect a third-party service, you authorize Moai to access, receive, process, and display information made available through that connection as described in our Privacy Policy." },
      { type: "p", text: "Moai cannot guarantee the accuracy, completeness, availability, or reliability of information generated by third-party services." },
      { type: "p", text: "Moai is not responsible for errors, interruptions, missing information, syncing failures, or other issues caused by third-party platforms, devices, networks, services, or settings." },
    ],
  },
  {
    id: "ai-features",
    title: "9. AI-Powered Features",
    blocks: [
      { type: "p", text: "Certain parts of Moai may use artificial intelligence, machine learning, algorithms, automated systems, or similar technologies to help create or modify:" },
      {
        type: "list",
        items: [
          "Workout recommendations;",
          "Exercise selections;",
          "Program adaptations;",
          "Summaries;",
          "Messages;",
          "Insights;",
          "Progress information;",
          "Coaching tools; or",
          "Other content.",
        ],
      },
      { type: "p", text: "We refer to this as “AI Output.”" },
      { type: "p", text: "AI Output may be inaccurate, incomplete, inappropriate for your circumstances, or contain errors." },
      { type: "p", text: "AI Output does not constitute medical advice or another professional healthcare service." },
      { type: "p", text: "You should exercise your own judgment before relying on AI Output and should consult an appropriate professional where a decision may affect your health or safety." },
      { type: "p", text: "Moai does not guarantee that AI Output will be unique or that another user will not receive similar output." },
    ],
  },
  {
    id: "payments",
    title: "10. Payments, Subscriptions, and Cancellation",
    blocks: [
      { type: "p", text: "Certain Moai Services require payment." },
      { type: "p", text: "When purchasing a subscription or other paid Service, you agree to pay the price and applicable taxes disclosed at the time of purchase." },
      { type: "p", text: "Depending on where you purchase your subscription, payments may be processed by Moai, a third-party payment processor, or an application marketplace such as the Apple App Store or Google Play." },
      { type: "p", text: "If your subscription is purchased through a third-party application marketplace, billing, cancellation, and refund requests may also be subject to that marketplace’s terms and procedures." },
      { type: "p", text: "Unless otherwise stated at purchase, subscriptions automatically renew at the applicable recurring interval until canceled." },
      { type: "p", text: "You authorize the applicable payment provider to charge your selected payment method for recurring subscription fees until cancellation." },
      { type: "p", text: "You may cancel your subscription through the cancellation method available for the platform through which you subscribed." },
      { type: "p", text: "Cancellation prevents future renewal charges but generally does not provide a refund for amounts already paid, except where required by law or expressly stated otherwise." },
      { type: "p", text: "You will generally continue to have access to paid Services through the end of your current paid billing period." },
      { type: "p", text: "Moai may change subscription prices from time to time. If a price change applies to an active subscription, we will provide any notice required by applicable law." },
    ],
  },
  {
    id: "free-trials",
    title: "11. Free Trials and Promotions",
    blocks: [
      { type: "p", text: "Moai may occasionally offer trials, discounted subscriptions, referral programs, promotional pricing, credits, or similar offers." },
      { type: "p", text: "Additional terms may apply to those promotions." },
      { type: "p", text: "Unless otherwise stated when you enroll, a free trial requiring a payment method may automatically convert into a paid subscription when the trial ends unless you cancel before the applicable deadline." },
      { type: "p", text: "Promotional offers may be changed, suspended, or discontinued by Moai subject to applicable law." },
    ],
  },
  {
    id: "intellectual-property",
    title: "12. Intellectual Property",
    blocks: [
      { type: "p", text: "Except for User Content and materials owned by third parties, Moai owns or licenses the Services and the materials that make them up, including:" },
      {
        type: "list",
        items: [
          "Software;",
          "Source and object code;",
          "Databases;",
          "Interfaces;",
          "Product functionality;",
          "Designs;",
          "Branding;",
          "Logos;",
          "Trademarks;",
          "Graphics;",
          "Workout presentation systems;",
          "Written content; and",
          "Other intellectual property.",
        ],
      },
      { type: "p", text: "Subject to these Terms, Moai grants you a limited, personal, revocable, non-exclusive, non-transferable, non-sublicensable license to access and use the Services for your personal, non-commercial use." },
      { type: "p", text: "You may not, except where applicable law expressly permits you to:" },
      {
        type: "list",
        items: [
          "Copy or redistribute the Services;",
          "Sell or commercially exploit the Services;",
          "Reverse engineer or attempt to derive the source code of the Services;",
          "Scrape or systematically extract data from the Services;",
          "Circumvent technological access controls;",
          "Reproduce Moai programming or content for commercial distribution;",
          "Use Moai branding without permission; or",
          "Build a competing product by copying protected portions of the Services.",
        ],
      },
      { type: "p", text: "Nothing in these Terms transfers ownership of Moai intellectual property to you." },
    ],
  },
  {
    id: "feedback",
    title: "13. Feedback",
    blocks: [
      { type: "p", text: "If you provide ideas, suggestions, recommendations, feature requests, or other feedback about Moai, you grant Moai the right to use that feedback without restriction or obligation to compensate you." },
      { type: "p", text: "This allows us to incorporate feedback into current or future products and Services." },
    ],
  },
  {
    id: "acceptable-use",
    title: "14. Acceptable Use",
    blocks: [
      { type: "p", text: "You may not:" },
      {
        type: "list",
        items: [
          "Use the Services for an unlawful purpose;",
          "Harass, threaten, abuse, exploit, or harm another person;",
          "Submit obscene, defamatory, fraudulent, discriminatory, or otherwise unlawful content;",
          "Impersonate another person;",
          "Provide intentionally false or misleading account information;",
          "Access another member’s account without permission;",
          "Attempt to interfere with or disrupt the Services;",
          "Attempt to gain unauthorized access to Moai systems, servers, accounts, or databases;",
          "Circumvent security or access-control measures;",
          "Introduce viruses, malware, malicious code, or other harmful technology;",
          "Scrape, crawl, harvest, or automatically extract information from the Services without permission;",
          "Use automated systems in a manner that places an unreasonable burden on the Services;",
          "Infringe another person’s intellectual property, privacy, publicity, or proprietary rights;",
          "Use another member’s fitness, health, profile, or personal information for unauthorized purposes;",
          "Solicit members for unauthorized commercial activities; or",
          "Use the Services in a manner that materially interferes with another member’s experience.",
        ],
      },
      { type: "p", text: "Moai may investigate suspected violations and may remove content, restrict functionality, suspend accounts, or terminate accounts where reasonably necessary." },
    ],
  },
  {
    id: "safety-conduct",
    title: "15. Safety and Member Conduct",
    blocks: [
      { type: "p", text: "You may interact with people you first encounter through Moai." },
      { type: "p", text: "Moai does not conduct a background check on every person using the Services unless expressly stated otherwise." },
      { type: "p", text: "You should use appropriate judgment when interacting with other members, including if you decide to communicate outside the Services or meet someone in person." },
      { type: "p", text: "Moai does not supervise or control private interactions or in-person meetings between members and is not responsible for injuries, losses, disputes, or other consequences arising from interactions between members except to the extent required by applicable law." },
    ],
  },
  {
    id: "beta",
    title: "16. Beta and Experimental Features",
    blocks: [
      { type: "p", text: "Moai may occasionally make experimental, preview, early-access, or beta features available." },
      { type: "p", text: "Such features may contain errors, change substantially, or stop operating without notice." },
      { type: "p", text: "Unless Moai expressly states otherwise, beta features are provided on an “as is” and “as available” basis and may be changed or discontinued at any time." },
    ],
  },
  {
    id: "privacy",
    title: "17. Privacy",
    blocks: [
      { type: "privacy", before: "Moai’s collection, use, disclosure, and protection of personal information is described in our ", after: " and any applicable Consumer Health Data Privacy Notice." },
      { type: "p", text: "Those policies form an important part of your relationship with Moai and should be reviewed before using the Services." },
      { type: "p", text: "Certain information shared within a Moai group is intentionally visible to other members of that group as part of the Services." },
      { type: "p", text: "Do not submit information through community features that you do not want the applicable participants to see." },
    ],
  },
  {
    id: "disclaimers",
    title: "18. Disclaimers",
    blocks: [
      { type: "strong", text: "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SERVICES ARE PROVIDED ON AN “AS IS” AND “AS AVAILABLE” BASIS." },
      { type: "strong", text: "MOAI AND ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, CONTRACTORS, COACHES, AGENTS, LICENSORS, AND SERVICE PROVIDERS DISCLAIM ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WARRANTIES OF:" },
      {
        type: "list",
        items: [
          "MERCHANTABILITY;",
          "FITNESS FOR A PARTICULAR PURPOSE;",
          "TITLE;",
          "NON-INFRINGEMENT;",
          "ACCURACY;",
          "COMPLETENESS;",
          "RELIABILITY;",
          "SECURITY;",
          "AVAILABILITY; AND",
          "FITNESS OR HEALTH OUTCOMES.",
        ],
      },
      { type: "strong", text: "MOAI DOES NOT WARRANT THAT:" },
      {
        type: "list",
        items: [
          "THE SERVICES WILL ALWAYS BE AVAILABLE OR ERROR-FREE;",
          "ANY PARTICULAR FITNESS RESULT WILL OCCUR;",
          "A WORKOUT OR PROGRAM WILL BE APPROPRIATE FOR EVERY USER;",
          "INFORMATION PROVIDED BY A COACH, MEMBER, AI SYSTEM, WEARABLE DEVICE, OR THIRD PARTY WILL BE ACCURATE;",
          "DEFECTS WILL ALWAYS BE CORRECTED; OR",
          "THE SERVICES WILL MEET YOUR PARTICULAR EXPECTATIONS.",
        ],
      },
      { type: "strong", text: "YOU USE THE SERVICES AND PARTICIPATE IN PHYSICAL ACTIVITY AT YOUR OWN RISK, SUBJECT TO RIGHTS THAT CANNOT LEGALLY BE WAIVED." },
    ],
  },
  {
    id: "limitation-of-liability",
    title: "19. Limitations of Liability",
    blocks: [
      { type: "strong", text: "TO THE MAXIMUM EXTENT PERMITTED BY LAW, MOAI AND ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, CONTRACTORS, COACHES, AGENTS, LICENSORS, PARTNERS, AND SERVICE PROVIDERS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES OR FOR LOSS OF PROFITS, REVENUE, GOODWILL, DATA, OR USE ARISING OUT OF OR RELATING TO THE SERVICES." },
      { type: "strong", text: "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, MOAI’S TOTAL AGGREGATE LIABILITY FOR CLAIMS ARISING OUT OF OR RELATING TO THE SERVICES OR THESE TERMS WILL NOT EXCEED THE GREATER OF:" },
      { type: "strong", text: "(A) US $100; OR" },
      { type: "strong", text: "(B) THE AMOUNT YOU PAID TO MOAI FOR THE SERVICES DURING THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM." },
      { type: "p", text: "Nothing in these Terms excludes liability that cannot lawfully be excluded or limited." },
    ],
  },
  {
    id: "indemnification",
    title: "20. Indemnification",
    blocks: [
      { type: "p", text: "To the extent permitted by applicable law, you agree to defend, indemnify, and hold harmless Moai, its affiliates, officers, directors, employees, contractors, coaches, agents, licensors, service providers, successors, and assigns from claims, liabilities, damages, judgments, losses, expenses, and reasonable attorneys’ fees arising from or relating to:" },
      {
        type: "list",
        items: [
          "Your violation of these Terms;",
          "Your unlawful or unauthorized use of the Services;",
          "Your User Content;",
          "Your violation of another person’s rights; or",
          "Your conduct toward another member or third party.",
        ],
      },
      { type: "p", text: "This provision survives termination of your account or these Terms." },
    ],
  },
  {
    id: "termination",
    title: "21. Account Suspension and Termination",
    blocks: [
      { type: "p", text: "You may stop using Moai at any time, subject to any subscription obligations described above." },
      { type: "p", text: "Moai may restrict, suspend, or terminate your account if we reasonably believe that you:" },
      {
        type: "list",
        items: [
          "Violated these Terms;",
          "Failed to make a required payment;",
          "Created a security or safety risk;",
          "Engaged in abusive or harmful behavior;",
          "Misused the Services;",
          "Provided fraudulent or materially misleading information; or",
          "Used the Services in a manner that could create liability for Moai or another person.",
        ],
      },
      { type: "p", text: "Where appropriate, Moai may take these actions without advance notice." },
      { type: "p", text: "Termination does not automatically entitle you to a refund except where required by law." },
    ],
  },
  {
    id: "changes-to-services",
    title: "22. Changes to the Services",
    blocks: [
      { type: "p", text: "Moai is an evolving product." },
      { type: "p", text: "We may add, modify, remove, suspend, or discontinue features or portions of the Services from time to time." },
      { type: "p", text: "We do not guarantee that a particular feature, workout, coach, program, community, integration, or functionality will remain available indefinitely." },
    ],
  },
  {
    id: "updates-to-terms",
    title: "23. Updates to These Terms",
    blocks: [
      { type: "p", text: "We may update these Terms periodically." },
      { type: "p", text: "If we make material changes, we will provide notice as required by applicable law, which may include notice within the Services, through email, or through another reasonable method." },
      { type: "p", text: "Updated Terms will become effective on the date specified in the notice." },
      { type: "p", text: "Your continued use of the Services after the updated Terms become effective constitutes acceptance of the revised Terms." },
      { type: "p", text: "If you do not agree to revised Terms, you should stop using the Services and cancel any applicable subscription before the new Terms become effective." },
    ],
  },
  {
    id: "disputes",
    title: "24. Resolving Disputes",
    blocks: [
      { type: "p", text: "We would prefer to resolve concerns directly." },
      { type: "email", before: "Before initiating formal legal proceedings, you agree to contact Moai at ", email: "legal@withmoai.co", after: " and provide a brief written description of the dispute." },
      { type: "p", text: "You and Moai agree to make a good-faith effort for at least thirty (30) days to resolve the matter informally." },
      { type: "h3", text: "Small Claims Court" },
      { type: "p", text: "If a dispute qualifies for small claims court under applicable jurisdictional requirements, either party may bring an individual claim in an appropriate small claims court." },
      { type: "h3", text: "Binding Individual Arbitration" },
      { type: "p", text: "Except for disputes eligible for small claims court and other claims that applicable law does not permit to be arbitrated, you and Moai agree that disputes arising from or relating to these Terms or the Services will be resolved through final and binding individual arbitration rather than in court." },
      { type: "p", text: "The arbitration will be administered by JAMS under its applicable Consumer Arbitration Rules." },
      { type: "strong", text: "YOU AND MOAI WAIVE THE RIGHT TO A JURY TRIAL." },
      { type: "strong", text: "YOU AND MOAI ALSO AGREE THAT CLAIMS MAY BE BROUGHT ONLY IN AN INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN A PURPORTED CLASS, COLLECTIVE, CONSOLIDATED, OR REPRESENTATIVE ACTION, TO THE EXTENT PERMITTED BY APPLICABLE LAW." },
      { type: "p", text: "The arbitration may occur in Los Angeles County, California, or remotely where permitted by the applicable arbitration rules or agreed by the parties." },
      { type: "p", text: "The arbitrator may award remedies available under applicable law." },
      { type: "p", text: "Nothing in this section prevents either party from seeking temporary or emergency injunctive relief from a court of competent jurisdiction when necessary to prevent imminent or irreparable harm." },
      { type: "p", text: "If a court determines that a particular class or representative claim cannot lawfully be subject to the class-action waiver above, that claim will be resolved in court rather than arbitration to the extent required by law." },
    ],
  },
  {
    id: "california-release",
    title: "25. California Release",
    blocks: [
      { type: "p", text: "To the extent permitted by applicable law, if you are a California resident and have a dispute involving another user or third party arising through the Services, you waive California Civil Code Section 1542 with respect to any release expressly provided under these Terms." },
      { type: "p", text: "Section 1542 currently provides:" },
      { type: "quote", text: "“A general release does not extend to claims that the creditor or releasing party does not know or suspect to exist in his or her favor at the time of executing the release and that, if known by him or her, would have materially affected his or her settlement with the debtor or released party.”" },
      { type: "p", text: "Nothing in this section waives rights that cannot legally be waived." },
    ],
  },
  {
    id: "general",
    title: "26. General Legal Terms",
    blocks: [
      { type: "p", text: "These Terms are governed by the laws of the State of California, without regard to conflict-of-law principles, except where applicable consumer law requires otherwise." },
      { type: "p", text: "To the extent a dispute is not subject to arbitration under these Terms, you and Moai consent to the jurisdiction of the state and federal courts located in Los Angeles County, California, except where applicable law gives you a non-waivable right to bring a claim elsewhere." },
      { type: "p", text: "If any provision of these Terms is determined to be invalid or unenforceable, it will be modified to the minimum extent necessary to make it enforceable or severed if modification is not possible. The remaining provisions will continue in effect." },
      { type: "p", text: "Moai’s failure to enforce a provision does not waive its right to enforce that provision later." },
      { type: "p", text: "Provisions that by their nature should survive termination—including intellectual property provisions, disclaimers, limitations of liability, indemnification, and dispute-resolution provisions—will survive." },
      { type: "p", text: "Moai may assign these Terms in connection with a merger, acquisition, financing, corporate reorganization, sale of assets, or otherwise as permitted by law." },
      { type: "p", text: "You may not assign your rights or obligations under these Terms without Moai’s prior written consent." },
      { type: "p", text: "These Terms, together with any policies or additional terms expressly incorporated into them, constitute the agreement between you and Moai regarding the Services." },
    ],
  },
  {
    id: "contact",
    title: "27. Contact Us",
    blocks: [
      { type: "p", text: "Questions about these Terms or the Services may be sent to:" },
      { type: "contact" },
      { type: "h3", text: "California Residents" },
      { type: "p", text: "If you are a California resident with an unresolved complaint concerning the Services, you may contact the Complaint Assistance Unit of the Division of Consumer Services of the California Department of Consumer Affairs in writing at:" },
      { type: "address" },
      { type: "p", text: "or by telephone at (800) 952-5210 or (916) 445-1254, as applicable under California law." },
    ],
  },
]

function renderBlock(block: Block, i: number) {
  switch (block.type) {
    case "p":
      return <p key={i} className="text-foreground">{block.text}</p>
    case "strong":
      return <p key={i} className="text-foreground font-semibold">{block.text}</p>
    case "quote":
      return (
        <blockquote key={i} className="border-l-4 border-border pl-4 italic text-muted-foreground">
          {block.text}
        </blockquote>
      )
    case "h3":
      return <h3 key={i} className="text-lg font-semibold mt-6">{block.text}</h3>
    case "list":
      return (
        <ul key={i} className="space-y-3 list-disc list-inside text-foreground">
          {block.items.map((item, j) => (
            <li key={j}>{item}</li>
          ))}
        </ul>
      )
    case "email":
      return (
        <p key={i} className="text-foreground">
          {block.before}
          <a href={`mailto:${block.email}`} className="text-primary hover:underline">
            {block.email}
          </a>
          {block.after}
        </p>
      )
    case "privacy":
      return (
        <p key={i} className="text-foreground">
          {block.before}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          {block.after}
        </p>
      )
    case "contact":
      return (
        <div key={i} className="space-y-2 text-foreground">
          <p><strong>Moai LLC</strong></p>
          <p>Los Angeles, California</p>
          <p>
            Email:{" "}
            <a href="mailto:legal@withmoai.co" className="text-primary hover:underline">
              legal@withmoai.co
            </a>
          </p>
          <p className="font-semibold mt-4">For customer support:</p>
          <p>
            Email:{" "}
            <a href="mailto:support@withmoai.co" className="text-primary hover:underline">
              support@withmoai.co
            </a>
          </p>
        </div>
      )
    case "address":
      return (
        <p key={i} className="text-foreground">
          1625 North Market Blvd., Suite N 112
          <br />
          Sacramento, CA 95834
        </p>
      )
  }
}

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
          <a href="mailto:legal@withmoai.co" className="text-primary hover:underline">
            legal@withmoai.co
          </a>
        </p>
      </div>

      <div className="prose prose-sm max-w-none dark:prose-invert">
        <p className="text-base leading-relaxed text-foreground">
          These Terms of Use (“Terms”) govern your access to and use of the websites, mobile applications, software,
          products, services, content, features, coaching experiences, community features, fitness programming, and
          other tools offered by Moai LLC (“Moai,” “we,” “us,” or “our”), collectively, the “Services.”
        </p>
        <p className="text-base leading-relaxed text-foreground">
          By accessing or using the Services, creating an account, or purchasing a subscription, you agree to these
          Terms. If you do not agree to these Terms, do not use the Services.
        </p>
        <p className="text-base leading-relaxed text-foreground font-semibold">
          IMPORTANT: These Terms include a binding arbitration agreement, a class action waiver, disclaimers relating to
          fitness and health activities, and limitations on Moai’s liability. These provisions affect your legal
          rights. Please review the Health and Fitness Disclaimer, Disclaimers, Limitations of Liability, and Resolving
          Disputes sections carefully.
        </p>
      </div>

      {sections.map((section) => (
        <section key={section.id} id={section.id} className="space-y-4">
          <h2 className="text-2xl font-bold">{section.title}</h2>
          {section.blocks.map(renderBlock)}
        </section>
      ))}
    </div>
  )
}
