(function () {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    // Removed dark theme & collapse controls
    const gridRange = document.getElementById('gridRange');
    const gridLabel = document.getElementById('gridLabel');
    const speedInput = document.getElementById('speed');
    const statNodes = document.getElementById('statNodes');
    const statPath = document.getElementById('statPath');
    const statTime = document.getElementById('statTime');
    const progressBar = document.getElementById('progressBar');
    const progressInner = document.getElementById('progressInner');
    const progressPct = document.getElementById('progressPct');
    const algorithmStatus = document.getElementById('algorithmStatus');
    const canvasDims = document.getElementById('canvasDims');
    const canvasCoords = document.getElementById('canvasCoords');
    const algoButtons = [
        document.getElementById('bfsBtn'),
        document.getElementById('dfsBtn'),
        document.getElementById('astarBtn')
    ];
    let COLS = parseInt(gridRange.value);
    // Logical (CSS pixel) dimensions independent of backing store (for HiDPI clarity)
    let logicalWidth = canvas.clientWidth || 800;
    let logicalHeight = canvas.clientHeight || 600;
    let ROWS = Math.round(COLS * (logicalHeight / logicalWidth));
    let CELL = Math.floor(logicalWidth / COLS);
    const cellPadding = 0; // we will handle inset manually for non-empty cells

    const State = { EMPTY: 0, START: 1, END: 2, WALL: 3, FRONTIER: 4, VISITED: 5, PATH: 6 };

    let grid = [];
    // Offscreen canvas for static background (grid lines + base)
    let bgCanvas = document.createElement('canvas');
    let bgCtx = bgCanvas.getContext('2d');
    let start = { x: 2, y: 2 };
    let end = { x: COLS - 3, y: ROWS - 3 };
    let placing = 'wall';
    let mouseDown = false;
    let animRunning = false;
    // Theme handling
    const THEME_KEY = 'algopaint-theme';
    const themeSwitch = document.getElementById('themeSwitch');

    function applyStoredTheme() {
        const stored = localStorage.getItem(THEME_KEY);
        // Always start in light mode unless user explicitly stored 'dark'
        if (stored === 'dark') {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
    }

    function applyTheme(isDark) {
        if (isDark) document.body.classList.add('dark'); else document.body.classList.remove('dark');
        localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
        prerenderBackground();
        draw();
    }

    function toggleThemeFromSwitch() {
        const isDark = themeSwitch.checked;
        applyTheme(isDark);
    }

    applyStoredTheme();
    if (themeSwitch) {
        // Sync initial checked state
        themeSwitch.checked = document.body.classList.contains('dark');
        themeSwitch.addEventListener('change', toggleThemeFromSwitch);
    }
    // Removed system preference listener to keep deterministic initial light theme

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
        const container = canvas.parentElement;
        if (!container) return;
        const displayWidth = container.clientWidth;
        const displayHeight = container.clientHeight;
        logicalWidth = displayWidth;
        logicalHeight = displayHeight;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(displayWidth * dpr);
        canvas.height = Math.floor(displayHeight * dpr);
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scale drawing operations so we can use logical units
        bgCanvas.width = canvas.width;
        bgCanvas.height = canvas.height;
        bgCanvas.style.width = displayWidth + 'px';
        bgCanvas.style.height = displayHeight + 'px';
        bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        makeGrid();
    }

    // Dynamically adjust main layout to prevent text cutoff while keeping everything in viewport where possible
    function adjustLayoutHeights() {
        const mainGrid = document.getElementById('main-grid');
        if (!mainGrid) return;
        const headerEl = document.querySelector('header');
        const footerEl = document.querySelector('footer');
        const vh = window.innerHeight;
        const headerH = headerEl ? headerEl.getBoundingClientRect().height : 0;
        const footerH = footerEl ? footerEl.getBoundingClientRect().height : 0;
        const padding = 32; // body vertical padding + buffer
        const buffer = 8; // safety buffer to avoid clipping
        const target = vh - headerH - footerH - padding - buffer;
        if (target > 300) {
            mainGrid.style.minHeight = target + 'px';
            mainGrid.style.maxHeight = '';// allow expansion if needed
        } else {
            mainGrid.style.minHeight = '';
            mainGrid.style.maxHeight = '';
        }

        // Adjust side panels scroll area to fit inside
        const sidePanels = [document.getElementById('howto-grid'), document.getElementById('controls-container')];
        sidePanels.forEach(panel => {
            if (!panel) return;
            panel.style.maxHeight = (target - 12) + 'px';
        });
        resizeCanvas();
    }

    function updateGridLabel() {
        gridLabel.textContent = `${COLS} x ${ROWS}`;
    }

    function makeGrid() {
        ROWS = Math.max(10, Math.round(COLS * (logicalHeight / logicalWidth)));
        CELL = Math.max(3, Math.floor(logicalWidth / COLS));
        grid = new Array(ROWS);
        for (let r = 0; r < ROWS; r++) grid[r] = new Array(COLS).fill(State.EMPTY);
        start = { x: 2, y: 2 };
        end = { x: COLS - 3, y: ROWS - 3 };
        grid[start.y][start.x] = State.START;
        grid[end.y][end.x] = State.END;
        prerenderBackground();
        draw();
        updateCanvasMeta();
    }

    function prerenderBackground() {
        // Draws static background (empty cells + grid lines) once to offscreen buffer
        const styles = getComputedStyle(document.documentElement);
        const colorEmpty = styles.getPropertyValue('--color-empty')?.trim() || '#ffffff';
        const gridLine = '#e2e8f0';
        bgCtx.clearRect(0, 0, logicalWidth, logicalHeight);
        bgCtx.fillStyle = colorEmpty;
        bgCtx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
        if (CELL >= 12) {
            bgCtx.save();
            bgCtx.strokeStyle = gridLine;
            bgCtx.lineWidth = 1;
            bgCtx.beginPath();
            for (let x = 0; x <= COLS; x++) {
                const px = Math.round(x * CELL) + 0.5;
                bgCtx.moveTo(px, 0);
                bgCtx.lineTo(px, ROWS * CELL);
            }
            for (let y = 0; y <= ROWS; y++) {
                const py = Math.round(y * CELL) + 0.5;
                bgCtx.moveTo(0, py);
                bgCtx.lineTo(COLS * CELL, py);
            }
            bgCtx.stroke();
            bgCtx.restore();
        }
    }

    function draw() {
        const styles = getComputedStyle(document.documentElement);
        const colorEmpty = styles.getPropertyValue('--color-empty')?.trim() || '#ffffff';
        const colorStart = styles.getPropertyValue('--color-start')?.trim() || '#16a34a';
        const colorEnd = styles.getPropertyValue('--color-end')?.trim() || '#dc2626';
        const colorWall = styles.getPropertyValue('--color-wall')?.trim() || '#475569';
        const colorFrontier = styles.getPropertyValue('--color-frontier')?.trim() || '#f59e0b';
        const colorVisited = styles.getPropertyValue('--color-visited')?.trim() || '#60a5fa';
        const colorPath = styles.getPropertyValue('--color-path')?.trim() || '#2563eb';

        ctx.clearRect(0, 0, logicalWidth, logicalHeight);
        // Draw cached background
        ctx.drawImage(bgCanvas, 0, 0, logicalWidth, logicalHeight, 0, 0, logicalWidth, logicalHeight);

        function fillRoundedCell(c, r, color, insetFactor = 0.1) {
            const inset = Math.min(3, CELL * insetFactor);
            const x = c * CELL + inset;
            const y = r * CELL + inset;
            const size = CELL - inset * 2;
            if (size <= 0) return;
            const radius = Math.min(size * 0.3, 6);
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + size - radius, y);
            ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
            ctx.lineTo(x + size, y + size - radius);
            ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
            ctx.lineTo(x + radius, y + size);
            ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.fillStyle = color;
            ctx.fill();
        }

        // Pre-pass to gather path cells for outline layering
        const pathCells = [];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const s = grid[r][c];
                if (s === State.EMPTY) continue;
                let color = colorEmpty;
                switch (s) {
                    case State.START: color = colorStart; break;
                    case State.END: color = colorEnd; break;
                    case State.WALL: color = colorWall; break;
                    case State.FRONTIER: color = colorFrontier; break;
                    case State.VISITED: color = colorVisited; break;
                    case State.PATH: color = colorPath; break;
                }
                if (s === State.PATH) pathCells.push({ c, r, color, state: s });
                else {
                    if (CELL >= 6) {
                        fillRoundedCell(c, r, color, s === State.WALL ? 0.05 : 0.15);
                        if (s === State.WALL && CELL >= 14) {
                            // subtle wall texture diagonal
                            ctx.save();
                            ctx.strokeStyle = 'rgba(255,255,255,0.25)';
                            ctx.lineWidth = 1;
                            const baseX = c * CELL; const baseY = r * CELL;
                            ctx.beginPath();
                            ctx.moveTo(baseX + 2, baseY + CELL - 2);
                            ctx.lineTo(baseX + CELL - 2, baseY + 2);
                            ctx.stroke();
                            ctx.restore();
                        }
                    } else {
                        ctx.fillStyle = color;
                        ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
                    }
                }
            }
        }
        // Layer path cells above others with subtle shadow & outline
        if (pathCells.length) {
            for (const { c, r, color } of pathCells) {
                if (CELL >= 6) {
                    // shadow
                    ctx.save();
                    ctx.shadowColor = 'rgba(37,99,235,0.35)';
                    ctx.shadowBlur = Math.min(12, CELL * 0.8);
                    fillRoundedCell(c, r, color, 0.2);
                    ctx.restore();
                    // outline
                    const inset = Math.min(3, CELL * 0.2);
                    const x = c * CELL + inset;
                    const y = r * CELL + inset;
                    const size = CELL - inset * 2;
                    const radius = Math.min(size * 0.3, 6);
                    ctx.beginPath();
                    ctx.moveTo(x + radius, y);
                    ctx.lineTo(x + size - radius, y);
                    ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
                    ctx.lineTo(x + size, y + size - radius);
                    ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
                    ctx.lineTo(x + radius, y + size);
                    ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
                    ctx.lineTo(x, y + radius);
                    ctx.quadraticCurveTo(x, y, x + radius, y);
                    ctx.strokeStyle = 'rgba(30,58,138,0.6)';
                    ctx.lineWidth = 1.25;
                    ctx.stroke();
                } else {
                    ctx.fillStyle = color;
                    ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
                }
            }
        }

        // Distinct markers for start / end (rings)
        if (CELL >= 10) {
            function drawMarker(pt, fill, ring) {
                const cx = pt.x * CELL + CELL / 2;
                const cy = pt.y * CELL + CELL / 2;
                const radius = (CELL / 2) - 2;
                ctx.save();
                ctx.beginPath();
                ctx.fillStyle = fill;
                ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.lineWidth = Math.max(2, CELL * 0.12);
                ctx.strokeStyle = ring;
                ctx.globalAlpha = 0.9;
                ctx.beginPath();
                ctx.arc(cx, cy, radius * 0.9, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
            drawMarker(start, colorStart, 'rgba(16,185,129,0.85)');
            drawMarker(end, colorEnd, 'rgba(239,68,68,0.85)');
        }

        // Hover highlight cell (if coords known & not animRunning)
        if (hoverCell && !animRunning) {
            const { x, y } = hoverCell;
            if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
                const hx = x * CELL;
                const hy = y * CELL;
                ctx.save();
                ctx.strokeStyle = 'rgba(59,130,246,0.9)';
                ctx.lineWidth = 2;
                ctx.strokeRect(hx + 1, hy + 1, CELL - 2, CELL - 2);
                ctx.restore();
            }
        }
    }

    function updateCanvasMeta() {
        if (canvasDims) canvasDims.textContent = `${COLS}×${ROWS}`;
    }

    function posFromMouse(e) {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / CELL);
        const y = Math.floor((e.clientY - rect.top) / CELL);
        return { x: Math.min(COLS - 1, Math.max(0, x)), y: Math.min(ROWS - 1, Math.max(0, y)) };
    }

    let hoverCell = null;

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

    canvas.addEventListener('mousemove', e => {
        // Secondary listener to update hover cell & coords HUD
        const p = posFromMouse(e);
        hoverCell = p;
        if (canvasCoords) canvasCoords.textContent = `(${p.x},${p.y})`;
        if (!mouseDown) draw();
    });
    canvas.addEventListener('mouseleave', () => { hoverCell = null; if (canvasCoords) canvasCoords.textContent = ''; draw(); });

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

    function setActiveButton(btn) {
        algoButtons.forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
    }

    function resetProgress() {
        if (progressInner) progressInner.style.width = '0%';
        if (progressPct) progressPct.textContent = '0%';
    }

    function updateProgress(explored) {
        if (!progressInner) return;
        const total = COLS * ROWS;
        const pct = Math.min(100, ((explored / total) * 100)).toFixed(1);
        progressInner.style.width = pct + '%';
        if (progressPct) progressPct.textContent = pct + '%';
    }

    function setStatus(text) { if (algorithmStatus) algorithmStatus.textContent = text; }

    async function runAstar() {
        animRunning = true; clearSearchMarks(); resetProgress(); setStatus('A* running…'); const speed = parseInt(speedInput.value);
        const open = new Set(); const g = new Map(), f = new Map(), prev = new Map();
        function getG(p) { return g.get(idx(p)) ?? Infinity; } function getF(p) { return f.get(idx(p)) ?? Infinity; }
        open.add(idx(start)); g.set(idx(start), 0); f.set(idx(start), euclidean(start, end));
        let explored = 0; const t0 = performance.now();
        while (open.size) {
            const cur = [...open].map(i => ({ x: i % COLS, y: Math.floor(i / COLS) })).sort((a, b) => getF(a) - getF(b))[0];
            open.delete(idx(cur));
            if (!cellEq(cur, start) && !cellEq(cur, end)) grid[cur.y][cur.x] = State.VISITED;
            draw(); await sleep(speed); explored++; updateProgress(explored);
            if (cellEq(cur, end)) {
                const path = []; let c = cur; while (prev.has(idx(c))) { path.push(c); c = prev.get(idx(c)); }
                path.reverse(); await animatePath(path, speed);
                statNodes.textContent = explored; statPath.textContent = path.length; statTime.textContent = (performance.now() - t0).toFixed(1);
                animRunning = false; setStatus('Done'); return;
            }
            for (const v of neighbors(cur)) {
                const tentative = getG(cur) + euclidean(cur, v);
                if (tentative < getG(v)) {
                    prev.set(idx(v), cur); g.set(idx(v), tentative); f.set(idx(v), tentative + euclidean(v, end));
                    open.add(idx(v)); if (!cellEq(v, start) && !cellEq(v, end)) grid[v.y][v.x] = State.FRONTIER;
                }
            }
        }
        statNodes.textContent = explored; statTime.textContent = (performance.now() - t0).toFixed(1); animRunning = false; setStatus('No path');
    }

    async function animatePath(path, speed) {
        for (const p of path) { if (!cellEq(p, start) && !cellEq(p, end)) grid[p.y][p.x] = State.PATH; draw(); await sleep(speed); }
    }

    async function runBFS() {
        animRunning = true; clearSearchMarks(); resetProgress(); setStatus('BFS running…'); const speed = parseInt(speedInput.value);
        const q = [start]; const prev = new Map(); const seen = new Set([idx(start)]);
        let explored = 0; const t0 = performance.now();
        while (q.length) {
            const u = q.shift(); if (!cellEq(u, start) && !cellEq(u, end)) grid[u.y][u.x] = State.VISITED;
            draw(); await sleep(speed); explored++; updateProgress(explored);
            if (cellEq(u, end)) {
                const path = []; let c = u; while (prev.has(idx(c))) { path.push(c); c = prev.get(idx(c)); }
                path.reverse(); await animatePath(path, speed);
                statNodes.textContent = explored; statPath.textContent = path.length; statTime.textContent = (performance.now() - t0).toFixed(1);
                animRunning = false; setStatus('Done'); return;
            }
            for (const v of neighbors(u)) if (!seen.has(idx(v))) { seen.add(idx(v)); prev.set(idx(v), u); grid[v.y][v.x] = State.FRONTIER; q.push(v); }
        }
        statNodes.textContent = explored; statTime.textContent = (performance.now() - t0).toFixed(1); animRunning = false; setStatus('No path');
    }

    async function runDFS() {
        animRunning = true; clearSearchMarks(); resetProgress(); setStatus('DFS running…'); const speed = parseInt(speedInput.value);
        const stack = [start]; const prev = new Map(); const seen = new Set([idx(start)]);
        let explored = 0; const t0 = performance.now();
        while (stack.length) {
            const u = stack.pop(); if (!cellEq(u, start) && !cellEq(u, end)) grid[u.y][u.x] = State.VISITED;
            draw(); await sleep(speed); explored++; updateProgress(explored);
            if (cellEq(u, end)) {
                const path = []; let c = u; while (prev.has(idx(c))) { path.push(c); c = prev.get(idx(c)); }
                path.reverse(); await animatePath(path, speed);
                statNodes.textContent = explored; statPath.textContent = path.length; statTime.textContent = (performance.now() - t0).toFixed(1);
                animRunning = false; setStatus('Done'); return;
            }
            for (const v of neighbors(u)) if (!seen.has(idx(v))) { seen.add(idx(v)); prev.set(idx(v), u); grid[v.y][v.x] = State.FRONTIER; stack.push(v); }
        }
        statNodes.textContent = explored; statTime.textContent = (performance.now() - t0).toFixed(1); animRunning = false; setStatus('No path');
    }

    function clearSearchMarks() {
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if ([State.FRONTIER, State.VISITED, State.PATH].includes(grid[r][c])) grid[r][c] = State.EMPTY;
        grid[start.y][start.x] = State.START; grid[end.y][end.x] = State.END; draw();
    }
    function clearWalls() { for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c] === State.WALL) grid[r][c] = State.EMPTY; grid[start.y][start.x] = State.START; grid[end.y][end.x] = State.END; draw(); }
    function resetAll() { makeGrid(); statNodes.textContent = statPath.textContent = statTime.textContent = 0; resetProgress(); setStatus('Idle'); }

    document.getElementById('bfsBtn').onclick = (e) => { if (!animRunning) { setActiveButton(e.currentTarget); runBFS(); } };
    document.getElementById('dfsBtn').onclick = (e) => { if (!animRunning) { setActiveButton(e.currentTarget); runDFS(); } };
    document.getElementById('astarBtn').onclick = (e) => { if (!animRunning) { setActiveButton(e.currentTarget); runAstar(); } };
    document.getElementById('clearBtn').onclick = () => { if (!animRunning) clearWalls(); };
    document.getElementById('resetBtn').onclick = () => { if (!animRunning) resetAll(); };

    gridRange.addEventListener('input', () => { COLS = parseInt(gridRange.value); makeGrid(); updateGridLabel(); });

    window.addEventListener('keydown', e => {
        if (animRunning) return;
        if (e.key === '1') { setActiveButton(algoButtons[0]); runBFS(); }
        if (e.key === '2') { setActiveButton(algoButtons[1]); runDFS(); }
        if (e.key === '3') { setActiveButton(algoButtons[2]); runAstar(); }
    });

    // Theme & panel collapse logic removed for simplified static theme

    window.addEventListener('resize', adjustLayoutHeights);

    setupMobile();
    adjustLayoutHeights();
    // ensure the grid label is populated after initial layout
    updateGridLabel();
    updateCanvasMeta();
    // Fancy slider enhancement (fill & value bubble positioning)
    function enhanceSlider(el) {
        if (!el) return;
        const bubbleId = el.getAttribute('data-bubble');
        const bubble = bubbleId ? document.getElementById(bubbleId) : null;
        function update() {
            const min = parseFloat(el.min) || 0; const max = parseFloat(el.max) || 100; const val = parseFloat(el.value);
            const pct = ((val - min) / (max - min)) * 100;
            el.style.setProperty('--fill-pct', pct + '%');
            el.setAttribute('data-filled', '');
            if (bubble) {
                bubble.textContent = val;
                const rect = el.getBoundingClientRect();
                // approximate thumb center position inside wrapper
                const offset = pct / 100 * (el.offsetWidth - 0);
                bubble.style.left = offset + 'px';
            }
        }
        el.addEventListener('input', update);
        window.addEventListener('resize', update);
        update();
    }
    enhanceSlider(gridRange);
    enhanceSlider(speedInput);
    const scrollBtn = document.getElementById('scrollTopBtn');
    if (scrollBtn) scrollBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();