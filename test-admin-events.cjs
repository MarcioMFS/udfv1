const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://xfgsfmexaxmikkksndny.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ3NmbWV4YXhta2lra3NuZG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxOTg2MjIwOSwiZXhwIjoyMDM1NDM4MjA5fQ.KTSWp_yMBFqVaopkWa4MqoSkDpVz1SmNuYwbDxuWi2I'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testQuery() {
  console.log('🔍 Testing events query...')

  // Test 1: Simple query
  console.log('\n📊 Test 1: Simple events query')
  const { data: simpleEvents, error: simpleError } = await supabase
    .from('events')
    .select('*')
    .limit(5)

  console.log('Simple query:', { count: simpleEvents?.length, error: simpleError })
  if (simpleEvents?.[0]) {
    console.log('Sample event:', {
      id: simpleEvents[0].id,
      name: simpleEvents[0].name,
      start_date: simpleEvents[0].start_date,
      instructor_id: simpleEvents[0].instructor_id,
      class_id: simpleEvents[0].class_id
    })
  }

  // Test 2: With JOINs
  console.log('\n📊 Test 2: Events with JOINs')
  const { data: joinEvents, error: joinError } = await supabase
    .from('events')
    .select(`
      *,
      instructors!instructor_id(id, name, email),
      classes!class_id(id, name)
    `)
    .limit(5)

  console.log('JOIN query:', { count: joinEvents?.length, error: joinError })
  if (joinError) {
    console.error('JOIN error details:', JSON.stringify(joinError, null, 2))
  }
  if (joinEvents?.[0]) {
    console.log('Sample with JOINs:', {
      id: joinEvents[0].id,
      name: joinEvents[0].name,
      instructors: joinEvents[0].instructors,
      classes: joinEvents[0].classes
    })
  }

  // Test 3: Call edge function
  console.log('\n📊 Test 3: Call edge function')
  const { data: funcData, error: funcError } = await supabase.functions.invoke('admin-event-management', {
    body: {
      operation: 'list_all_events'
    }
  })

  console.log('Edge function result:', {
    success: funcData?.success,
    count: funcData?.data?.length,
    error: funcError || funcData?.error
  })

  if (funcData?.data?.[0]) {
    console.log('Sample from function:', {
      id: funcData.data[0].id,
      title: funcData.data[0].title,
      date: funcData.data[0].date,
      instructor: funcData.data[0].instructor
    })
  }
}

testQuery().catch(console.error)
