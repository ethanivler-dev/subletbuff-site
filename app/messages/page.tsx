'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MessageCircle, ArrowRight } from 'lucide-react'
import { timeAgo } from '@/lib/utils'

interface ConversationItem {
  id: string
  listing_id: string
  listing_title: string
  listing_photo: string | null
  other_user_id: string
  other_user_name: string
  last_message_preview: string | null
  last_message_at: string
  unread: boolean
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch_conversations() {
      const res = await fetch('/api/messages/conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations)
      }
      setLoading(false)
    }
    fetch_conversations()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <h1 className="font-serif text-3xl text-gray-900 mb-6">Messages</h1>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-card border border-gray-100 p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <h1 className="font-serif text-3xl text-gray-900 mb-6">Messages</h1>

        {conversations.length === 0 ? (
          <div className="bg-white rounded-card border border-gray-100 p-12 text-center">
            <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-900 mb-1">No messages yet</h2>
            <p className="text-sm text-gray-500 mb-4">
              Browse listings to get started.
            </p>
            <Link
              href="/listings"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              Browse Listings <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((convo) => (
              <Link
                key={convo.id}
                href={`/messages/${convo.id}`}
                className="flex items-center gap-3 bg-white rounded-card border border-gray-100 p-4 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Listing photo */}
                <div className="relative w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                  {convo.listing_photo ? (
                    <Image src={convo.listing_photo} alt="" fill className="object-cover" sizes="48px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-sm truncate ${convo.unread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {convo.other_user_name}
                    </h3>
                    <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                      {timeAgo(convo.last_message_at)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{convo.listing_title}</p>
                  <p className={`text-sm truncate mt-0.5 ${convo.unread ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                    {convo.last_message_preview ?? 'No messages yet'}
                  </p>
                </div>

                {/* Unread indicator */}
                {convo.unread && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary-500 flex-shrink-0" />
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
