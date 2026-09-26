"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

export default function TableOfContents() {
  const [activeSection, setActiveSection] = useState("")

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll("section[id]")
      const scrollPosition = window.scrollY + 100

      sections.forEach((section) => {
        const top = (section as HTMLElement).offsetTop
        const height = (section as HTMLElement).offsetHeight
        if (scrollPosition >= top && scrollPosition < top + height) {
          setActiveSection(section.id)
        }
      })
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const sections = [
    { id: "what-moai-is", label: "1. What Moai Is — and What It Isn't" },
    { id: "assumption-of-risk", label: "2. Assumption of Risk" },
    { id: "who-can-use", label: "3. Who Can Use Moai" },
    { id: "coaches", label: "4. Coaches and Coaching Services" },
    { id: "community", label: "5. Community and Group Features" },
    { id: "your-content", label: "6. Your Content" },
    { id: "fitness-health-info", label: "7. Fitness and Health Information" },
    { id: "third-party", label: "8. Wearables and Third-Party Integrations" },
    { id: "ai-features", label: "9. AI-Powered Features" },
    { id: "payments", label: "10. Payments, Subscriptions, and Cancellation" },
    { id: "free-trials", label: "11. Free Trials and Promotions" },
    { id: "intellectual-property", label: "12. Intellectual Property" },
    { id: "feedback", label: "13. Feedback" },
    { id: "acceptable-use", label: "14. Acceptable Use" },
    { id: "safety-conduct", label: "15. Safety and Member Conduct" },
    { id: "beta", label: "16. Beta and Experimental Features" },
    { id: "privacy", label: "17. Privacy" },
    { id: "disclaimers", label: "18. Disclaimers" },
    { id: "limitation-of-liability", label: "19. Limitations of Liability" },
    { id: "indemnification", label: "20. Indemnification" },
    { id: "termination", label: "21. Account Suspension and Termination" },
    { id: "changes-to-services", label: "22. Changes to the Services" },
    { id: "updates-to-terms", label: "23. Updates to These Terms" },
    { id: "disputes", label: "24. Resolving Disputes" },
    { id: "california-release", label: "25. California Release" },
    { id: "general", label: "26. General Legal Terms" },
    { id: "contact", label: "27. Contact Us" },
  ]

  return (
    <nav className="space-y-1">
      <h3 className="font-semibold text-foreground text-sm mb-4">Contents</h3>
      {sections.map((section) => (
        <Link
          key={section.id}
          href={`#${section.id}`}
          className={`block text-sm px-3 py-2 rounded transition-colors ${
            activeSection === section.id
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  )
}
