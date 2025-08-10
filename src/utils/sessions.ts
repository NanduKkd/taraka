import { supabase } from './supabase';
import { Tables, TablesInsert } from '../types/supabase';

export type Session = Tables<"sessions">;
export type Message = Tables<"messages">;

export async function listSessions(machineId: string, os: string, path: string): Promise<Session[]> {
  const { data, error } = await supabase.from('sessions').select().eq('machine_id', machineId).eq('os', os).eq('path', path);
  if (error) {
    console.error('Failed to list sessions:', error);
    return [];
  }
  return data || [];
}

export async function createSession(machineId: string, os: string, path: string): Promise<Session | null> {
  const { data, error } = await supabase.from('sessions').insert({ machine_id: machineId, os, path }).select();
  if (error) {
    console.error('Failed to create session:', error);
    return null;
  }
  return data?.[0] || null;
}

export async function getMessages(sessionId: number): Promise<Message[]> {
    const { data, error } = await supabase.from('messages').select().eq('session_id', sessionId);
    if (error) {
        console.error('Failed to get messages:', error);
        return [];
    }
    return data || [];
}

export async function addMessage(message: TablesInsert<"messages">): Promise<Message | null> {
    const { data, error } = await supabase.from('messages').insert(message).select();
    if (error) {
        console.error('Failed to add message:', error);
        return null;
    }
    return data?.[0] || null;
}