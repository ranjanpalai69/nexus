-- Fix self-referential RLS policies on conversation_participants and messages
-- These caused infinite recursion (PostgreSQL breaks the loop by returning FALSE)
-- making both tables appear empty to authenticated users.

-- Step 1: Create a SECURITY DEFINER helper function to check conversation participation
-- SECURITY DEFINER bypasses the caller's RLS, breaking the infinite recursion
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$;

-- Step 2: Fix conversation_participants SELECT policy (was self-referential)
DROP POLICY IF EXISTS "conv_participants_select" ON public.conversation_participants;
CREATE POLICY "conv_participants_select" ON public.conversation_participants
FOR SELECT USING (
  public.is_conversation_participant(conversation_id)
);

-- Step 3: Fix conversations SELECT policy (also relied on broken participant check)
DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
CREATE POLICY "conversations_select" ON public.conversations
FOR SELECT USING (
  public.is_conversation_participant(id)
);

-- Step 4: Fix messages SELECT policy (had bug: conversation_id = conversation_id is always true)
DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select" ON public.messages
FOR SELECT USING (
  public.is_conversation_participant(conversation_id)
);

-- Step 5: Also fix INSERT policy for messages if it references participants
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND public.is_conversation_participant(conversation_id)
);
