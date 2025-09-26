(function () {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const gridRange = document.getElementById('gridRange');
    const gridLabel = document.getElementById('gridLabel');
    const speedInput = document.getElementById('speed');
    const statNodes = document.getElementById('statNodes');
    const statPath = document.getElementById('statPath');
    const statTime = document.getElementById('statTime');
    let COLS = parseInt(gridRange.value);
    let ROWS = Math.round(COLS * (canvas.height / canvas.width));
    const cellPadding = 1;
    let CELL = Math.floor(canvas.width / COLS);

    const State = { EMPTY: 0, START: 1, END: 2, WALL: 3, FRONTIER: 4, VISITED: 5, PATH: 6 };

    let grid = [];
    let start = { x: 2, y: 2 };
    let end = { x: COLS - 3, y: ROWS - 3 };
    let placing = 'wall';
    let mouseDown = false;
    let animRunning = false;

    function setupMobile() {
        const toggleBtn = document.getElementById('toggle-controls');
        const mobileContainer = document.getElementById('mobile-controls-stats');
        const controlsContent = document.getElementById('controls-content');
        const statsContent = document.getElementById('stats-content');

        if (window.innerWidth < 768) {
            mobileContainer.appendChild(controlsContent);
            mobileContainer.appendChild(statsContent);
        }

        toggleBtn.addEventListener('click', () => {
            const isHidden = mobileContainer.classList.toggle('hidden');
            toggleBtn.textContent = isHidden ? 'Show Controls & Stats' : 'Hide Controls & Stats';
        });
    }

    function resizeCanvas() {
        const canvasContainer = canvas.parentElement;
        canvas.width = canvasContainer.clientWidth;
        canvas.height = canvasContainer.clientHeight;
        makeGrid();
    }

    function makeGrid() {
        ROWS = Math.max(10, Math.round(COLS * (canvas.height / canvas.width)));
        CELL = Math.floor(canvas.width / COLS);
        grid = new Array(ROWS);
        for (let r = 0; r < ROWS; r++) grid[r] = new Array(COLS).fill(State.EMPTY);
        start = { x: 2, y: 2 };
        end = { x: COLS - 3, y: ROWS - 3 };
        grid[start.y][start.x] = State.START;
        grid[end.y][end.x] = State.END;
        draw();
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const s = grid[r][c];
                let color = '#bae6fd'; // Slightly darker blue for empty cells
                switch (s) {
                    case State.START: color = '#22c55e'; break;
                    case State.END: color = '#ef4444'; break;
                    case State.WALL: color = '#94a3b8'; break;
                    case State.FRONTIER: color = '#facc15'; break;
                    case State.VISITED: color = '#93c5fd'; break;
                    case State.PATH: color = '#3b82f6'; break;
                }
                ctx.fillStyle = color;
                ctx.fillRect(c * CELL + cellPadding, r * CELL + cellPadding, CELL - 2 * cellPadding, CELL - 2 * cellPadding);
            }
        }
    }

    function posFromMouse(e) {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / CELL);
        const y = Math.floor((e.clientY - rect.top) / CELL);
        return { x: Math.min(COLS - 1, Math.max(0, x)), y: Math.min(ROWS - 1, Math.max(0, y)) };
    }

    canvas.addEventListener('mousedown', e => {
        if (animRunning) return;
        mouseDown = true;
        const p = posFromMouse(e);
        const val = grid[p.y][p.x];
        if (val === State.START) { placing = 'start'; }
        else if (val === State.END) { placing = 'end'; }
        else { placing = 'wall'; grid[p.y][p.x] = (grid[p.y][p.x] === State.WALL ? State.EMPTY : State.WALL); }
        draw();
    });
    window.addEventListener('mouseup', () => { mouseDown = false; placing = 'wall'; });
    canvas.addEventListener('mousemove', e => {
        if (animRunning || !mouseDown) return;
        const p = posFromMouse(e);
        if (placing === 'start') {
            for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c] === State.START) grid[r][c] = State.EMPTY;
            start = p; grid[p.y][p.x] = State.START;
        } else if (placing === 'end') {
            for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c] === State.END) grid[r][c] = State.EMPTY;
            end = p; grid[p.y][p.x] = State.END;
        } else {
            if (grid[p.y][p.x] === State.EMPTY) grid[p.y][p.x] = State.WALL;
        }
        draw();
    });

    function neighbors(u) {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
        const res = [];
        for (const d of dirs) {
            const nx = u.x + d[0], ny = u.y + d[1];
            if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
            if (grid[ny][nx] === State.WALL) continue;
            if (Math.abs(d[0]) === 1 && Math.abs(d[1]) === 1) {
                if (grid[u.y][u.x + d[0]] === State.WALL || grid[u.y + d[1]][u.x] === State.WALL) continue;
            }
            res.push({ x: nx, y: ny });
        }
        return res;
    }

    function idx(a) { return a.y * COLS + a.x; }
    function cellEq(a, b) { return a.x === b.x && a.y === b.y; }
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    function euclidean(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

    async function runAstar() {
        animRunning = true; clearSearchMarks(); const speed = parseInt(speedInput.value);
        const open = new Set(); const g = new Map(), f = new Map(), prev = new Map();
        function getG(p) { return g.get(idx(p)) ?? Infinity; } function getF(p) { return f.get(idx(p)) ?? Infinity; }
        open.add(idx(start)); g.set(idx(start), 0); f.set(idx(start), euclidean(start, end));
        let explored = 0; const t0 = performance.now();
        while (open.size) {
            const cur = [...open].map(i => ({ x: i % COLS, y: Math.floor(i / COLS) })).sort((a, b) => getF(a) - getF(b))[0];
            open.delete(idx(cur));
            if (!cellEq(cur, start) && !cellEq(cur, end)) grid[cur.y][cur.x] = State.VISITED;
            draw(); await sleep(speed); explored++;
            if (cellEq(cur, end)) {
                const path = []; let c = cur; while (prev.has(idx(c))) { path.push(c); c = prev.get(idx(c)); }
                path.reverse(); await animatePath(path, speed);
                statNodes.textContent = explored; statPath.textContent = path.length; statTime.textContent = (performance.now() - t0).toFixed(1);
                animRunning = false; return;
            }
            for (const v of neighbors(cur)) {
                const tentative = getG(cur) + euclidean(cur, v);
                if (tentative < getG(v)) {
                    prev.set(idx(v), cur); g.set(idx(v), tentative); f.set(idx(v), tentative + euclidean(v, end));
                    open.add(idx(v)); if (!cellEq(v, start) && !cellEq(v, end)) grid[v.y][v.x] = State.FRONTIER;
                }
            }
        }
        statNodes.textContent = explored; statTime.textContent = (performance.now() - t0).toFixed(1); animRunning = false;
    }

    async function animatePath(path, speed) {
        for (const p of path) { if (!cellEq(p, start) && !cellEq(p, end)) grid[p.y][p.x] = State.PATH; draw(); await sleep(speed); }
    }

    async function runBFS() {
        animRunning = true; clearSearchMarks(); const speed = parseInt(speedInput.value);
        const q = [start]; const prev = new Map(); const seen = new Set([idx(start)]);
        let explored = 0; const t0 = performance.now();
        while (q.length) {
            const u = q.shift(); if (!cellEq(u, start) && !cellEq(u, end)) grid[u.y][u.x] = State.VISITED;
            draw(); await sleep(speed); explored++;
            if (cellEq(u, end)) {
                const path = []; let c = u; while (prev.has(idx(c))) { path.push(c); c = prev.get(idx(c)); }
                path.reverse(); await animatePath(path, speed);
                statNodes.textContent = explored; statPath.textContent = path.length; statTime.textContent = (performance.now() - t0).toFixed(1);
                animRunning = false; return;
            }
            for (const v of neighbors(u)) if (!seen.has(idx(v))) { seen.add(idx(v)); prev.set(idx(v), u); grid[v.y][v.x] = State.FRONTIER; q.push(v); }
        }
        statNodes.textContent = explored; statTime.textContent = (performance.now() - t0).toFixed(1); animRunning = false;
    }

    async function runDFS() {
        animRunning = true; clearSearchMarks(); const speed = parseInt(speedInput.value);
        const stack = [start]; const prev = new Map(); const seen = new Set([idx(start)]);
        let explored = 0; const t0 = performance.now();
        while (stack.length) {
            const u = stack.pop(); if (!cellEq(u, start) && !cellEq(u, end)) grid[u.y][u.x] = State.VISITED;
            draw(); await sleep(speed); explored++;
            if (cellEq(u, end)) {
                const path = []; let c = u; while (prev.has(idx(c))) { path.push(c); c = prev.get(idx(c)); }
                path.reverse(); await animatePath(path, speed);
                statNodes.textContent = explored; statPath.textContent = path.length; statTime.textContent = (performance.now() - t0).toFixed(1);
                animRunning = false; return;
            }
            for (const v of neighbors(u)) if (!seen.has(idx(v))) { seen.add(idx(v)); prev.set(idx(v), u); grid[v.y][v.x] = State.FRONTIER; stack.push(v); }
        }
        statNodes.textContent = explored; statTime.textContent = (performance.now() - t0).toFixed(1); animRunning = false;
    }

    function clearSearchMarks() {
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if ([State.FRONTIER, State.VISITED, State.PATH].includes(grid[r][c])) grid[r][c] = State.EMPTY;
        grid[start.y][start.x] = State.START; grid[end.y][end.x] = State.END; draw();
    }
    function clearWalls() { for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c] === State.WALL) grid[r][c] = State.EMPTY; grid[start.y][start.x] = State.START; grid[end.y][end.x] = State.END; draw(); }
    function resetAll() { makeGrid(); statNodes.textContent = statPath.textContent = statTime.textContent = 0; }

    document.getElementById('bfsBtn').onclick = () => { if (!animRunning) runBFS(); };
    document.getElementById('dfsBtn').onclick = () => { if (!animRunning) runDFS(); };
    document.getElementById('astarBtn').onclick = () => { if (!animRunning) runAstar(); };
    document.getElementById('clearBtn').onclick = () => { if (!animRunning) clearWalls(); };
    document.getElementById('resetBtn').onclick = () => { if (!animRunning) resetAll(); };

    gridRange.addEventListener('input', () => { COLS = parseInt(gridRange.value); gridLabel.textContent = `${COLS} x ${Math.max(10, Math.round(COLS * (canvas.height / canvas.width)))}`; makeGrid(); });

    window.addEventListener('keydown', e => { if (e.key === '1') runBFS(); if (e.key === '2') runDFS(); if (e.key === '3') runAstar(); });

    window.addEventListener('resize', resizeCanvas);

    setupMobile();
    resizeCanvas();
})();