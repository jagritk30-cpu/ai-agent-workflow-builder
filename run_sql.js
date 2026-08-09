const fs = require('fs');

const url = 'https://hxtovivmtglemldjqjex.hasura.ap-south-1.nhost.run/v2/query';
const adminSecret = '5f!DhJkl&uyEY)!!4Z1$2Y=+LNzExRD9';

async function runSql(file) {
  const sql = fs.readFileSync(file, 'utf8');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hasura-Admin-Secret': adminSecret
    },
    body: JSON.stringify({
      type: 'run_sql',
      args: { source: 'default', sql, cascade: true }
    })
  });
  
  const text = await res.text();
  console.log(`Result for ${file}:`, res.status, text);
}

async function main() {
  await runSql('hasura/migrations/default/1699000000000_init/up.sql');
  await runSql('hasura/seeds/default/1_demo_data.sql');
}

main().catch(console.error);
