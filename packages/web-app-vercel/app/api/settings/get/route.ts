import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { DEFAULT_SETTINGS, UserSettingsResponse } from '@/types/settings'

export async function GET(request: NextRequest) {
    try {
        // Verify authentication
        const session = await auth()

        if (!session || !session.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const userEmail = session.user.email

        // Fetch user settings from Supabase
        const { data, error } = await supabase
            .from('user_settings')
            .select('playback_speed, voice_model, created_at, updated_at')
            .eq('user_email', userEmail)
            .single()

        // If no settings exist, return defaults
        if (error && error.code === 'PGRST116') {
            return NextResponse.json({
                ...DEFAULT_SETTINGS,
                created_at: null,
                updated_at: null,
            } as UserSettingsResponse)
        }

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json(
                { error: 'Failed to fetch settings' },
                { status: 500 }
            )
        }

        return NextResponse.json(data as UserSettingsResponse)
    } catch (error) {
        console.error('Error in GET /api/settings/get:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
