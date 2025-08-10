import { Session } from '../types/common';
import { supabase } from './supabase';

export async function listSessions(machineId: string, os: string, path: string): Promise<Session[]> {
  await supabase.from('sessions').select().eq('machine_id', machineId);
  return []
}
