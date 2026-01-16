const SUPABASE_URL = 'https://xfgsfmexaxmikkksndny.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ3NmbWV4YXhtaWtra3NuZG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY5NDQ4NiwiZXhwIjoyMDY1MjcwNDg2fQ.6_IPw8u2TN2HKg4J_roihlWIs3NlehYGgwWBmO-JJ2w';

async function fetchAppSerial() {
  const matchRes = await fetch(`${SUPABASE_URL}/rest/v1/matches?id=eq.06c798d1-3b45-4e9e-9598-360a0e439183&select=app_serial`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });

  const match = await matchRes.json();
  console.log('🔍 App Serial completo:');
  console.log(JSON.stringify(match, null, 2));

  if (match[0]?.app_serial) {
    console.log('');
    console.log('📏 Tamanho:', match[0].app_serial.length, 'caracteres');
    console.log('');
    console.log('Partes separadas por #:');
    const parts = match[0].app_serial.split('#');
    parts.forEach((part, i) => {
      console.log(`Parte ${i}: ${part}`);
    });
  }
}

fetchAppSerial().catch(console.error);
