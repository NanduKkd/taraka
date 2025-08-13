import dotenv from 'dotenv';
import path from 'path'
dotenv.config({path: path.join(__dirname, '..', '.env')});

export const SUPABASE_URL = process.env.SUPABASE_URL!;
export const SUPABASE_ANON_API_KEY = process.env.SUPABASE_ANON_KEY!;