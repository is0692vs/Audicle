import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { validatePlaybackSpeed, validateVoiceModel, validateLanguage } from '@/lib/settingsValidator'
import { UpdateSettingsRequest, UpdateSettingsResponse, VOICE_MODELS_BY_LANGUAGE } from '@/types/settings'

export async function PUT(request: NextRequest) {
    try {
        // Verify authentication
        const session = await auth()

        if (!session || !session.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized', success: false },
                { status: 401 }
            )
        }

        const userEmail = session.user.email

        // Parse request body
        const body: UpdateSettingsRequest = await request.json()

        // Validate input
        const { playback_speed, voice_model, language } = body

        if (playback_speed !== undefined && !validatePlaybackSpeed(playback_speed)) {
            return NextResponse.json(
                {
                    error: 'Invalid playback_speed. Must be between 0.5 and 3.0',
                    success: false,
                },
                { status: 400 }
            )
        }

        if (voice_model !== undefined && !validateVoiceModel(voice_model)) {
            const allModels = Object.values(VOICE_MODELS_BY_LANGUAGE).flat().map(item => item.value);
            return NextResponse.json(
                {
                    error: `Invalid voice_model. Must be one of: ${allModels.join(', ')}`,
                    success: false,
                },
                { status: 400 }
            )
        }

        if (language !== undefined && !validateLanguage(language)) {
            return NextResponse.json(
                {
                    error: 'Invalid language. Must be ja-JP or en-US',
                    success: false,
                },
                { status: 400 }
            )
        }

        // Prepare update object
        const updateData: Record<string, unknown> = { user_email: userEmail }
        if (playback_speed !== undefined) updateData.playback_speed = playback_speed
        if (voice_model !== undefined) updateData.voice_model = voice_model
        if (language !== undefined) updateData.language = language

        // UPSERT to user_settings table
        const { data, error } = await supabase
            .from('user_settings')
            .upsert(updateData, { onConflict: 'user_email' })
            .select()
            .single()

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json(
                { error: 'Failed to update settings', success: false },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Settings updated successfully',
            data,
        } as UpdateSettingsResponse & { data: unknown })
    } catch (error) {
        console.error('Error in PUT /api/settings/update:', error)
        return NextResponse.json(
            { error: 'Internal server error', success: false },
            { status: 500 }
        )
    }
}
