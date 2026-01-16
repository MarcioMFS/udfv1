import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xfgsfmexaxmikkksndny.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ3NmbWV4YXhtaWtra3NuZG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY5NDQ4NiwiZXhwIjoyMDY1MjcwNDg2fQ.6_IPw8u2TN2HKg4J_roihlWIs3NlehYGgwWBmO-JJ2w';

async function addBonusMoneyColumn() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('🔧 Adicionando coluna bonus_money...\n');

  // Primeiro, verificar se a coluna já existe
  const { data: existingColumns, error: checkError } = await supabase
    .from('match_results')
    .select('bonus_money')
    .limit(1);

  if (!checkError) {
    console.log('✅ A coluna bonus_money já existe!');
    return;
  }

  if (checkError && !checkError.message.includes('column') && !checkError.message.includes('bonus_money')) {
    console.log('❌ Erro inesperado:', checkError);
    return;
  }

  console.log('Coluna não existe, criando...\n');
  console.log('');
  console.log('Por favor, execute o seguinte SQL no Supabase Dashboard:');
  console.log('https://supabase.com/dashboard/project/xfgsfmexaxmikkksndny/sql/new');
  console.log('');
  console.log('═'.repeat(80));
  console.log('ALTER TABLE public.match_results');
  console.log('ADD COLUMN IF NOT EXISTS bonus_money numeric DEFAULT 0;');
  console.log('═'.repeat(80));
  console.log('');
  console.log('Após executar o SQL, teste novamente.');
}

addBonusMoneyColumn().catch(console.error);
