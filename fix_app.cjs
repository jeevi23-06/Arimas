const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldTerminalPattern = /\{\/\* Write-Ahead Log \(WAL\) Console \*\/\}.*?walLogs\.length > 0.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?<\/div>.*?<\/div>.*?<\/div>\n\s*\)}/s;

const newTerminalCode = "          {/* Live Backend Server Logs (JVM) */}\n          {systemLogs.length > 0 && (\n            <div className=\"bg-neutral-900 rounded-xl shadow-sm border border-neutral-800 p-4 flex flex-col min-h-[200px] max-h-[250px] shrink-0\">\n              <div className=\"flex items-center gap-2 mb-3 px-2 border-b border-neutral-800 pb-2\">\n                <Terminal className=\"w-4 h-4 text-green-400\" />\n                <h3 className=\"text-sm font-bold text-neutral-300 font-mono\">{\">_ Live Backend Server Logs (JVM)\"}</h3>\n              </div>\n              <div className=\"overflow-y-auto flex-1 font-mono text-xs px-2 space-y-1\" ref={walContainerRef}>\n                {systemLogs.map((log, i) => (\n                  <div key={log.id || i} className=\"flex items-start gap-3 text-neutral-400 py-0.5 hover:bg-neutral-800/50 rounded px-1 transition-colors\">\n                    <span className=\"text-neutral-500 shrink-0\">[{log.timestamp.split('T')[1].slice(0, 8)}]</span>\n                    <span className={`shrink-0 w-24 ${getTagColor(log.tag)}`}>[{log.tag}]</span>\n                    <span className=\"text-neutral-300 flex-1\">{log.message}</span>\n                  </div>\n                ))}\n              </div>\n            </div>\n          )}";

code = code.replace(oldTerminalPattern, newTerminalCode);
fs.writeFileSync('src/App.tsx', code);
