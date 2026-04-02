const fs = require('fs');
const file = './src/social-stores/social-stores.service.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/user\?.socialStores/g, '(user as any)?.socialStores');
content = content.replace(/user\.socialStores/g, '(user as any).socialStores');
content = content.replace(/user\.shopifyStores/g, '(user as any).shopifyStores');
content = content.replace(/const products = s\.products \|\| \[\];/g, 'let products: any[] = Array.isArray(s.products) ? s.products : [];');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed types in social-stores.service.ts');
