require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('Starting migration...');
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  
  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('Reading migration script...');
    const sqlScript = fs.readFileSync(path.join(__dirname, 'scripts', '023-fix-loyalty-schema-issues.sql'), 'utf8');
    
    console.log('Executing migration...');
    // Split the SQL script by semicolons and execute each statement
    const statements = sqlScript.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 100) + '...');
        await sql.query(statement.trim());
      }
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Test the loyalty query after migration
    console.log('\nTesting existing tenants and loyalty data...');
    
    // First, check what tenants exist
    const tenants = await sql`SELECT tenant_id FROM customers GROUP BY tenant_id LIMIT 5`;
    console.log('Available tenant IDs:', tenants);
    
    // Check current loyalty transactions
    const loyaltyCheck = await sql`
      SELECT 
        customer_id,
        tenant_id,
        transaction_type,
        points
      FROM loyalty_transactions
      LIMIT 5
    `;
    console.log('Sample loyalty transactions:', loyaltyCheck);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

runMigration().catch(console.error);