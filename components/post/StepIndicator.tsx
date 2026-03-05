'use client'

import { CheckCircle } from 'lucide-react'

interface StepIndicatorProps {
  currentStep: number
  steps: string[]
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-2xl mx-auto">
      {steps.map((label, i) => {
        const stepNum = i + 1
        const isComplete = stepNum < currentStep
        const isCurrent = stepNum === currentStep
        const isLast = i === steps.length - 1

        return (
          <div key={label} className="flex items-center flex-1 last:flex-initial">
            {/* Circle */}
            <div className="flex flex-col items-center">
              <div
                className={[
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                  isComplete
                    ? 'bg-primary-600 text-white'
                    : isCurrent
                      ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                      : 'bg-gray-200 text-gray-500',
                ].join(' ')}
              >
                {isComplete ? <CheckCircle className="w-5 h-5" /> : stepNum}
              </div>
              <span
                className={[
                  'text-xs mt-1.5 whitespace-nowrap',
                  isCurrent ? 'text-primary-600 font-semibold' : 'text-gray-500',
                ].join(' ')}
              >
                {label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={[
                  'flex-1 h-0.5 mx-2 mt-[-1.25rem]',
                  isComplete ? 'bg-primary-600' : 'bg-gray-200',
                ].join(' ')}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
