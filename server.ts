import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";

async function startServer() {
  const app = express();
  // PORT MUST be 3000 in this environment.
  const PORT = 3000;
  const JAVA_SERVICE_URL = process.env.JAVA_SERVICE_URL || 'http://localhost:8080';

  app.use(cors());
  app.use(express.json());

  // Health check endpoint for Cloud Run and monitoring
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), javaServiceUrl: JAVA_SERVICE_URL });
  });

  // Fallback in-memory database and Raft simulation for the prototype
  let memTable: any[] = [
    { id: 5, name: "Alice Johnson", email: "alice@arimas.io", department: "Core Storage", age: 32, salary: 125000.0 },
    { id: 6, name: "Bob Smith", email: "bob@arimas.io", department: "Distributed Systems", age: 29, salary: 118000.0 }
  ];

  let currentTerm = 42;
  let leaderId = "node-1";
  
  // System Logs simulation (JVM Backend Console)
  let systemLogs: any[] = [
    { id: 1000, timestamp: new Date(Date.now() - 10000).toISOString(), tag: "SYSTEM", message: "BOOT: Engine initialized." }
  ];
  let currentLogId = 1001;
  
  const addLog = (tag, message) => {
    systemLogs.push({
      id: currentLogId++,
      timestamp: new Date().toISOString(),
      tag,
      message
    });
    if (systemLogs.length > 200) {
      systemLogs.shift();
    }
  };

  // Engine Metrics simulation state
  let bufferPoolHits = 89;
  let diskPages = 14;

  // Simulate Raft elections and slight metric fluctuations in background
  setInterval(() => {
    // heartbeats
    if (Math.random() > 0.3) {
      addLog("RAFT", `Leader ${leaderId} sent heartbeat to followers.`);
    }

    if (Math.random() > 0.95) { // Lower probability for random elections
      currentTerm++;
      leaderId = `node-${Math.floor(Math.random() * 3) + 1}`;
      addLog("RAFT", "Term incrementing: Initiating election...");
      addLog("RAFT", `Node ${leaderId} elected LEADER.`);
    }
    // Slight fluctuations for realism
    bufferPoolHits = Math.max(75, Math.min(99, bufferPoolHits + (Math.random() > 0.5 ? 1 : -1)));
  }, 3000);

  app.get("/api/cluster/status", (req, res) => {
    res.json({
      leader: leaderId,
      term: currentTerm,
      nodes: [
        { id: 'node-1', state: leaderId === 'node-1' ? 'LEADER' : 'FOLLOWER', health: 'UP' },
        { id: 'node-2', state: leaderId === 'node-2' ? 'LEADER' : 'FOLLOWER', health: 'UP' },
        { id: 'node-3', state: leaderId === 'node-3' ? 'LEADER' : 'FOLLOWER', health: 'UP' }
      ]
    });
  });

  app.get("/api/logs", (req, res) => {
    res.json(systemLogs.slice(-100));
  });

  app.post("/api/chaos", (req, res) => {
     addLog("SYSTEM", "*** INITIATING CHAOS TEST: KILLING NODE ***");
     addLog("RAFT", "Follower lost heartbeat from Leader!");
     currentTerm++;
     let oldLeader = leaderId;
     let nextNodes = ["node-1", "node-2", "node-3"].filter(n => n !== oldLeader);
     leaderId = nextNodes[Math.floor(Math.random() * nextNodes.length)];
     addLog("RAFT", "Term incrementing: Initiating election...");
     addLog("RAFT", `Node ${leaderId} elected LEADER.`);
     res.json({ status: "success", newLeader: leaderId });
  });

  app.get("/api/metrics", (req, res) => {
    res.json({
      memTableSize: memTable.length,
      memTableCapacity: 100,
      bufferPoolHitRate: bufferPoolHits,
      diskPages: diskPages
    });
  });

  app.post("/api/query", (req, res) => {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const q = query.trim().toLowerCase();
    
    if (q.startsWith("insert")) {
      const match = query.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
      
      if (match) {
        const table = match[1];
        const cols = match[2].split(',').map(c => c.trim().toLowerCase());
        const vals = match[3].split(',').map(v => v.trim().replace(/^'|'$/g, ''));
        
        const record: any = {};
        for (let i = 0; i < cols.length; i++) {
          const col = cols[i];
          let val = vals[i];
          if (!isNaN(val)) {
            val = Number(val);
          }
          record[col] = val;
        }

        if (record.id === undefined) {
           return res.status(400).json({ error: "Primary key 'id' is required for INSERT" });
        }

        const id = record.id;
        const exists = memTable.find(u => u.id === id);
        if (exists) {
          return res.status(400).json({ error: `Insert failed: User with ID ${id} already exists.` });
        }
        
        memTable.push({
          id,
          name: record.name || "",
          email: record.email || "",
          department: record.department || "",
          age: record.age || 0,
          salary: record.salary || 0.0
        });
        
        // Dynamic simulated execution time (insert takes a bit longer, ~20-30ms)
        const executionTimeMs = Math.floor(Math.random() * 10) + 20;
        
        // Emulate detailed backend flow
        addLog("CLIENT", `Executing: INSERT INTO ${table} (id=${id})`);
        addLog("WAL", `Appending transaction to Linked List Write-Ahead Log...`);
        addLog("STORAGE", `Inserting ID into primary B-Tree...`);
        addLog("STORAGE", `Inserting email into secondary Hash Table...`);
        addLog("2PC", `LEADER initiating Prepare Phase...`);
        addLog("2PC", `Node 2 responds YES. Node 3 responds YES.`);
        addLog("2PC", `Commit Phase: Transaction COMMITTED across all nodes.`);

        return res.json({
          executionPlan: "INSERT_INTO_MEMTABLE",
          executionTimeMs,
          ast: { operation: "INSERT", table, conditions: [{ column: "id", value: id }] },
          results: memTable
        });
      } else {
        return res.status(400).json({ error: "Invalid INSERT syntax. Expected: INSERT INTO table (columns) VALUES (values)" });
      }
    } else if (q.startsWith("select")) {
      // Basic mock parser for SELECT
      const idMatch = query.match(/id\s*=\s*(\d+)/i);
      const ageMatch = query.match(/age\s*=\s*(\d+)/i);
      const salaryMatch = query.match(/salary\s*=\s*(\d+)/i);
      const deptMatch = query.match(/department\s*=\s*'([^']+)'/i);
      
      let results = [...memTable];
      let plan = "FULL_TABLE_SCAN";
      let conditions: any[] = [];
      let executionTimeMs = Math.floor(Math.random() * 30) + 20; // Default slow for full scan

      if (idMatch) {
        plan = "BTREE_INDEX_SCAN";
        executionTimeMs = Math.floor(Math.random() * 5) + 1; // Fast for index scan
        const id = Number(idMatch[1]);
        conditions.push({ column: "id", operator: "=", value: id });
        
        // Ensure single record lookup is strictly wrapped in an array, using loose equality
        const matchedRecord = memTable.find(u => u.id == id);
        results = matchedRecord ? [matchedRecord] : [];
      } else if (ageMatch) {
        plan = "FULL_TABLE_SCAN";
        const age = Number(ageMatch[1]);
        conditions.push({ column: "age", operator: "=", value: age });
        
        const filteredRecords = memTable.filter(u => u.age == age);
        results = filteredRecords.length > 0 ? filteredRecords : [];
      } else if (salaryMatch) {
        plan = "FULL_TABLE_SCAN";
        const salary = Number(salaryMatch[1]);
        conditions.push({ column: "salary", operator: "=", value: salary });
        
        const filteredRecords = memTable.filter(u => u.salary == salary);
        results = filteredRecords.length > 0 ? filteredRecords : [];
      } else if (deptMatch) {
        const dept = deptMatch[1];
        conditions.push({ column: "department", operator: "=", value: dept });
        
        // Ensure multiple record lookup falls back to an empty array gracefully
        const filteredRecords = memTable.filter(u => u.department.toLowerCase() === dept.toLowerCase());
        results = filteredRecords.length > 0 ? filteredRecords : [];
      }
      
      addLog("CLIENT", `Executing: SELECT (Plan: ${plan})`);

      return res.json({
        executionPlan: plan,
        executionTimeMs,
        ast: { operation: "SELECT", table: "users", conditions, limit: 10 },
        results
      });
    } else if (q.startsWith("delete")) {
      const deleteMatch = query.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*['"]?([^'";]+)['"]?/i);
      
      if (deleteMatch) {
        const table = deleteMatch[1];
        const column = deleteMatch[2].toLowerCase();
        const targetVal = deleteMatch[3].trim();
        const value = isNaN(Number(targetVal)) ? targetVal : Number(targetVal);
        
        // Remove from memTable using string conversion to safely handle string/number mismatches
        memTable = memTable.filter(u => String(u[column]) !== String(targetVal));
        
        const executionTimeMs = Math.floor(Math.random() * 10) + 15;
        
        addLog("CLIENT", `Executing: DELETE FROM ${table} WHERE ${column} = ${targetVal}`);
        addLog("WAL", `Appending transaction to Write-Ahead Log...`);
        addLog("STORAGE", `Removing ID from primary B-Tree index...`);
        addLog("2PC", `Commit Phase: Transaction COMMITTED across all nodes.`);

        return res.json({
          executionPlan: "DELETE_FROM_MEMTABLE",
          executionTimeMs,
          ast: { operation: "DELETE", table, conditions: [{ column, operator: "=", value }] },
          results: memTable
        });
      } else {
        return res.status(400).json({ error: "Invalid DELETE syntax. Expected: DELETE FROM table WHERE column = value" });
      }
    }

    res.status(400).json({ error: "Unsupported operation or syntax error" });
  });

  // Remove the old wildcard proxy route completely

  // Vite middleware for development vs static serving in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`[API Gateway] Routing API traffic to Java Service at: ${JAVA_SERVICE_URL}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
