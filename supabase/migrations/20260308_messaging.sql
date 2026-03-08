-- ============================================================
-- In-Platform Messaging: conversations + messages tables
-- Run in Supabase SQL Editor.
-- ============================================================

-- Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  participant_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,
  participant_a_last_read_at TIMESTAMPTZ DEFAULT NOW(),
  participant_b_last_read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, participant_a, participant_b),
  CHECK (participant_a < participant_b)
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS: conversations
-- ============================================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = participant_a OR auth.uid() = participant_b);

CREATE POLICY "Users insert own conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = participant_a OR auth.uid() = participant_b);

CREATE POLICY "Users update own conversations" ON public.conversations
  FOR UPDATE USING (auth.uid() = participant_a OR auth.uid() = participant_b);

-- ============================================================
-- RLS: messages
-- ============================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select messages in own conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (auth.uid() = c.participant_a OR auth.uid() = c.participant_b)
    )
  );

CREATE POLICY "Users insert messages in own conversations" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (auth.uid() = c.participant_a OR auth.uid() = c.participant_b)
    )
  );

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_conversations_participant_a ON public.conversations(participant_a);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_b ON public.conversations(participant_b);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at);
