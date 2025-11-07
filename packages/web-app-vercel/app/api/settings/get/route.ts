import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { DEFAULT_SETTINGS, UserSettingsResponse } from '@/types/settings'

export async function GET() {
    try {
        // Verify authentication
        const session = await auth()

        if (!session || !session.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const userId = session.user.id

        // Fetch user settings from Supabase
        const { data, error } = await supabase
            .from('user_settings')
            .select('playback_speed, voice_model, language, created_at, updated_at')
            .eq('user_id', userId)
            .single()

        // If no settings exist, return defaults
        if (error && error.code === 'PGRST116') {
            return NextResponse.json({
                ...DEFAULT_SETTINGS,
                created_at: undefined,
                updated_at: undefined,
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
