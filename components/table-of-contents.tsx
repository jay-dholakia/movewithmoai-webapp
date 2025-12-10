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
    { id: "eligibility", label: "1. Eligibility" },
    { id: "account-registration", label: "2. Account Registration and Security" },
    { id: "health-safety", label: "3. Health & Safety Notice" },
    { id: "coaching", label: "4. Coaching, Programs & Recommendations" },
    { id: "payments", label: "5. Payments, Subscriptions & Billing" },
    { id: "community-standards", label: "6. Community Standards" },
    { id: "user-content", label: "7. User Content & License" },
    { id: "privacy", label: "8. Privacy & Data Practices" },
    { id: "acceptable-use", label: "9. Acceptable Use" },
    { id: "ownership", label: "10. Ownership & Intellectual Property" },
    { id: "changes-to-services", label: "11. Changes to the Services" },
    { id: "termination", label: "12. Termination" },
    { id: "disclaimers", label: "13. Disclaimers" },
    { id: "limitation-of-liability", label: "14. Limitation of Liability" },
    { id: "indemnification", label: "15. Indemnification" },
    { id: "governing-law", label: "16. Governing Law & Dispute Resolution" },
    { id: "contact", label: "17. Contact" },
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
