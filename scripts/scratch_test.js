const path = require('path');
require('ts-node').register();
const { deepResearch } = require('../lib/you.ts');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env.local');
process.env.YOU_API_KEY = fs.readFileSync(envPath, 'utf8').match(/YOU_API_KEY=(.+)/)[1].trim();

deepResearch(
  'Extract JSON from this text: "bikin acara IT besok". Return ONLY valid JSON with { "name": string, "type": string, "date": string }',
  'lite'
)
  .then((res) => console.log(JSON.stringify(res)))
  .catch(console.error);
