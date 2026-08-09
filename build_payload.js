const fs = require('fs');

const sql = fs.readFileSync('hasura/migrations/default/1699000000000_init/up.sql', 'utf8');
const payload = {
  type: 'run_sql',
  args: { source: 'default', sql, cascade: true }
};
fs.writeFileSync('payload.json', JSON.stringify(payload));
