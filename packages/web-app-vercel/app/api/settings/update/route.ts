import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { validatePlaybackSpeed, validateVoiceModel } from '@/lib/settingsValidator'
import { UpdateSettingsRequest, UpdateSettingsResponse } from '@/types/settings'

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
        const { playback_speed, voice_model } = body

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
            return NextResponse.json(
                {
                    error: 'Invalid voice_model. Must be one of: ja-JP-Wavenet-A, ja-JP-Wavenet-B, ja-JP-Wavenet-C, ja-JP-Wavenet-D',
                    success: false,
                },
                { status: 400 }
            )
        }

        // Prepare update object
        const updateData: Record<string, unknown> = { user_email: userEmail }
        if (playback_speed !== undefined) updateData.playback_speed = playback_speed
        if (voice_model !== undefined) updateData.voice_model = voice_model

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
