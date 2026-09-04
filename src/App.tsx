import React, { useState, useEffect, useRef } from 'react';
import { Play, Database, Server, Activity, AlertCircle, Cpu, MemoryStick, HardDrive, Terminal, Skull, Maximize2, Minimize2 } from 'lucide-react';

export default function App() {
  const [query, setQuery] = useState('SELECT * FROM users WHERE id = 5 ORDER BY age LIMIT 10');
  const [results, setResults] = useState<any[]>([]);
  const [executionPlan, setExecutionPlan] = useState<string | null>(null);
  const [ast, setAst] = useState<any>(null);
  const [clusterStatus, setClusterStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);
  const walContainerRef = useRef<HTMLDivElement>(null);

  // Using Render environment variable for API Gateway URL, falling back to relative path
  const API_BASE = (import.meta as any).env.VITE_API_URL || '/api';

  useEffect(() => {
    fetchClusterStatus();
    fetchMetrics();
    fetchLogs();
    
    // Poll the Spring Boot API every 1000ms for live Raft consensus visualization
    const intervalId = setInterval(() => {
      fetchClusterStatus();
      fetchMetrics();
      fetchLogs();
    }, 1000);
    
    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (walContainerRef.current) {
      walContainerRef.current.scrollTop = walContainerRef.current.scrollHeight;
    }
  }, [systemLogs]);

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`${API_BASE}/metrics`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      setMetrics({ bufferPoolHitRate: 89, memTableSize: 2, memTableCapacity: 100, diskPages: 14 });
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/logs`);
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
      await fetch(`${API_BASE}/chaos`, { method: 'POST' });
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
  };

  const fetchClusterStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/cluster/status`);
      const data = await res.json();
      setClusterStatus(data);
    } catch (err) {
      // Fallback mock for UI visualization if backend is unavailable
      setClusterStatus({
        leader: 'node-1',
        term: 42,
        nodes: [
          { id: 'node-1', state: 'LEADER', health: 'UP' },
          { id: 'node-2', state: 'FOLLOWER', health: 'UP' },
          { id: 'node-3', state: 'FOLLOWER', health: 'UP' }
        ]
      });
    }
  };

  const handleExecute = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    setLoading(true);
    setError(null);
    // We intentionally DO NOT reset the query state (e.g., setQuery('')) 
    // here so that the user's input is preserved in the editor.
    try {
      const res = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data.results);
        setExecutionPlan(data.executionPlan);
        setAst(data.ast);
        setExecutionTime(data.executionTimeMs || null);
        fetchLogs();
        fetchMetrics();
      } else {
        setError(data.error);
      }
    } catch (err) {
      // Fallback for prototype visualization if backend is unavailable
      setExecutionPlan(query.toLowerCase().includes('email') ? "HASH_INDEX_SCAN" : query.toLowerCase().includes('id') ? "BTREE_INDEX_SCAN" : "FULL_TABLE_SCAN");
      setAst({
        operation: "SELECT",
        table: "users",
        conditions: query.toLowerCase().includes('id') ? [{ column: "id", operator: "=", value: "5" }] : [],
        orderBy: "age",
        limit: 10
      });
      setResults([
        {
          id: 5,
          name: "Alice Johnson",
          email: "alice@arimas.io",
          department: "Core Storage",
          age: 32,
          salary: 125000.0
        },
        {
          id: 6,
          name: "Bob Smith",
          email: "bob@arimas.io",
          department: "Distributed Systems",
          age: 29,
          salary: 118000.0
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex font-sans text-neutral-900">
      {/* Sidebar */}
      <div className="w-64 bg-neutral-900 text-neutral-100 p-6 flex flex-col shadow-xl z-10">
        <div className="flex items-center gap-3 mb-8">
          <Database className="w-6 h-6 text-blue-400" />
          <h1 className="text-xl font-bold tracking-wider">ARIMAS</h1>
        </div>
        
        <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Cluster Status
        </h2>
        
        {clusterStatus ? (
          <div className="space-y-4">
            <div className="bg-neutral-800 p-3 rounded-lg border border-neutral-700">
              <p className="text-xs text-neutral-400">Current Term</p>
              <p className="text-lg font-mono">{clusterStatus.term}</p>
            </div>
            <div className="bg-neutral-800 p-3 rounded-lg border border-neutral-700">
              <p className="text-xs text-neutral-400">Leader</p>
              <p className="text-lg font-mono text-green-400">{clusterStatus.leader}</p>
            </div>
            <button onClick={handleChaosTest} className="w-full bg-red-600/10 text-red-400 border border-red-500/30 hover:bg-red-600/20 px-3 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors">
              <Skull className="w-4 h-4" /> Kill Leader
            </button>
            <div className="mt-6">
              <p className="text-xs text-neutral-400 mb-2">Nodes</p>
              <div className="space-y-2">
                {clusterStatus.nodes.map((node: any) => (
                  <div key={node.id} className="flex items-center justify-between bg-neutral-800 p-2 rounded border border-neutral-700">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Server className="w-3 h-3 text-neutral-400" /> {node.id}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${node.state === 'LEADER' ? 'bg-blue-900/50 text-blue-300' : 'bg-neutral-700 text-neutral-300'}`}>
                      {node.state}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-neutral-500 animate-pulse">Loading cluster data...</div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-neutral-200 p-6 flex justify-between items-center shrink-0">
          <h2 className="text-2xl font-bold text-neutral-800">Query Console</h2>
        </header>

        {/* Engine Metrics Bar */}
        {metrics && (
          <div className="bg-white border-b border-neutral-200 p-4 px-6 flex items-center gap-8 shadow-sm z-10 shrink-0">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-500" />
              <div>
                <p className="text-xs text-neutral-500 font-semibold uppercase">Buffer Pool Hits</p>
                <p className="text-sm font-mono font-bold text-neutral-800">{metrics.bufferPoolHitRate}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MemoryStick className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-neutral-500 font-semibold uppercase">MemTable Size</p>
                <p className="text-sm font-mono font-bold text-neutral-800">{metrics.memTableSize} / {metrics.memTableCapacity}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-xs text-neutral-500 font-semibold uppercase">Disk Pages</p>
                <p className="text-sm font-mono font-bold text-neutral-800">{metrics.diskPages}</p>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-auto p-6 flex flex-col gap-6">
          {/* Query Input */}
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden w-full min-h-[120px] shrink-0 block">
            <div className="bg-neutral-100 px-4 py-2 border-b border-neutral-200 flex justify-between items-center">
              <span className="text-sm font-medium text-neutral-600 font-mono">SQL Editor</span>
              <button 
                onClick={handleExecute}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4" /> {loading ? 'Running...' : 'Execute'}
              </button>
            </div>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full min-h-[140px] p-4 font-mono text-sm resize-y overflow-y-auto focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              spellCheck="false"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Execution Plan */}
          {executionPlan && (
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-neutral-800">Execution Plan</h3>
                {executionTime !== null && (
                  <span className="text-sm font-mono bg-neutral-100 text-neutral-600 px-3 py-1 rounded-full border border-neutral-200">
                    Execution Time: <span className="font-bold">{executionTime}ms</span>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                  <p className="text-xs text-blue-600 uppercase font-semibold mb-1">Access Path (Phase 2 & 3)</p>
                  <p className="text-lg font-mono text-blue-900">{executionPlan}</p>
                </div>
                <div className="bg-purple-50 border border-purple-100 p-4 rounded-lg overflow-x-auto">
                  <p className="text-xs text-purple-600 uppercase font-semibold mb-1">Parsed AST (Phase 3)</p>
                  <pre className="text-xs font-mono text-purple-900 mt-2">{JSON.stringify(ast, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}

          {/* Results Table */}
          {results.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 flex flex-col min-h-[250px] shrink-0">
              <h3 className="text-lg font-bold text-neutral-800 mb-4">Results</h3>
              <div className="overflow-auto border border-neutral-200 rounded-lg flex-1">
                <table className="w-full text-left text-sm text-neutral-600 whitespace-nowrap">
                  <thead className="bg-neutral-50 text-neutral-900 border-b border-neutral-200 sticky top-0 z-10">
                    <tr>
                      {Object.keys(results[0]).map(key => (
                        <th key={key} className="px-6 py-4 font-semibold font-mono">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {results.map((row, i) => (
                      <tr key={i} className="hover:bg-neutral-50 transition-colors">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-6 py-4">{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Live Backend Server Logs (JVM) */}
          {systemLogs.length > 0 && (
            <div className={isTerminalExpanded ? "fixed inset-0 z-50 h-screen w-screen m-0 rounded-none bg-[#1e1e1e] flex flex-col p-4" : "bg-neutral-900 rounded-xl shadow-sm border border-neutral-800 p-4 flex flex-col min-h-[200px] max-h-[250px] shrink-0"}>
              <div className="flex items-center justify-between mb-3 px-2 border-b border-neutral-800 pb-2 shrink-0">
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
              </div>
              <div className="overflow-y-auto flex-1 font-mono text-xs px-2 space-y-1" ref={walContainerRef}>
                {systemLogs.map((log, i) => (
                  <div key={log.id || i} className="flex items-start gap-3 text-neutral-400 py-0.5 hover:bg-neutral-800/50 rounded px-1 transition-colors">
                    <span className="text-neutral-500 shrink-0">[{log.timestamp.split('T')[1].slice(0, 8)}]</span>
                    <span className={`shrink-0 w-24 ${getTagColor(log.tag)}`}>[{log.tag}]</span>
                    <span className="text-neutral-300 flex-1">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
