const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  '<div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col w-full min-h-[120px] shrink-0">',
  '<div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden w-full min-h-[120px] shrink-0 block">'
);

fs.writeFileSync('src/App.tsx', code);
