const fs = require('fs');
const files = [
  './src/users/users.service.ts',
  './src/social-stores/social-stores.service.ts',
  './src/common/plan.service.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // For users.service.ts and plan.service.ts (which use this.db.)
  content = content.replace(/(?<!await\s)(this\.db\.[a-zA-Z0-9]+)\(/g, 'await $1(');
  
  // For social-stores.service.ts (which uses this.jsonDatabaseService.)
  content = content.replace(/(?<!await\s)(this\.jsonDatabaseService\.[a-zA-Z0-9]+)\(/g, 'await $1(');

  // In plan.service.ts, some methods were synchronous. Let's ensure they are async.
  // Actually, replace non-async method declarations.
  content = content.replace(/getUserPlanLimits\(user: User\)/g, 'getUserPlanLimits(user: any)');
  content = content.replace(/canAddStore\(user: User\)/g, 'canAddStore(user: any)');
  content = content.replace(/canUseAiAction\(user: User\)/g, 'canUseAiAction(user: any)');
  content = content.replace(/canAddProduct\(user: User, currentProductCount: number\)/g, 'canAddProduct(user: any, currentProductCount: number)');
  content = content.replace(/canGenerateReport\(user: User, reportType: string\)/g, 'canGenerateReport(user: any, reportType: string)');
  content = content.replace(/getUsageSummary\(user: User\)/g, 'getUsageSummary(user: any)');
  content = content.replace(/private getActiveStoreSync\(user: User\): ShopifyStore \| undefined/g, 'private getActiveStoreSync(user: any): any');
  
  // Recalculate tokens in users.service.ts
  content = content.replace(/private recalculateTokens\(user: User\): User/g, 'private async recalculateTokens(user: any): Promise<any>');
  
  fs.writeFileSync(file, content, 'utf8');
}
console.log('Fixed awaits!');
