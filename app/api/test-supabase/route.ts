import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('[test-supabase] Starting test...');
    console.log('[test-supabase] SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING');
    console.log('[test-supabase] SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? `${supabaseServiceRoleKey.substring(0, 20)}...` : 'MISSING');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Missing environment variables',
          missing: {
            url: !supabaseUrl,
            key: !supabaseServiceRoleKey
          }
        }
      }, { status: 500 });
    }
    
    // Create client directly here
    const testClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    console.log('[test-supabase] Client created, testing query...');
    
    // Test basic connection with a simple query
    const { data, error } = await testClient
      .from('playlists')
      .select('id')
      .limit(1);
    
    console.log('[test-supabase] Query completed');
    console.log('[test-supabase] Data:', data);
    console.log('[test-supabase] Error:', error);
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: {
          message: error.message,
          code: error.code,
          hint: error.hint,
          details: error.details
        }
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data,
      message: 'Supabase connection successful'
    });
  } catch (err) {
    console.error('[test-supabase] Exception:', err);
    const errorObj = err instanceof Error ? {
      message: err.message,
      name: err.name,
      stack: err.stack
    } : {
      message: String(err),
      type: typeof err
    };
    
    return NextResponse.json({
      success: false,
      error: errorObj
    }, { status: 500 });
  }
}

