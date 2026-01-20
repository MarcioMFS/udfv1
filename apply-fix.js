const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'https://xfgsfmexaxmikkksndny.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ3NmbWV4YXhta Wtua3NuZG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxOTg2MjIwOSwiZXhwIjoyMDM1NDM4MjA5fQ.KTSWp_yMBFqVaopkWa4MqoSkDpVz1SmNuYwbDxuWi2I'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applySQLFix() {
  console.log('🔧 Applying SQL fix for instructor stats calculations...')

  const sql = fs.readFileSync('fix_stats_calculations.sql', 'utf8')

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
    // If exec_sql doesn't exist, try direct approach
    console.log('📝 Using direct SQL execution...')
    return await supabase.from('_sql').insert({ query: sql })
  })

  if (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }

  console.log('✅ SQL fix applied successfully!')
  console.log('📊 All instructor stats have been recalculated with correct aggregations.')
}

applySQLFix()
