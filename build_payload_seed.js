const fs = require('fs');

const sql = fs.readFileSync('hasura/seeds/default/1_demo_data.sql', 'utf8');
const payload = {
  type: 'run_sql',
  args: { source: 'default', sql, cascade: true }
};
fs.writeFileSync('payload_seed.json', JSON.stringify(payload));
