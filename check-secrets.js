const fs = require('fs');
const path = require('path');

const sensitiveKeywords = [
  'apiKey', 'api_key', 'password', 'secret', 'token', 
  'key:', 'auth', 'credential', 'encryptionKey',
  'AKIA', 'sk-', 'AIza'
];

const excludeDirs = ['.git', 'icons', 'node_modules'];

function checkFiles(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    if (excludeDirs.includes(file)) continue;
    
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      checkFiles(fullPath);
    } else if (stat.isFile() && 
              (file.endsWith('.js') || 
               file.endsWith('.json') || 
               file.endsWith('.html'))) {
      
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        for (const keyword of sensitiveKeywords) {
          if (content.includes(keyword)) {
            const lines = content.split('\n');
            lines.forEach((line, index) => {
              if (line.includes(keyword) && !line.trim().startsWith('//')) {
                console.log(`⚠️  POTENTIAL SECRET in ${fullPath}:${index + 1}`);
                console.log(`   ${line.trim()}`);
              }
            });
          }
        }
      } catch (e) {
        console.log(`Cannot read ${fullPath}: ${e.message}`);
      }
    }
  }
}

console.log('🔍 Checking for secrets in AI Form Filler Pro...');
checkFiles('.');
console.log('✅ Secret check completed');