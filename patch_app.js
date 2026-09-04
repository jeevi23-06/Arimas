const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the return statement
code = code.replace(
  '<header className="bg-white border-b border-neutral-200 p-6 flex justify-between items-center">',
  `<header className="bg-white border-b border-neutral-200 p-6 flex justify-between items-center">
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

        <div className="hidden">`
);

// We made a small hack with the hidden div, let's fix it properly using string replace.
