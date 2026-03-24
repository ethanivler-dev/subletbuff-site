'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MessageCircle, ArrowRight, Search, Inbox } from 'lucide-react'
import { timeAgo } from '@/lib/utils'

interface ConversationItem {
  id: string
  listing_id: string
  listing_title: string
  listing_photo: string | null
  listing_price: number | null
  other_user_id: string
  other_user_name: string
  last_message_preview: string | null
  last_message_at: string
  unread: boolean
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

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

  const filtered = searchQuery.trim()
    ? conversations.filter(
        (c) =>
          c.listing_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.other_user_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <h1 className="font-serif text-3xl text-gray-900 mb-6">Messages</h1>
          <div className="space-y-px bg-white rounded-card border border-gray-200 overflow-hidden shadow-card">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2.5 py-0.5">
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-gray-100 rounded w-2/5" />
                      <div className="h-3 bg-gray-100 rounded w-12" />
                    </div>
                    <div className="h-3 bg-gray-50 rounded w-1/4" />
                    <div className="h-3.5 bg-gray-50 rounded w-3/4" />
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
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-serif text-3xl text-gray-900">Messages</h1>
          {conversations.length > 0 && (
            <span className="text-sm text-gray-400">
              {conversations.filter((c) => c.unread).length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-primary-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-primary-500" />
                  {conversations.filter((c) => c.unread).length} unread
                </span>
              )}
            </span>
          )}
        </div>

        {/* Search — only show when there are conversations */}
        {conversations.length > 3 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-card border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400 transition-all"
            />
          </div>
        )}

        {conversations.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-card border border-gray-100 p-16 text-center shadow-card">
            <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-primary-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h2>
            <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
              When you contact a lister or someone messages you about a listing, your conversations will appear here.
            </p>
            <Link
              href="/listings"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-button transition-colors shadow-sm"
            >
              Browse Listings <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          /* No search results */
          <div className="bg-white rounded-card border border-gray-100 p-12 text-center shadow-card">
            <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <h2 className="text-base font-semibold text-gray-900 mb-1">No results</h2>
            <p className="text-sm text-gray-500">
              No conversations match &ldquo;{searchQuery}&rdquo;
            </p>
          </div>
        ) : (
          /* Conversation list */
          <div className="bg-white rounded-card border border-gray-200 overflow-hidden shadow-card divide-y divide-gray-100">
            {filtered.map((convo) => (
              <Link
                key={convo.id}
                href={`/messages/${convo.id}`}
                className={`flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 transition-colors duration-150 ${
                  convo.unread ? 'bg-primary-50/40' : ''
                }`}
              >
                {/* Listing photo */}
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 ring-1 ring-gray-200/60">
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
                  {/* Row 1: listing title + timestamp */}
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={`text-sm truncate ${
                        convo.unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                      }`}
                    >
                      {convo.listing_title}
                    </h3>
                    <span
                      className={`text-xs whitespace-nowrap flex-shrink-0 ${
                        convo.unread ? 'text-primary-600 font-medium' : 'text-gray-400'
                      }`}
                    >
                      {timeAgo(convo.last_message_at)}
                    </span>
                  </div>

                  {/* Row 2: other user + price */}
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {convo.other_user_name}
                    {convo.listing_price ? ` \u00b7 $${convo.listing_price.toLocaleString()}/mo` : ''}
                  </p>

                  {/* Row 3: message preview + unread dot */}
                  <div className="flex items-center gap-2 mt-0.5">
                    <p
                      className={`text-sm truncate flex-1 ${
                        convo.unread ? 'font-medium text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      {convo.last_message_preview ?? 'No messages yet'}
                    </p>
                    {convo.unread && (
                      <span className="w-2.5 h-2.5 rounded-full bg-primary-500 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
