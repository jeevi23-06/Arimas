const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Fix 1: WAL Scroll Hijacking
code = code.replace(
  "const walEndRef = useRef<HTMLDivElement>(null);",
  "const walContainerRef = useRef<HTMLDivElement>(null);"
);

code = code.replace(
  `  useEffect(() => {
    walEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [walLogs]);`,
  `  useEffect(() => {
    if (walContainerRef.current) {
      walContainerRef.current.scrollTop = walContainerRef.current.scrollHeight;
    }
  }, [walLogs]);`
);

// We need to attach walContainerRef to the scrolling container, and remove walEndRef
code = code.replace(
  '<div className="overflow-y-auto flex-1 font-mono text-xs px-2 space-y-1">',
  '<div className="overflow-y-auto flex-1 font-mono text-xs px-2 space-y-1" ref={walContainerRef}>'
);
code = code.replace(
  '<div ref={walEndRef} />',
  ''
);

// Fix 2: SQL Editor shrinking/disappearing
code = code.replace(
  '{/* Query Input */}\n          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col">',
  '{/* Query Input */}\n          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col w-full min-h-[120px] shrink-0">'
);

fs.writeFileSync('src/App.tsx', code);
