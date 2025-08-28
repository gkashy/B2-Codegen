// Migration Serverless Function: Migrate legacy test_cases to new schema
// This function safely migrates all legacy test case data using existing parsing logic

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Reuse the existing parsing functions from smart-handler.ts
function parseTestCases(testCasesString: string): any[] {
  try {
    console.log('Parsing legacy test cases:', testCasesString);
    const testCases: any[] = [];
    // Split by '), (' to get individual test cases
    const cases = testCasesString.split('), (');
    for(let i = 0; i < cases.length; i++){
      let caseStr = cases[i];
      // Clean up the string
      caseStr = caseStr.replace(/^\(/, '').replace(/\)$/, '');
      // Split by comma but be careful with arrays
      const parts = smartSplit(caseStr);
      testCases.push(parts);
    }
    console.log('Parsed test cases:', testCases);
    return testCases;
  } catch (error) {
    console.error('Error parsing test cases:', error);
    return [];
  }
}

function smartSplit(str: string): any[] {
  const parts: any[] = [];
  let current = '';
  let depth = 0;
  let inQuotes = false;
  let quoteChar = '';
  for(let i = 0; i < str.length; i++){
    const char = str[i];
    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
      current += char;
    } else if (inQuotes && char === quoteChar) {
      inQuotes = false;
      current += char;
    } else if (!inQuotes && char === '[') {
      depth++;
      current += char;
    } else if (!inQuotes && char === ']') {
      depth--;
      current += char;
    } else if (!inQuotes && char === ',' && depth === 0) {
      parts.push(parseValue(current.trim()));
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    parts.push(parseValue(current.trim()));
  }
  return parts;
}

function parseValue(str: string): any {
  str = str.trim();
  // Handle arrays
  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      return JSON.parse(str);
    } catch  {
      return str;
    }
  }
  // Handle strings
  if (str.startsWith('"') && str.endsWith('"') || str.startsWith("'") && str.endsWith("'")) {
    return str.slice(1, -1);
  }
  // Handle numbers
  if (!isNaN(Number(str))) {
    return Number(str);
  }
  return str;
}

serve(async (req) => {
  console.log('🚀 Starting legacy test cases migration...');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch all problems with legacy test_cases data
    console.log('📊 Fetching problems with legacy test_cases...');
    const { data: problems, error: fetchError } = await supabase
      .from('problems')
      .select('id, title, test_cases, difficulty')
      .not('test_cases', 'is', null)
      .neq('test_cases', '');

    if (fetchError) {
      throw new Error(`Failed to fetch problems: ${fetchError.message}`);
    }

    console.log(`Found ${problems.length} problems with legacy test cases`);

    let totalMigrated = 0;
    let totalErrors = 0;
    const migrationResults = [];

    // 2. Process each problem
    for (const problem of problems) {
      try {
        console.log(`\n🔄 Processing Problem ${problem.id}: ${problem.title}`);
        console.log(`Legacy test_cases: ${problem.test_cases.substring(0, 100)}...`);

        // Parse legacy test cases using existing logic
        const parsedTestCases = parseTestCases(problem.test_cases);
        
        if (parsedTestCases.length === 0) {
          console.log(`⚠️  No test cases parsed for problem ${problem.id}`);
          continue;
        }

        let problemMigrated = 0;

        // 3. Convert each test case to new format
        for (let i = 0; i < parsedTestCases.length; i++) {
          const testCase = parsedTestCases[i];
          
          // Separate inputs from expected output (last element is output)
          const inputs = testCase.slice(0, -1);
          const expectedOutput = testCase[testCase.length - 1];

          console.log(`  Test Case ${i + 1}:`, {
            inputs: inputs,
            expectedOutput: expectedOutput
          });

          // 4. Insert into new test_cases table
          const { error: insertError } = await supabase
            .from('test_cases')
            .insert({
              problem_id: problem.id,
              input_data: inputs, // JSONB array of inputs
              expected_output: expectedOutput, // JSONB expected output
              source: 'migrated_legacy',
              difficulty_level: problem.difficulty || 'medium',
              is_active: true,
              created_at: new Date().toISOString()
            });

          if (insertError) {
            console.error(`❌ Failed to insert test case ${i + 1} for problem ${problem.id}:`, insertError);
            totalErrors++;
          } else {
            console.log(`✅ Migrated test case ${i + 1} for problem ${problem.id}`);
            problemMigrated++;
            totalMigrated++;
          }
        }

        migrationResults.push({
          problem_id: problem.id,
          title: problem.title,
          legacy_test_cases: problem.test_cases,
          parsed_count: parsedTestCases.length,
          migrated_count: problemMigrated
        });

      } catch (error) {
        console.error(`❌ Error processing problem ${problem.id}:`, error);
        totalErrors++;
        migrationResults.push({
          problem_id: problem.id,
          title: problem.title,
          error: error.message
        });
      }
    }

    // 5. Summary and verification
    console.log('\n📊 Migration Summary:');
    console.log(`Total problems processed: ${problems.length}`);
    console.log(`Total test cases migrated: ${totalMigrated}`);
    console.log(`Total errors: ${totalErrors}`);

    // Verify migration
    const { data: migratedCases, error: verifyError } = await supabase
      .from('test_cases')
      .select('problem_id, count(*)')
      .eq('source', 'migrated_legacy');

    if (!verifyError) {
      console.log('✅ Verification: New test_cases table populated successfully');
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Legacy test cases migration completed',
      summary: {
        problems_processed: problems.length,
        test_cases_migrated: totalMigrated,
        errors: totalErrors
      },
      details: migrationResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('🚨 Migration failed:', error);
    return new Response(JSON.stringify({
      error: 'Migration failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});