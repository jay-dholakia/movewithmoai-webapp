'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

type FAQItem = {
  question: string
  answer: string
}

const faqData: FAQItem[] = [
  {
    question: "Do I need a coach to use Moai?",
    answer: "No, you can use Moai independently with structured workout plans. However, connecting with a certified coach provides personalized guidance, program adjustments, and expert support. Many users find that coach support accelerates their progress and keeps them accountable."
  },
  {
    question: "What is a Moai group?",
    answer: "A Moai is a small accountability group where members support each other in their fitness journeys. You set weekly workout commitments, track progress together, and celebrate achievements. The community aspect helps maintain motivation and consistency, making it easier to stick to your fitness goals."
  },
  {
    question: "How much does Moai cost?",
    answer: "Moai is free to use. Adding a certified coach to your Moai for added structure, support, and accountability costs $199/month per Moai. You can use Moai without a coach and still access all core features including workout plans, Village, and Moai groups."
  },
  {
    question: "Is Moai suitable for beginners?",
    answer: "Yes! Moai is designed for people at all fitness levels, from complete beginners to experienced athletes. The app provides workout plans tailored to your experience level, and coaches can help you learn proper form and progress safely. The community support makes it welcoming for newcomers."
  },
  {
    question: "What equipment do I need?",
    answer: "Moai offers workout plans for various fitness levels and equipment availability. You'll find programs that require minimal or no equipment, as well as plans designed for gym-goers with full access to equipment. When setting up your profile, you can specify what equipment you have available."
  },
  {
    question: "Can I use Moai if I have injuries or limitations?",
    answer: "Yes, Moai coaches are trained to work with various fitness levels and limitations. When you connect with a coach, be sure to discuss any injuries, health conditions, or physical limitations. Coaches can modify exercises and create safe, effective programs tailored to your needs. Always consult with a healthcare provider before starting a new fitness program."
  },
  {
    question: "How do I track my progress?",
    answer: "Moai provides comprehensive tracking features including workout completion, personal records, weekly commitments, and progress over time. You can see your consistency metrics, completed workouts, and improvement in various exercises. Your Moai group can also see your progress (as you choose to share), creating accountability and motivation."
  },
  {
    question: "Is my data private and secure?",
    answer: "Yes, we take your privacy and data security seriously. Moai follows industry-standard security practices to protect your information. You control what data is shared within your Moai groups. For more details, please review our Privacy Policy linked in the footer."
  }
]

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section
      id="faq"
      className="max-w-4xl mx-auto px-6 py-20 md:py-32"
      aria-labelledby="faq-heading"
    >
      <div className="text-center mb-16">
        <h2
          id="faq-heading"
          className="text-4xl md:text-5xl font-bold text-foreground mb-6"
        >
          Frequently Asked Questions
        </h2>
        <p className="text-lg md:text-xl text-gray-700 max-w-2xl mx-auto">
          Everything you need to know about Moai and how it can help you reach your fitness goals.
        </p>
      </div>

      <div className="space-y-4">
        {faqData.map((item, index) => (
          <div
            key={index}
            className="bg-card border border-border rounded-xl shadow-crisp overflow-hidden transition-all duration-200 hover:shadow-crisp-lg"
          >
            <button
              onClick={() => toggleItem(index)}
              className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
              aria-expanded={openIndex === index}
              aria-controls={`faq-answer-${index}`}
            >
              <h3 className="text-lg md:text-xl font-semibold text-foreground pr-8">
                {item.question}
              </h3>
              <div className="flex-shrink-0">
                {openIndex === index ? (
                  <ChevronUp className="w-5 h-5 text-primary" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                )}
              </div>
            </button>
            {openIndex === index && (
              <div
                id={`faq-answer-${index}`}
                className="px-6 pb-5 text-gray-700 leading-relaxed"
              >
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
