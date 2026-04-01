const fs = require('fs');
const path = require('path');

const historyDir = path.join(__dirname, 'migrated_prompt_history');
const files = fs.readdirSync(historyDir).filter(f => f.endsWith('.json')).sort();

const fileSystem = {};

files.forEach(file => {
  const content = fs.readFileSync(path.join(historyDir, file), 'utf8');
  try {
    const data = JSON.parse(content);
    
    function processPayload(payload) {
      if (!payload) return;
      if (Array.isArray(payload)) {
        payload.forEach(processPayload);
      } else if (typeof payload === 'object') {
        if (payload.path && payload.diffs && Array.isArray(payload.diffs)) {
          const filePath = payload.path;
          let currentContent = fileSystem[filePath] || '';
          
          for (const diff of payload.diffs) {
            if (!diff.target) {
              // Full replacement
              currentContent = diff.replacement;
            } else {
              // Edit
              if (currentContent.includes(diff.target)) {
                currentContent = currentContent.replace(diff.target, diff.replacement);
              } else {
                console.warn(`Target not found in ${filePath} during replay.`);
              }
            }
          }
          fileSystem[filePath] = currentContent;
        }
        Object.values(payload).forEach(processPayload);
      }
    }
    
    processPayload(data);
  } catch (e) {
    console.error('Error parsing', file, e);
  }
});

for (const [filePath, content] of Object.entries(fileSystem)) {
  // Only restore files in src/ or other relevant directories
  if (filePath.startsWith('src/') || filePath.startsWith('components/') || filePath.startsWith('services/') || filePath.startsWith('types.ts')) {
    let fullPath = path.join(__dirname, filePath);
    // If path doesn't start with src/ but it's a component, put it in src/
    if (!filePath.startsWith('src/')) {
      fullPath = path.join(__dirname, 'src', filePath);
    }
    
    console.log(`Restoring ${fullPath}...`);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
}
console.log('Done.');
