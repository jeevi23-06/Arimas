const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldInsertPattern = /if \(q\.startsWith\("insert"\)\) \{[\s\S]*?\} else if \(q\.startsWith\("select"\)\) \{/;

const newInsertCode = `if (q.startsWith("insert")) {
      const match = query.match(/INSERT\\s+INTO\\s+(\\w+)\\s*\\(([^)]+)\\)\\s*VALUES\\s*\\(([^)]+)\\)/i);
      
      if (match) {
        const table = match[1];
        const cols = match[2].split(',').map(c => c.trim().toLowerCase());
        const vals = match[3].split(',').map(v => v.trim().replace(/^'|'$/g, ''));
        
        const record = {};
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
          return res.status(400).json({ error: \`Insert failed: User with ID \${id} already exists.\` });
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
        addLog("CLIENT", \`Executing: INSERT INTO \${table} (id=\${id})\`);
        addLog("WAL", \`Appending transaction to Linked List Write-Ahead Log...\`);
        addLog("STORAGE", \`Inserting ID into primary B-Tree...\`);
        addLog("STORAGE", \`Inserting email into secondary Hash Table...\`);
        addLog("2PC", \`LEADER initiating Prepare Phase...\`);
        addLog("2PC", \`Node 2 responds YES. Node 3 responds YES.\`);
        addLog("2PC", \`Commit Phase: Transaction COMMITTED across all nodes.\`);

        return res.json({
          executionPlan: "INSERT_INTO_MEMTABLE",
          executionTimeMs,
          ast: { operation: "INSERT", table, conditions: [{ column: "id", value: id }] },
          results: [{ status: "Success", message: "User inserted successfully", id }]
        });
      } else {
        return res.status(400).json({ error: "Invalid INSERT syntax. Expected: INSERT INTO table (columns) VALUES (values)" });
      }
    } else if (q.startsWith("select")) {`;

code = code.replace(oldInsertPattern, newInsertCode);
fs.writeFileSync('server.ts', code);
