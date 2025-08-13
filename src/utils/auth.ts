import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import * as vscode from 'vscode';
import { setAuth } from './aiApi'

export class Auth {
    private static session: Session | null = null;

    public static async initialize(context: vscode.ExtensionContext): Promise<void> {
        const refreshToken = await context.secrets.get('supabase.refreshToken');
        if (refreshToken) {
            const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
            if (data.session) {
                this.session = data.session;
                supabase.auth.setSession(data.session);
                context.secrets.store('supabase.refreshToken', data.session.refresh_token);
            } else if (error) {
                console.error('Failed to refresh session:', error);
            }
        }
    }

    public static async signIn(context: vscode.ExtensionContext, email: string, password: string): Promise<boolean> {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (data.session) {
            this.session = data.session;
            await context.secrets.store('supabase.refreshToken', data.session.refresh_token);
            setAuth(data.session.access_token)
            supabase.auth.setSession(data.session);
            return true;
        }
        if (error) {
            console.error('Failed to sign in:', error);
        }
        return false;
    }

    public static async signOut(context: vscode.ExtensionContext): Promise<void> {
        await supabase.auth.signOut();
        this.session = null;
        await context.secrets.delete('supabase.refreshToken');
    }

    public static getAccessToken(): string | null {
        return this.session?.access_token || null;
    }

    private static async getEmail(): Promise<string> {
        const machineId = await vscode.env.machineId;
        return `${machineId}@taraka.dev`;
    }
}