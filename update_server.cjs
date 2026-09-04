const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace WAL array and logic with systemLogs
code = code.replace(
  `  // Write-Ahead Log (WAL) simulation
  let walLogs: any[] = [
    { lsn: 1000, timestamp: new Date(Date.now() - 10000).toISOString(), operation: "SYSTEM BOOT", status: "COMMITTED" }
  ];
  let currentLsn = 1001;`,
  `  // System Logs simulation (JVM Backend Console)
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
  };`
);

code = code.replace(
  `  // Simulate Raft elections and slight metric fluctuations in background
  setInterval(() => {
    if (Math.random() > 0.7) {
      currentTerm++;
      leaderId = \`node-\${Math.floor(Math.random() * 3) + 1}\`;
    }
    // Slight fluctuations for realism
    bufferPoolHits = Math.max(75, Math.min(99, bufferPoolHits + (Math.random() > 0.5 ? 1 : -1)));
  }, 3000);`,
  `  // Simulate Raft elections and slight metric fluctuations in background
  setInterval(() => {
    // heartbeats
    if (Math.random() > 0.3) {
      addLog("RAFT", \`Leader \${leaderId} sent heartbeat to followers.\`);
    }

    if (Math.random() > 0.95) { // Lower probability for random elections
      currentTerm++;
      leaderId = \`node-\${Math.floor(Math.random() * 3) + 1}\`;
      addLog("RAFT", "Term incrementing: Initiating election...");
      addLog("RAFT", \`Node \${leaderId} elected LEADER.\`);
    }
    // Slight fluctuations for realism
    bufferPoolHits = Math.max(75, Math.min(99, bufferPoolHits + (Math.random() > 0.5 ? 1 : -1)));
  }, 3000);`
);

code = code.replace(
  `  app.get("/api/wal", (req, res) => {
    // Return last 50 logs
    res.json(walLogs.slice(-50));
  });`,
  `  app.get("/api/logs", (req, res) => {
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
     addLog("RAFT", \`Node \${leaderId} elected LEADER.\`);
     res.json({ status: "success", newLeader: leaderId });
  });`
);

// Replace query logic INSERT push to WAL
code = code.replace(
  `        // Push to WAL
        walLogs.push({
          lsn: currentLsn++,
          timestamp: new Date().toISOString(),
          operation: \`INSERT INTO users (id=\${id})\`,
          status: "COMMITTED"
        });`,
  `        // Emulate detailed backend flow
        addLog("CLIENT", \`Executing: INSERT INTO users (id=\${id})\`);
        addLog("WAL", \`Appending transaction to Linked List Write-Ahead Log...\`);
        addLog("STORAGE", \`Inserting ID into primary B-Tree...\`);
        addLog("STORAGE", \`Inserting email into secondary Hash Table...\`);
        addLog("2PC", \`LEADER initiating Prepare Phase...\`);
        addLog("2PC", \`Node 2 responds YES. Node 3 responds YES.\`);
        addLog("2PC", \`Commit Phase: Transaction COMMITTED across all nodes.\`);`
);

code = code.replace(
  `      walLogs.push({
          lsn: currentLsn++,
          timestamp: new Date().toISOString(),
          operation: \`SELECT (Plan: \${plan})\`,
          status: "COMMITTED"
      });`,
  `      addLog("CLIENT", \`Executing: SELECT (Plan: \${plan})\`);`
);

fs.writeFileSync('server.ts', code);
