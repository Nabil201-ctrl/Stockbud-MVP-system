const fs = require('fs');
const file = './src/social-stores/social-stores.service.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/let stats = store\.dailyStats \|\| \[\];/g, 'let stats: any[] = Array.isArray(store.dailyStats) ? store.dailyStats : [];');
content = content.replace(/const dayData = \(store\.dailyStats \|\| \[\]\)\.find/g, 'const dayData = (Array.isArray(store.dailyStats) ? store.dailyStats as any[] : []).find');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed stats types in social-stores.service.ts');
