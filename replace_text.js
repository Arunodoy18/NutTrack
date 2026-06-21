const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'components/Dashboard.tsx'),
  path.join(__dirname, 'components/BodyProfileModal.tsx'),
];

const replacements = [
  { from: /text-\[8px\]/g, to: 'text-[10px]' },
  { from: /text-\[9px\]/g, to: 'text-xs' },
  { from: /text-\[10px\]/g, to: 'text-xs' },
  { from: /text-\[11px\]/g, to: 'text-sm' },
  { from: /text-\[13px\]/g, to: 'text-sm' },
  { from: /text-xs/g, to: 'text-sm' },
  { from: /text-sm/g, to: 'text-base' },
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // First, to avoid double-bumping (like text-xs -> text-sm -> text-base),
    // we can do it safely by replacing with temporary tokens, then back.
    
    content = content.replace(/text-\[8px\]/g, '__TEXT_10__');
    content = content.replace(/text-\[9px\]/g, '__TEXT_XS__');
    content = content.replace(/text-\[10px\]/g, '__TEXT_XS__');
    content = content.replace(/text-\[11px\]/g, '__TEXT_SM__');
    content = content.replace(/text-\[13px\]/g, '__TEXT_SM__');
    
    // Note: text-xs and text-sm are common, we only replace them if they are preceded by a space or quote
    content = content.replace(/(["'\s])text-xs\b/g, '$1__TEXT_SM__');
    content = content.replace(/(["'\s])text-sm\b/g, '$1__TEXT_BASE__');
    
    // Now replace the temporary tokens back
    content = content.replace(/__TEXT_10__/g, 'text-[10px]');
    content = content.replace(/__TEXT_XS__/g, 'text-xs');
    content = content.replace(/__TEXT_SM__/g, 'text-sm');
    content = content.replace(/__TEXT_BASE__/g, 'text-base');

    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
