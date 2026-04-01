const fs = require('fs');
const path = require('path');

const historyDir = path.join(__dirname, 'migrated_prompt_history');
const files = fs.readdirSync(historyDir).filter(f => f.endsWith('.json'));

const fileContents = {};

files.forEach(file => {
  const content = fs.readFileSync(path.join(historyDir, file), 'utf8');
  try {
    const json = JSON.parse(content);
    // The JSON might be an array of turns, or an object.
    // Let's recursively search for "path" and "replacement" or "content"
    function search(obj) {
      if (!obj) return;
      if (Array.isArray(obj)) {
        obj.forEach(search);
      } else if (typeof obj === 'object') {
        if (obj.path && typeof obj.path === 'string' && obj.replacement) {
          fileContents[obj.path] = obj.replacement;
        } else if (obj.path && typeof obj.path === 'string' && obj.content) {
          fileContents[obj.path] = obj.content;
        }
        Object.values(obj).forEach(search);
      }
    }
    search(json);
  } catch (e) {
    console.error('Error parsing', file, e);
  }
});

for (const [filePath, content] of Object.entries(fileContents)) {
  const fullPath = path.join(__dirname, 'src', filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`Restoring ${filePath}...`);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  } else {
    console.log(`File ${filePath} already exists, skipping...`);
  }
}
console.log('Done.');
