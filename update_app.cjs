const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Update imports
code = code.replace(
  "import { Play, Database, Server, Activity, AlertCircle, Cpu, MemoryStick, HardDrive, Terminal } from 'lucide-react';",
  "import { Play, Database, Server, Activity, AlertCircle, Cpu, MemoryStick, HardDrive, Terminal, Skull } from 'lucide-react';"
);

// Update states
code = code.replace(
  "const [walLogs, setWalLogs] = useState<any[]>([]);",
  "const [systemLogs, setSystemLogs] = useState<any[]>([]);"
);

// Update fetch functions in useEffect
code = code.replace(
  "fetchWal();",
  "fetchLogs();"
);
code = code.replace(
  "fetchWal();",
  "fetchLogs();"
);
code = code.replace(
  "fetchWal();",
  "fetchLogs();"
);

// Update scroll effect
code = code.replace(
  `  useEffect(() => {
    if (walContainerRef.current) {
      walContainerRef.current.scrollTop = walContainerRef.current.scrollHeight;
    }
  }, [walLogs]);`,
  `  useEffect(() => {
    if (walContainerRef.current) {
      walContainerRef.current.scrollTop = walContainerRef.current.scrollHeight;
    }
  }, [systemLogs]);`
);

// Update fetchWal definition
code = code.replace(
  `  const fetchWal = async () => {
    try {
      const res = await fetch(\`\${API_BASE}/wal\`);
      if (res.ok) {
        const data = await res.json();
        setWalLogs(data);
      }
    } catch (err) {
      //
    }
  };`,
  `  const fetchLogs = async () => {
    try {
      const res = await fetch(\`\${API_BASE}/logs\`);
      if (res.ok) {
        const data = await res.json();
        setSystemLogs(data);
      }
    } catch (err) {
      //
    }
  };

  const handleChaosTest = async () => {
    try {
      await fetch(\`\${API_BASE}/chaos\`, { method: 'POST' });
      fetchClusterStatus();
      fetchLogs();
    } catch(err) {
      //
    }
  };

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'RAFT': return 'text-orange-400 font-bold';
      case 'STORAGE': return 'text-cyan-400 font-bold';
      case '2PC': return 'text-purple-400 font-bold';
      case 'SYSTEM': return 'text-red-500 font-bold';
      case 'WAL': return 'text-green-400 font-bold';
      case 'CLIENT': return 'text-blue-400 font-bold';
      default: return 'text-neutral-300';
    }
  };`
);

// Add chaos button
code = code.replace(
  `            <div className="mt-6">
              <p className="text-xs text-neutral-400 mb-2">Nodes</p>`,
  `            <button onClick={handleChaosTest} className="w-full bg-red-600/10 text-red-400 border border-red-500/30 hover:bg-red-600/20 px-3 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors">
              <Skull className="w-4 h-4" /> Kill Leader
            </button>
            <div className="mt-6">
              <p className="text-xs text-neutral-400 mb-2">Nodes</p>`
);

// Replace Terminal
code = code.replace(
  `          {/* Write-Ahead Log (WAL) Console */}
          {walLogs.length > 0 && (
            <div className="bg-neutral-900 rounded-xl shadow-sm border border-neutral-800 p-4 flex flex-col min-h-[200px] max-h-[250px] shrink-0">
              <div className="flex items-center gap-2 mb-3 px-2 border-b border-neutral-800 pb-2">
                <Terminal className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-bold text-neutral-300 font-mono">Write-Ahead Log (WAL)</h3>
              </div>
              <div className="overflow-y-auto flex-1 font-mono text-xs px-2 space-y-1" ref={walContainerRef}>
                {walLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-4 text-neutral-400">
                    <span className="text-neutral-500 shrink-0">[{log.timestamp.split('T')[1].slice(0, 8)}]</span>
                    <span className="text-blue-400 shrink-0">LSN:{log.lsn}</span>
                    <span className="text-neutral-300 flex-1">{log.operation}</span>
                    <span className="text-green-500 shrink-0">[{log.status}]</span>
                  </div>
                ))}
              </div>
            </div>
          )}`,
  `          {/* Live Backend Server Logs (JVM) */}
          {systemLogs.length > 0 && (
            <div className="bg-neutral-900 rounded-xl shadow-sm border border-neutral-800 p-4 flex flex-col min-h-[200px] max-h-[250px] shrink-0">
              <div className="flex items-center gap-2 mb-3 px-2 border-b border-neutral-800 pb-2">
                <Terminal className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-bold text-neutral-300 font-mono">{">_ Live Backend Server Logs (JVM)"}</h3>
              </div>
              <div className="overflow-y-auto flex-1 font-mono text-xs px-2 space-y-1" ref={walContainerRef}>
                {systemLogs.map((log, i) => (
                  <div key={log.id || i} className="flex items-start gap-3 text-neutral-400 py-0.5 hover:bg-neutral-800/50 rounded px-1 transition-colors">
                    <span className="text-neutral-500 shrink-0">[{log.timestamp.split('T')[1].slice(0, 8)}]</span>
                    <span className={\`shrink-0 w-24 \${getTagColor(log.tag)}\`}>[{log.tag}]</span>
                    <span className="text-neutral-300 flex-1">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}`
);

fs.writeFileSync('src/App.tsx', code);
