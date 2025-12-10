"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export default function DeleteAccountPage() {
  const [formData, setFormData] = useState({
    email: "",
    reason: "",
    confirmDeletion: false,
  })
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSubmitted(true)
        setFormData({ email: "", reason: "", confirmDeletion: false })
      } else {
        alert("Failed to submit deletion request. Please try again.")
      }
    } catch (error) {
      console.error("Error submitting deletion request:", error)
      alert("An error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-foreground hover:text-primary transition-colors">
            Moai
          </Link>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-foreground hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="/delete" className="text-foreground font-semibold hover:text-primary transition-colors">
              Delete Account
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {submitted ? (
          <div className="space-y-8">
            <div className="flex gap-4">
              <CheckCircle2 size={32} className="text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Request Submitted</h1>
                <p className="text-lg text-muted-foreground">
                  Thank you for your account deletion request. We've received your submission and will process it within
                  7-10 business days.
                </p>
              </div>
            </div>

            <div className="bg-secondary p-6 rounded-lg space-y-3">
              <h2 className="font-semibold text-foreground">What happens next?</h2>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li>We'll send a confirmation email to verify your request</li>
                <li>Your account will be deactivated immediately</li>
                <li>All personal data will be deleted within 7-10 business days</li>
                <li>A confirmation email will be sent once deletion is complete</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <Link
                href="/"
                className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
              >
                Return to Home
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8 max-w-2xl">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-3">Delete Your Account</h1>
              <p className="text-lg text-muted-foreground">
                We're sorry to see you go. This action will permanently delete your account and all associated data from
                Moai.
              </p>
            </div>

            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 flex gap-4">
              <AlertCircle size={24} className="text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold text-destructive">This action is permanent</h3>
                <p className="text-sm text-foreground">
                  Once deleted, your account and all associated data cannot be recovered. Please make sure this is what
                  you want to do.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border rounded-lg p-8">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-2">
                  Email Address <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="your@email.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the email address associated with your Moai account
                </p>
              </div>

              <div>
                <label htmlFor="reason" className="block text-sm font-semibold text-foreground mb-2">
                  Reason for Deletion (Optional)
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="Help us improve by sharing feedback about your experience..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your feedback helps us understand how to better serve our community
                </p>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="confirmDeletion"
                  name="confirmDeletion"
                  checked={formData.confirmDeletion}
                  onChange={handleChange}
                  required
                  className="mt-1 w-4 h-4 cursor-pointer accent-destructive"
                />
                <label htmlFor="confirmDeletion" className="text-sm text-foreground cursor-pointer">
                  I understand that this action is permanent and all my data will be deleted. I confirm that I want to
                  proceed with deleting my account. <span className="text-destructive">*</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={!formData.confirmDeletion || isSubmitting}
                className="w-full bg-destructive text-destructive-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Delete My Account"}
              </button>

              <p className="text-xs text-muted-foreground text-center">
                After submission, you'll receive a confirmation email within 24 hours
              </p>
            </form>

            <div className="bg-secondary p-6 rounded-lg space-y-3">
              <h3 className="font-semibold text-foreground">Before you go:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                <li>Download your data by contacting support@moai.com</li>
                <li>Cancel any active subscriptions first</li>
                <li>Export any important fitness data or progress</li>
              </ul>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>
                Have questions?{" "}
                <a href="mailto:support@moai.com" className="text-primary hover:underline">
                  Contact our support team
                </a>
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
