const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Imports
code = code.replace(
  "import { Play, Database, Server, Activity, AlertCircle, Cpu, MemoryStick, HardDrive, Terminal, Skull } from 'lucide-react';",
  "import { Play, Database, Server, Activity, AlertCircle, Cpu, MemoryStick, HardDrive, Terminal, Skull, Maximize2, Minimize2 } from 'lucide-react';"
);

// 2. State
code = code.replace(
  "const [executionTime, setExecutionTime] = useState<number | null>(null);",
  "const [executionTime, setExecutionTime] = useState<number | null>(null);\n  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);"
);

// 3. Container class
code = code.replace(
  '<div className="bg-neutral-900 rounded-xl shadow-sm border border-neutral-800 p-4 flex flex-col min-h-[200px] max-h-[250px] shrink-0">',
  '<div className={isTerminalExpanded ? "fixed inset-0 z-50 h-screen w-screen m-0 rounded-none bg-[#1e1e1e] flex flex-col p-4" : "bg-neutral-900 rounded-xl shadow-sm border border-neutral-800 p-4 flex flex-col min-h-[200px] max-h-[250px] shrink-0"}>'
);

// 4. Header UI & Toggle Button
code = code.replace(
  `              <div className="flex items-center gap-2 mb-3 px-2 border-b border-neutral-800 pb-2">
                <Terminal className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-bold text-neutral-300 font-mono">{">_ Live Backend Server Logs (JVM)"}</h3>
              </div>`,
  `              <div className="flex items-center justify-between mb-3 px-2 border-b border-neutral-800 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-green-400" />
                  <h3 className="text-sm font-bold text-neutral-300 font-mono">{">_ Live Backend Server Logs (JVM)"}</h3>
                </div>
                <button 
                  onClick={() => setIsTerminalExpanded(!isTerminalExpanded)}
                  className="text-neutral-400 hover:text-white transition-colors p-1 rounded hover:bg-neutral-800"
                  title={isTerminalExpanded ? "Minimize Terminal" : "Maximize Terminal"}
                >
                  {isTerminalExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>`
);

fs.writeFileSync('src/App.tsx', code);
