const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "import React, { useState, useEffect } from 'react';",
  "import React, { useState, useEffect, useRef } from 'react';"
);

code = code.replace(
  "import { Play, Database, Server, Activity, AlertCircle } from 'lucide-react';",
  "import { Play, Database, Server, Activity, AlertCircle, Cpu, MemoryStick, HardDrive, Terminal } from 'lucide-react';"
);

code = code.replace(
  "const [error, setError] = useState<string | null>(null);",
  `const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [walLogs, setWalLogs] = useState<any[]>([]);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const walEndRef = useRef<HTMLDivElement>(null);`
);

code = code.replace(
  `  useEffect(() => {
    fetchClusterStatus();
    
    // Poll the Spring Boot API every 1000ms for live Raft consensus visualization
    const intervalId = setInterval(fetchClusterStatus, 1000);
    
    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);`,
  `  useEffect(() => {
    fetchClusterStatus();
    fetchMetrics();
    fetchWal();
    
    // Poll the Spring Boot API every 1000ms for live Raft consensus visualization
    const intervalId = setInterval(() => {
      fetchClusterStatus();
      fetchMetrics();
      fetchWal();
    }, 1000);
    
    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    walEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [walLogs]);

  const fetchMetrics = async () => {
    try {
      const res = await fetch(\`\${API_BASE}/metrics\`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      setMetrics({ bufferPoolHitRate: 89, memTableSize: 2, memTableCapacity: 100, diskPages: 14 });
    }
  };

  const fetchWal = async () => {
    try {
      const res = await fetch(\`\${API_BASE}/wal\`);
      if (res.ok) {
        const data = await res.json();
        setWalLogs(data);
      }
    } catch (err) {
      //
    }
  };`
);

code = code.replace(
  `      if (res.ok) {
        setResults(data.results);
        setExecutionPlan(data.executionPlan);
        setAst(data.ast);
      } else {`,
  `      if (res.ok) {
        setResults(data.results);
        setExecutionPlan(data.executionPlan);
        setAst(data.ast);
        setExecutionTime(data.executionTimeMs || null);
        fetchWal();
        fetchMetrics();
      } else {`
);

fs.writeFileSync('src/App.tsx', code);
