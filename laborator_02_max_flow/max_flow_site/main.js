// ============================================
// MAX FLOW ALGORITHMS
// ============================================

class Edge {
  constructor(from, to, rev, cap, edgeRef = null, isForward = false) {
    this.from = from;
    this.to = to;
    this.rev = rev;
    this.cap = cap;
    this.edgeRef = edgeRef;
    this.isForward = isForward;
  }
}

class BaseMaxFlowAlgorithm {
  constructor(n, events = {}) {
    this.n = n;
    this.adj = Array.from({ length: n }, () => []);
    this.events = events;
    this.saturatedEdges = new Set();
  }

  addEdge(u, v, c, edgeRef = null) {
    this.adj[u].push(new Edge(u, v, this.adj[v].length, c, edgeRef, true));
    this.adj[v].push(new Edge(v, u, this.adj[u].length - 1, 0, edgeRef, false));
  }

  async sleep(ms) {
    while (APP_STATE.pausat) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async highlightEdge(edge) {
    if (this.events.onPathHighlight) {
      this.events.onPathHighlight(edge, edge.from, edge.to);
    }
    await this.sleep(this.events.dfsDelay || 80);
  }

  async applyAugmentation(edge, amount) {
    edge.cap -= amount;
    this.adj[edge.to][edge.rev].cap += amount;

    if (edge.edgeRef) {
      if (edge.isForward) {
        edge.edgeRef.flux = (edge.edgeRef.flux || 0) + amount;
      } else {
        edge.edgeRef.flux = Math.max(0, (edge.edgeRef.flux || 0) - amount);
      }

      if (edge.edgeRef.flux >= edge.edgeRef.capacitate) {
        this.saturatedEdges.add(edge.edgeRef.id);
        if (this.events.onSaturatedEdge) this.events.onSaturatedEdge(edge.edgeRef);
      } else {
        this.saturatedEdges.delete(edge.edgeRef.id);
      }

      if (this.events.onFlowPush) {
        this.events.onFlowPush(edge.edgeRef);
      }
    }

    await this.sleep(this.events.dfsDelay || 80);
  }
}

class Dinic extends BaseMaxFlowAlgorithm {
  async bfs(s, t) {
    this.level = Array(this.n).fill(-1);
    const q = [s];
    this.level[s] = 0;
    if (this.events.onLayer) this.events.onLayer(this.level);
    await this.sleep(this.events.bfsDelay || 150);

    while (q.length) {
      const u = q.shift();
      for (const e of this.adj[u]) {
        if (e.cap > 0 && this.level[e.to] < 0) {
          this.level[e.to] = this.level[u] + 1;
          q.push(e.to);
          if (this.events.onLayer) this.events.onLayer(this.level, u, e.to);
          await this.sleep(this.events.bfsDelay || 150);
        }
      }
    }
    return this.level[t] >= 0;
  }

  async dfs(u, t, f) {
    if (!f) return 0;
    if (u === t) return f;

    for (; this.it[u] < this.adj[u].length; this.it[u]++) {
      const e = this.adj[u][this.it[u]];
      if (e.cap > 0 && this.level[e.to] === this.level[u] + 1) {
        await this.highlightEdge(e);
        const ret = await this.dfs(e.to, t, Math.min(f, e.cap));
        if (ret) {
          await this.applyAugmentation(e, ret);
          return ret;
        }
      }
    }
    return 0;
  }

  async maxFlow(s, t) {
    let flow = 0;
    while (await this.bfs(s, t)) {
      this.it = Array(this.n).fill(0);
      let pushed;
      while ((pushed = await this.dfs(s, t, 1e9)) > 0) {
        flow += pushed;
        if (this.events.onFlowTotal) this.events.onFlowTotal(flow);
      }
    }
    return flow;
  }
}

class FordFulkerson extends BaseMaxFlowAlgorithm {
  async dfs(u, t, f, visited) {
    if (u === t) return f;
    visited[u] = true;

    for (const e of this.adj[u]) {
      if (!visited[e.to] && e.cap > 0) {
        await this.highlightEdge(e);
        const ret = await this.dfs(e.to, t, Math.min(f, e.cap), visited);
        if (ret) {
          await this.applyAugmentation(e, ret);
          return ret;
        }
      }
    }
    return 0;
  }

  async maxFlow(s, t) {
    let flow = 0;
    let pushed = 0;

    do {
      const visited = Array(this.n).fill(false);
      pushed = await this.dfs(s, t, 1e9, visited);
      if (pushed > 0) {
        flow += pushed;
        if (this.events.onFlowTotal) this.events.onFlowTotal(flow);
      }
    } while (pushed > 0);

    return flow;
  }
}

class EdmondsKarp extends BaseMaxFlowAlgorithm {
  async bfs(s, t) {
    const parent = Array(this.n).fill(null);
    const level = Array(this.n).fill(-1);
    const q = [s];
    level[s] = 0;
    if (this.events.onLayer) this.events.onLayer(level);
    await this.sleep(this.events.bfsDelay || 150);

    while (q.length) {
      const u = q.shift();
      for (let i = 0; i < this.adj[u].length; i++) {
        const e = this.adj[u][i];
        if (e.cap > 0 && level[e.to] === -1) {
          level[e.to] = level[u] + 1;
          parent[e.to] = { from: u, index: i };
          q.push(e.to);
          if (this.events.onLayer) this.events.onLayer(level, u, e.to);
          await this.sleep(this.events.bfsDelay || 150);
          if (e.to === t) {
            return { parent, level };
          }
        }
      }
    }

    return { parent, level };
  }

  async maxFlow(s, t) {
    let flow = 0;

    while (true) {
      const { parent } = await this.bfs(s, t);
      if (!parent[t]) break;

      let bottleneck = Infinity;
      const path = [];
      for (let v = t; v !== s; v = parent[v].from) {
        const step = parent[v];
        const edge = this.adj[step.from][step.index];
        bottleneck = Math.min(bottleneck, edge.cap);
        path.push(edge);
      }

      path.reverse();
      for (const edge of path) {
        await this.highlightEdge(edge);
        await this.applyAugmentation(edge, bottleneck);
      }

      flow += bottleneck;
      if (this.events.onFlowTotal) this.events.onFlowTotal(flow);
    }

    return flow;
  }
}

class CapacityScaling extends BaseMaxFlowAlgorithm {
  getInitialDelta() {
    let maxCap = 0;
    for (const edges of this.adj) {
      for (const edge of edges) {
        if (edge.isForward) maxCap = Math.max(maxCap, edge.cap);
      }
    }

    let delta = 1;
    while (delta * 2 <= maxCap) delta *= 2;
    return delta;
  }

  async dfs(u, t, f, visited, delta) {
    if (u === t) return f;
    visited[u] = true;

    for (const e of this.adj[u]) {
      if (!visited[e.to] && e.cap >= delta) {
        await this.highlightEdge(e);
        const ret = await this.dfs(e.to, t, Math.min(f, e.cap), visited, delta);
        if (ret) {
          await this.applyAugmentation(e, ret);
          return ret;
        }
      }
    }
    return 0;
  }

  async maxFlow(s, t) {
    let flow = 0;
    let delta = this.getInitialDelta();

    while (delta >= 1) {
      let pushed = 0;
      do {
        const visited = Array(this.n).fill(false);
        pushed = await this.dfs(s, t, 1e9, visited, delta);
        if (pushed > 0) {
          flow += pushed;
          if (this.events.onFlowTotal) this.events.onFlowTotal(flow);
        }
      } while (pushed > 0);

      delta = Math.floor(delta / 2);
    }

    return flow;
  }
}

class PushRelabel extends BaseMaxFlowAlgorithm {
  async maxFlow(s, t) {
    const height = Array(this.n).fill(0);
    const excess = Array(this.n).fill(0);
    const nextEdge = Array(this.n).fill(0);

    height[s] = this.n;

    for (const e of this.adj[s]) {
      if (e.cap > 0) {
        const pushed = e.cap;
        await this.highlightEdge(e);
        await this.applyAugmentation(e, pushed);
        excess[s] -= pushed;
        excess[e.to] += pushed;
      }
    }

    const activeVertices = () =>
      Array.from({ length: this.n }, (_, i) => i).filter(
        (v) => v !== s && v !== t && excess[v] > 0
      );

    while (activeVertices().length > 0) {
      const u = activeVertices()[0];
      let pushed = false;

      for (; nextEdge[u] < this.adj[u].length; nextEdge[u]++) {
        const e = this.adj[u][nextEdge[u]];
        if (e.cap > 0 && height[u] === height[e.to] + 1) {
          const amount = Math.min(excess[u], e.cap);
          await this.highlightEdge(e);
          await this.applyAugmentation(e, amount);
          excess[u] -= amount;
          excess[e.to] += amount;
          pushed = true;
          if (u === s || u === t) break;
          if (excess[u] === 0) break;
        }
      }

      if (!pushed) {
        let minHeight = Infinity;
        for (const e of this.adj[u]) {
          if (e.cap > 0) minHeight = Math.min(minHeight, height[e.to]);
        }
        if (minHeight < Infinity) {
          height[u] = minHeight + 1;
          nextEdge[u] = 0;
        } else {
          nextEdge[u] = 0;
        }
        await this.sleep(this.events.dfsDelay || 80);
      }

    }

    const flow = this.adj[s]
      .filter((edge) => edge.isForward && edge.edgeRef)
      .reduce((sum, edge) => sum + (edge.edgeRef.flux || 0), 0);

    if (this.events.onFlowTotal) this.events.onFlowTotal(flow);
    return flow;
  }
}

function createMaxFlowAlgorithm(type, n, events = {}) {
  switch (type) {
    case 'ford-fulkerson':
      return new FordFulkerson(n, events);
    case 'edmonds-karp':
      return new EdmondsKarp(n, events);
    case 'push-relabel':
      return new PushRelabel(n, events);
    case 'capacity-scaling':
      return new CapacityScaling(n, events);
    case 'dinic':
    default:
      return new Dinic(n, events);
  }
}


// ============================================
// CONFIGURARE & CONSTANTE
// ============================================

// Image management
const PNG_IMAGES = [
  'pcpng/pc1.png', 'pcpng/pc2.png', 'pcpng/pc3.png', 'pcpng/pc4.png',
  'pcpng/pc5.png', 'pcpng/pc6.png', 'pcpng/pc7.png', 'pcpng/pc8.png',
  'pcpng/pc9.png', 'pcpng/pc10.png', 'pcpng/pc11.png', 'pcpng/pc13.png',
  'pcpng/pc14.png', 'pcpng/pc15.png', 'pcpng/pc16.png', 'pcpng/pc17.png',
  'pcpng/pc18.png'
];

async function preloadImages() {
  for (const imagePath of PNG_IMAGES) {
    if (!APP_STATE.imaginiIncarcate[imagePath]) {
      const img = new Image();
      img.src = imagePath;
      APP_STATE.imaginiIncarcate[imagePath] = new Promise((resolve) => {
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
      });
    }
  }
}

function assignRandomImagesToNodes(numNoduri) {
  APP_STATE.imaginiNoduri = {};
  for (let i = 0; i < numNoduri; i++) {
    const randomIdx = Math.floor(Math.random() * PNG_IMAGES.length);
    APP_STATE.imaginiNoduri[i] = PNG_IMAGES[randomIdx];
  }
}

function assignIpAddressesToNodes(numNoduri) {
  APP_STATE.ipAddressNoduri = {};
  const subnetSecondOctet = randomInt(16, 31);
  const subnetThirdOctet = randomInt(0, 254);

  for (let i = 0; i < numNoduri; i++) {
    APP_STATE.ipAddressNoduri[i] = `172.${subnetSecondOctet}.${subnetThirdOctet}.${i + 1}`;
  }
}

async function getImageForNode(nodeId) {
  const imgPath = APP_STATE.imaginiNoduri[nodeId];
  if (!imgPath || !APP_STATE.imaginiIncarcate[imgPath]) return null;
  return await APP_STATE.imaginiIncarcate[imgPath];
}

const APP_CONFIG = {
  MIN_NODURI: 2,
  MAX_NODURI: 25,
  MIN_CAPACITATE: 1,
  MAX_CAPACITATE: 20,
  VITEZA_BFS_MS: 150,
  VITEZA_DFS_MS: 80
};

const ALGORITHM_OPTIONS = {
  'ford-fulkerson': 'Ford-Fulkerson',
  dinic: 'Dinic',
  'edmonds-karp': 'Edmonds-Karp',
  'push-relabel': 'Push-Relabel',
  'capacity-scaling': 'Capacity Scaling'
};

function algorithmUsesBFS(type) {
  return ['dinic', 'edmonds-karp'].includes(type);
}

function algorithmUsesDFS(type) {
  return ['dinic', 'ford-fulkerson', 'capacity-scaling'].includes(type);
}

function getTraversalMode(type) {
  const usesBFS = algorithmUsesBFS(type);
  const usesDFS = algorithmUsesDFS(type);

  if (usesBFS && usesDFS) return 'bfs-dfs';
  if (usesBFS) return 'bfs';
  if (usesDFS) return 'dfs';
  return 'none';
}

const EXEMPLU_GRAFURI = {
  simple: {
    numarNoduri: 4,
    muchii: [
      { u: 0, v: 1, cap: 3 },
      { u: 0, v: 2, cap: 2 },
      { u: 1, v: 2, cap: 2 },
      { u: 1, v: 3, cap: 2 },
      { u: 2, v: 3, cap: 3 }
    ]
  },
  medium: {
    numarNoduri: 6,
    muchii: [
      { u: 0, v: 1, cap: 10 },
      { u: 0, v: 2, cap: 8 },
      { u: 1, v: 2, cap: 5 },
      { u: 1, v: 3, cap: 4 },
      { u: 2, v: 4, cap: 6 },
      { u: 3, v: 4, cap: 2 },
      { u: 3, v: 5, cap: 6 },
      { u: 4, v: 5, cap: 7 }
    ]
  },
  complex: {
    numarNoduri: 8,
    muchii: [
      { u: 0, v: 1, cap: 6 },
      { u: 0, v: 2, cap: 5 },
      { u: 1, v: 2, cap: 8 },
      { u: 1, v: 3, cap: 3 },
      { u: 2, v: 3, cap: 4 },
      { u: 2, v: 4, cap: 7 },
      { u: 3, v: 5, cap: 5 },
      { u: 3, v: 4, cap: 6 },
      { u: 4, v: 5, cap: 8 },
      { u: 4, v: 6, cap: 7 },
      { u: 5, v: 6, cap: 6 },
      { u: 5, v: 7, cap: 9 },
      { u: 6, v: 7, cap: 5 }
    ]
  }
};

// ============================================
// STARE GLOBALA
// ============================================
const APP_STATE = {
  mod: 'learn',
  selectedAlgorithm: 'dinic',
  grafCurent: null,
  numarNoduri: 0,
  execInCurs: false,
  pausat: false,
  pozitiiNoduri: null,
  vitezaAnimatie: 1,
  muchiiSaturate: [],
  muchieActivaId: null,
  fluxTotal: 0,
  numarBFS: 0,
  straturiBFS: [],
  bfsLayers: [],
  pasulCurent: 0,
  fazaAlgoritm: 'INIȚIALIZARE',
  imaginiNoduri: {},
  ipAddressNoduri: {},
  imaginiIncarcate: {},
  animationTime: 0,
  animationId: null,
  lastAnimationTimestamp: 0,
  frameIntervalMs: 1000 / 30,
  draggingNodeId: null,
  dragPointerId: null
};

// ============================================
// UTILITĂȚI
// ============================================
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getEdgeCapacity(muchie) {
  return muchie.capacitate ?? muchie.cap ?? 0;
}

function formatMB(value) {
  return `${value} MB`;
}

function getNodeTrafficStats(muchii, numNodes) {
  const stats = Array.from({ length: numNodes }, () => ({
    incoming: 0,
    outgoing: 0
  }));

  muchii.forEach((muchie) => {
    const flux = muchie.flux || 0;
    stats[muchie.u].outgoing += flux;
    stats[muchie.v].incoming += flux;
  });

  return stats.map((stat) => ({
    ...stat,
    total: stat.incoming + stat.outgoing
  }));
}

function buildGraphFromEdgeList(n, edgeList) {
  const g = createMaxFlowAlgorithm(APP_STATE.selectedAlgorithm, n);
  const muchii = edgeList.map((edge, index) => ({
    id: index,
    u: edge.u,
    v: edge.v,
    capacitate: getEdgeCapacity(edge),
    flux: edge.flux ?? 0
  }));

  muchii.forEach((muchie) => {
    g.addEdge(muchie.u, muchie.v, muchie.capacitate, muchie);
  });

  return [g, muchii];
}

function rebuildCurrentGraph(resetFlux = true) {
  if (!APP_STATE.grafCurent) return;

  const [, muchiiCurente] = APP_STATE.grafCurent;
  const edgeList = muchiiCurente.map((muchie) => ({
    u: muchie.u,
    v: muchie.v,
    capacitate: getEdgeCapacity(muchie),
    flux: resetFlux ? 0 : muchie.flux ?? 0
  }));

  APP_STATE.grafCurent = buildGraphFromEdgeList(APP_STATE.numarNoduri, edgeList);
}

function construiesteGraf(n, includeRandomEdges = true) {
  const muchii = [];
  const muchiiExistente = new Set();

  function adaugaMuchie(u, v, capacitate) {
    if (u === v || muchiiExistente.has(`${u}-${v}`)) return;
    muchii.push({ u, v, capacitate, flux: 0 });
    muchiiExistente.add(`${u}-${v}`);
  }

  // Path simplu de la source la sink
  for (let u = 0; u < n - 1; u++) {
    adaugaMuchie(u, u + 1, randomInt(6, APP_CONFIG.MAX_CAPACITATE));
  }

  // Muchii random intre noduri intermediare
  if (includeRandomEdges) {
    const probabilitateMuchie = n <= 8 ? 0.4 : n <= 15 ? 0.25 : 0.14;
    for (let u = 0; u < n; u++) {
      for (let v = u + 2; v < n; v++) {
        if (Math.random() < probabilitateMuchie) {
          const cap = randomInt(APP_CONFIG.MIN_CAPACITATE, APP_CONFIG.MAX_CAPACITATE);
          adaugaMuchie(u, v, cap);
        }
      }
    }
  }

  return buildGraphFromEdgeList(n, muchii);
}

function updateEdgesTableUI() {
  const tbody = document.getElementById('edges-tbody');
  if (!APP_STATE.grafCurent) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">Generați o rețea</td></tr>';
    return;
  }

  const edges = APP_STATE.grafCurent[1]; // muchiile
  tbody.innerHTML = edges
    .map((muchie) => {
      const capacitate = getEdgeCapacity(muchie);
      const statusStare = muchie.flux === capacitate ? 'Saturată' : 'Activă';
      return `<tr>
        <td>${muchie.u} -> ${muchie.v}</td>
        <td>${formatMB(capacitate)}</td>
        <td>${formatMB(muchie.flux)}</td>
        <td>${formatMB(capacitate - muchie.flux)}</td>
        <td>${statusStare}</td>
      </tr>`;
    })
    .join('');
}


function generateLayoutPositions(n, w, h) {
  const padding = 60;
  const noduri = [];

  // Source left, Sink right
  noduri[0] = { x: padding, y: h / 2 };
  noduri[n - 1] = { x: w - padding, y: h / 2 };

  // Distribute intermediate nodes
  if (n > 2) {
    const intermediar = n - 2;
    const coloane = Math.ceil(Math.sqrt(intermediar));
    const randuri = Math.ceil(intermediar / coloane);

    const xStart = padding + 120;
    const xEnd = w - padding - 120;
    const yStart = padding + 50;
    const yEnd = h - padding - 50;

    const xStep = coloane > 1 ? (xEnd - xStart) / (coloane - 1) : 0;
    const yStep = randuri > 1 ? (yEnd - yStart) / (randuri - 1) : 0;

    for (let i = 1; i < n - 1; i++) {
      const col = (i - 1) % coloane;
      const row = Math.floor((i - 1) / coloane);
      noduri[i] = {
        x: xStart + col * xStep,
        y: yStart + row * yStep
      };
    }
  }

  return noduri;
}

function getCanvasPointerPosition(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.clientWidth / rect.width;
  const scaleY = canvas.clientHeight / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

function findNodeAtPosition(position) {
  if (!APP_STATE.pozitiiNoduri) return null;

  const hitRadius = 34;
  for (let i = APP_STATE.pozitiiNoduri.length - 1; i >= 0; i--) {
    const nod = APP_STATE.pozitiiNoduri[i];
    const dx = position.x - nod.x;
    const dy = position.y - nod.y;
    if (Math.sqrt(dx * dx + dy * dy) <= hitRadius) {
      return i;
    }
  }

  return null;
}

function clampNodePosition(position, canvas) {
  const padding = 36;
  return {
    x: Math.min(canvas.clientWidth - padding, Math.max(padding, position.x)),
    y: Math.min(canvas.clientHeight - padding, Math.max(padding, position.y))
  };
}

function setupCanvasInteractions() {
  const canvas = document.getElementById('graph-canvas');
  if (!canvas) return;

  const finishDrag = () => {
    APP_STATE.draggingNodeId = null;
    APP_STATE.dragPointerId = null;
    canvas.style.cursor = 'grab';
  };

  canvas.addEventListener('pointerdown', (event) => {
    if (!APP_STATE.grafCurent) return;

    if (!APP_STATE.pozitiiNoduri) {
      drawGraph();
    }

    const pointerPosition = getCanvasPointerPosition(event, canvas);
    const nodeId = findNodeAtPosition(pointerPosition);
    if (nodeId === null) return;

    APP_STATE.draggingNodeId = nodeId;
    APP_STATE.dragPointerId = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = 'grabbing';
    event.preventDefault();
  });

  canvas.addEventListener('pointermove', (event) => {
    if (APP_STATE.draggingNodeId === null || APP_STATE.dragPointerId !== event.pointerId) {
      const pointerPosition = getCanvasPointerPosition(event, canvas);
      canvas.style.cursor = findNodeAtPosition(pointerPosition) === null ? 'default' : 'grab';
      return;
    }

    const pointerPosition = getCanvasPointerPosition(event, canvas);
    const clampedPosition = clampNodePosition(pointerPosition, canvas);
    APP_STATE.pozitiiNoduri[APP_STATE.draggingNodeId] = clampedPosition;
    drawGraph();
    event.preventDefault();
  });

  canvas.addEventListener('pointerup', (event) => {
    if (APP_STATE.dragPointerId === event.pointerId) {
      finishDrag();
    }
  });

  canvas.addEventListener('pointercancel', finishDrag);
  canvas.addEventListener('lostpointercapture', finishDrag);

  canvas.addEventListener('pointerleave', (event) => {
    if (APP_STATE.draggingNodeId !== null && APP_STATE.dragPointerId === event.pointerId) {
      canvas.style.cursor = 'grabbing';
    } else {
      canvas.style.cursor = 'grab';
    }
  });
}

// ============================================
// ANIMATION HELPERS - MOVING LIGHTS
// ============================================

function startAnimation() {
  if (APP_STATE.animationId) cancelAnimationFrame(APP_STATE.animationId);
  
  const animate = (timestamp = 0) => {
    if (!APP_STATE.lastAnimationTimestamp) {
      APP_STATE.lastAnimationTimestamp = timestamp;
    }

    const elapsed = timestamp - APP_STATE.lastAnimationTimestamp;
    if (elapsed >= APP_STATE.frameIntervalMs && APP_STATE.grafCurent) {
      APP_STATE.animationTime = (APP_STATE.animationTime + elapsed / 1000) % 2;
      APP_STATE.lastAnimationTimestamp = timestamp;
      drawGraph();
    }
    
    APP_STATE.animationId = requestAnimationFrame(animate);
  };
  
  APP_STATE.animationId = requestAnimationFrame(animate);
}

function stopAnimation() {
  if (APP_STATE.animationId) {
    cancelAnimationFrame(APP_STATE.animationId);
    APP_STATE.animationId = null;
  }
  APP_STATE.lastAnimationTimestamp = 0;
}

function drawMovingLights(ctx, x1, y1, x2, y2, muchie, bfsLayers) {
  const flow = muchie.flux || 0;
  const fromLevel = bfsLayers?.[muchie.u];
  const toLevel = bfsLayers?.[muchie.v];
  const isActiveBfsEdge =
    fromLevel !== undefined &&
    toLevel !== undefined &&
    fromLevel >= 0 &&
    toLevel >= 0 &&
    fromLevel < toLevel;

  if (!flow && !isActiveBfsEdge) return;

  const numLights = flow > 0 ? Math.min(6, Math.max(2, Math.ceil(flow / 3))) : 3;
  const animationOffset = (APP_STATE.animationTime * Math.max(APP_STATE.vitezaAnimatie, 0.2)) % 1;

  for (let i = 0; i < numLights; i++) {
    const phase = (animationOffset + i / numLights) % 1;
    
    const lightX = x1 + (x2 - x1) * phase;
    const lightY = y1 + (y2 - y1) * phase;
    const outerRadius = flow > 0 ? 8 : 6;
    const innerRadius = flow > 0 ? 3 : 2;
    const glowColor = flow > 0 ? 'rgba(99, 201, 149, 0.85)' : 'rgba(245, 209, 66, 0.85)';
    const midColor = flow > 0 ? 'rgba(99, 201, 149, 0.4)' : 'rgba(245, 209, 66, 0.35)';
    const coreColor = flow > 0 ? 'rgba(215, 255, 230, 0.95)' : 'rgba(255, 244, 160, 0.95)';

    const gradient = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, outerRadius);
    gradient.addColorStop(0, glowColor);
    gradient.addColorStop(0.5, midColor);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(lightX, lightY, outerRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = coreColor;
    ctx.beginPath();
    ctx.arc(lightX, lightY, innerRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGraph() {
  const canvas = document.getElementById('graph-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const ratio = window.devicePixelRatio || 1;

  canvas.width = w * ratio;
  canvas.height = h * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  ctx.fillStyle = '#13203a';
  ctx.fillRect(0, 0, w, h);

  if (!APP_STATE.grafCurent) return;

  const [g, muchii] = APP_STATE.grafCurent;
  const nodeTrafficStats = getNodeTrafficStats(muchii, APP_STATE.numarNoduri);

  // Generate/cache node positions
  if (!APP_STATE.pozitiiNoduri) {
    APP_STATE.pozitiiNoduri = generateLayoutPositions(APP_STATE.numarNoduri, w, h);
  }

  const noduri = APP_STATE.pozitiiNoduri;

  // Draw edges
  muchii.forEach((muchie) => {
    const capacitate = getEdgeCapacity(muchie);
    const from = noduri[muchie.u];
    const to = noduri[muchie.v];

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const offset = 30;

    const x1 = from.x + (offset * dx) / dist;
    const y1 = from.y + (offset * dy) / dist;
    const x2 = to.x - (offset * dx) / dist;
    const y2 = to.y - (offset * dy) / dist;

    // Determine color
    let color = '#8bc7e8';
    let width = 2.5;

    if (muchie.flux > 0) color = '#69c48d';
    if (APP_STATE.muchieActivaId === muchie.id) {
      color = '#d6c15a';
      width = 3.5;
    }
    if (muchie.flux === capacitate) {
      color = '#d96b6b';
      width = 3.5;
    }

    // Draw line with glow
    ctx.strokeStyle = color + '20';
    ctx.lineWidth = width + 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Draw main line
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Arrowhead
    const headlen = 14;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    // Flow label
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    ctx.fillStyle = '#0b1222';
    ctx.fillRect(midX - 38, midY - 12, 76, 24);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(midX - 38, midY - 12, 76, 24);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${muchie.flux}MB/${capacitate}MB`, midX, midY);
    
    drawMovingLights(ctx, x1, y1, x2, y2, muchie, APP_STATE.bfsLayers);
  });

  // Draw nodes with images
  for (let i = 0; i < APP_STATE.numarNoduri; i++) {
    const nod = noduri[i];
    const nodeSize = 32;
    const nodeStats = nodeTrafficStats[i];
    const isSource = i === 0;
    const isSink = i === APP_STATE.numarNoduri - 1;
    const isInactiveNode = !isSource && !isSink && nodeStats.total === 0;
    const nodeOpacity = isInactiveNode ? 0.7 : 1;

    // Draw background circle for image
    ctx.save();
    ctx.globalAlpha = nodeOpacity;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = isInactiveNode ? '#667085' : '#1f3152';
    ctx.beginPath();
    ctx.arc(nod.x, nod.y, nodeSize, 0, Math.PI * 2);
    ctx.fill();

    // Draw border with color based on node type
    ctx.shadowBlur = 0;
    let borderColor = '#8bc7e8';
    if (isSource) borderColor = '#52c7a5';
    if (isSink) borderColor = '#f2a65a';
    if (isInactiveNode) borderColor = '#9aa4b2';
    
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Draw image if available
    const imgPath = APP_STATE.imaginiNoduri[i];
    if (imgPath && APP_STATE.imaginiIncarcate[imgPath]) {
      APP_STATE.imaginiIncarcate[imgPath].then((img) => {
        if (img) {
          ctx.save();
          ctx.globalAlpha = nodeOpacity;
          if (isInactiveNode) {
            ctx.filter = 'grayscale(80%)';
          }
          ctx.beginPath();
          ctx.arc(nod.x, nod.y, nodeSize - 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, nod.x - nodeSize + 2, nod.y - nodeSize + 2, (nodeSize - 2) * 2, (nodeSize - 2) * 2);
          ctx.restore();
        }
      });
    }

    // Draw node number label on top
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(nod.x - 10, nod.y - 10, 20, 20);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(i, nod.x, nod.y);

    const ipLabel = APP_STATE.ipAddressNoduri[i];
    if (ipLabel) {
      ctx.fillStyle = isInactiveNode ? '#626973' : '#737b86';
      ctx.font = '600 8px Menlo';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ipLabel, nod.x, nod.y - nodeSize - 16);
    }

    if (isSource || isSink) {
      const badgeWidth = 96;
      const badgeHeight = 18;
      const badgeX = nod.x - badgeWidth / 2;
      const badgeY = nod.y + nodeSize + 8;
      const trafficLabel = isSource
        ? `Out: ${formatMB(nodeStats.outgoing)}`
        : `In: ${formatMB(nodeStats.incoming)}`;

      ctx.fillStyle = 'rgba(11, 18, 32, 0.88)';
      ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);
      ctx.strokeStyle = isSource ? '#52c7a5' : '#f2a65a';
      ctx.lineWidth = 1;
      ctx.strokeRect(badgeX, badgeY, badgeWidth, badgeHeight);
      ctx.fillStyle = '#ebf1ff';
      ctx.font = '600 10px Inter';
      ctx.fillText(trafficLabel, nod.x, badgeY + badgeHeight / 2);
    }
  }
}

function drawBFSLayers() {
  const canvas = document.getElementById('bfs-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const ratio = window.devicePixelRatio || 1;

  canvas.width = w * ratio;
  canvas.height = h * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  ctx.fillStyle = '#13203a';
  ctx.fillRect(0, 0, w, h);

  const traversalMode = getTraversalMode(APP_STATE.selectedAlgorithm);
  if (traversalMode === 'none') {
    return;
  }

  if (traversalMode === 'dfs') {
    ctx.fillStyle = '#a0a9c9';
    ctx.font = '14px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Acest algoritm folosește DFS pentru explorare.`, w / 2, h / 2 - 10);
    ctx.font = '12px Inter';
    ctx.fillText(`Muchia curentă: ${document.getElementById('current-edge')?.textContent || '—'}`, w / 2, h / 2 + 16);
    return;
  }

  if (!APP_STATE.bfsLayers || APP_STATE.bfsLayers.length === 0) {
    ctx.fillStyle = '#a0a9c9';
    ctx.font = '14px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BFS straturile vor apărea în timp real...', w / 2, h / 2);
    return;
  }

  const levels = APP_STATE.bfsLayers;
  const maxLevel = Math.max(...levels.filter(l => l >= 0), 0) + 1;
  
  if (maxLevel === 1 && levels[0] !== 0) {
    ctx.fillStyle = '#a0a9c9';
    ctx.font = '14px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Construiesc straturi BFS...', w / 2, h / 2);
    return;
  }

  const layerWidth = maxLevel > 0 ? w / maxLevel : w;
  const nodeRadius = 14;
  const nodeSpacing = 40;

  // Draw layer backgrounds
  for (let layer = 0; layer < maxLevel; layer++) {
    const layerX = layer * layerWidth;
    const bgColor = layer % 2 === 0 ? 'rgba(97, 150, 200, 0.08)' : 'rgba(88, 214, 160, 0.08)';
    ctx.fillStyle = bgColor;
    ctx.fillRect(layerX, 0, layerWidth, h);

    // Layer divider
    ctx.strokeStyle = 'rgba(97, 218, 251, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(layerX + layerWidth, 0);
    ctx.lineTo(layerX + layerWidth, h);
    ctx.stroke();

    // Layer label
    ctx.fillStyle = 'rgba(166, 214, 255, 0.6)';
    ctx.font = 'bold 11px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`L${layer}`, layerX + layerWidth / 2, 8);
  }

  // Group nodes by layer
  const nodesByLayer = Array.from({ length: maxLevel }, () => []);
  for (let i = 0; i < levels.length; i++) {
    if (levels[i] >= 0) {
      nodesByLayer[levels[i]].push(i);
    }
  }

  const nodePos = {};

  // Position nodes
  for (let layer = 0; layer < maxLevel; layer++) {
    const nodesInLayer = nodesByLayer[layer];
    const layerX = layer * layerWidth + layerWidth / 2;
    const totalHeight = (nodesInLayer.length - 1) * nodeSpacing + nodeRadius * 2;
    const startY = Math.max(nodeRadius + 30, (h - totalHeight) / 2);

    nodesInLayer.forEach((nodeId, idx) => {
      nodePos[nodeId] = {
        x: layerX,
        y: startY + idx * nodeSpacing
      };
    });
  }

  // Draw edges from BFS
  const [g, muchii] = APP_STATE.grafCurent;
  if (g && muchii) {
    muchii.forEach((muchie) => {
      if (!nodePos[muchie.u] || !nodePos[muchie.v]) return;

      const from = nodePos[muchie.u];
      const to = nodePos[muchie.v];

      const isSaturated = APP_STATE.muchiiSaturate.includes(muchie.id);

      // Draw connection
      ctx.strokeStyle = isSaturated ? 'rgba(255, 85, 85, 0.4)' : 'rgba(166, 214, 255, 0.25)';
      ctx.lineWidth = isSaturated ? 2.5 : 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      // Arrow
      if (isSaturated) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const headlen = 8;

        ctx.fillStyle = 'rgba(217, 107, 107, 0.6)';
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - headlen * Math.cos(angle - Math.PI / 6), to.y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(to.x - headlen * Math.cos(angle + Math.PI / 6), to.y - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }
    });
  }

  // Draw nodes
  for (let nodeId in nodePos) {
    const pos = nodePos[nodeId];
    const isSource = nodeId == 0;
    const isSink = nodeId == APP_STATE.numarNoduri - 1;

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = isSource ? '#52c7a5' : isSink ? '#f2a65a' : '#8bc7e8';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(139, 199, 232, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Text
    ctx.fillStyle = '#0b1222';
    ctx.font = 'bold 10px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(nodeId, pos.x, pos.y);
  }
}

// ====== EVENT HANDLERS & SETUP ======

function addAnimationClass(element, animName) {
  element.classList.remove(animName);
  void element.offsetWidth;
  element.classList.add(animName);
}

function addPulseEffect(element) {
  element.classList.add('pulse');
  setTimeout(() => element.classList.remove('pulse'), 600);
}

function updateTraversalVisibility() {
  const traversalContainer = document.getElementById('traversal-container');
  const traversalTitle = document.getElementById('traversal-title');
  const traversalCountItem = document.getElementById('traversal-count-item');
  const traversalCountLabel = document.getElementById('traversal-count-label');
  const traversalMode = getTraversalMode(APP_STATE.selectedAlgorithm);

  if (traversalContainer) {
    traversalContainer.style.display = traversalMode === 'none' ? 'none' : 'block';
  }

  if (traversalCountItem) {
    traversalCountItem.style.display = traversalMode === 'none' ? 'none' : 'flex';
  }

  if (traversalTitle) {
    if (traversalMode === 'bfs-dfs') {
      traversalTitle.textContent = 'Straturi BFS și Explorare DFS';
    } else if (traversalMode === 'bfs') {
      traversalTitle.textContent = 'Straturi BFS (Level Graph)';
    } else if (traversalMode === 'dfs') {
      traversalTitle.textContent = 'Explorare DFS';
    }
  }

  if (traversalCountLabel) {
    if (traversalMode === 'bfs-dfs' || traversalMode === 'bfs') {
      traversalCountLabel.textContent = 'BFS Nr:';
    } else if (traversalMode === 'dfs') {
      traversalCountLabel.textContent = 'DFS Nr:';
    }
  }
}

function setupModeTabs() {
  const modele = document.querySelectorAll('.mode-tabs button');
  modele.forEach((btn) => {
    btn.addEventListener('click', () => {
      modele.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      addPulseEffect(btn);
      switchMode(btn.dataset.mode);
    });
  });
}

function switchMode(mod) {
  APP_STATE.mod = mod;
  const learnMode = document.querySelector('#learn-mode');
  const freeMode = document.querySelector('#free-mode');

  if (mod === 'learn') {
    learnMode.classList.add('active');
    freeMode.classList.remove('active');
    addAnimationClass(learnMode, 'slideIn');
  } else {
    learnMode.classList.remove('active');
    freeMode.classList.add('active');
    addAnimationClass(freeMode, 'slideIn');
  }
}

function setupExampleButtons() {
  const exempluBtns = document.querySelectorAll('.example-btn');
  exempluBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.example;
      addPulseEffect(btn);
      loadExample(key);
      
      // Update active state
      exempluBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function loadExample(key) {
  const exemplu = EXEMPLU_GRAFURI[key];
  if (!exemplu) return;

  // Show loading state
  const narrativeBox = document.querySelector('.narrative-box');
  if (narrativeBox) {
    narrativeBox.textContent = 'Se încarcă exemplul...';
  }

  // Small delay for visual feedback
  setTimeout(() => {
    APP_STATE.grafCurent = buildGraphFromEdgeList(exemplu.numarNoduri, exemplu.muchii);
    APP_STATE.numarNoduri = exemplu.numarNoduri;
    APP_STATE.pozitiiNoduri = null;
    APP_STATE.execInCurs = false;
    APP_STATE.pausat = false;
    APP_STATE.draggingNodeId = null;
    APP_STATE.dragPointerId = null;
    APP_STATE.muchiiSaturate = [];
    APP_STATE.muchieActivaId = null;
    APP_STATE.fluxTotal = 0;
    APP_STATE.numarBFS = 0;
    APP_STATE.bfsLayers = [];
    APP_STATE.fazaAlgoritm = 'INIȚIALIZARE';
    
    // Assign random images to nodes
    assignRandomImagesToNodes(exemplu.numarNoduri);
    assignIpAddressesToNodes(exemplu.numarNoduri);

    updateEdgesTableUI();
    drawGraph();
    drawBFSLayers();
    
    // Update narrative
    if (narrativeBox) {
      narrativeBox.textContent = `Exemplu ${key} încărcat (${exemplu.numarNoduri} noduri, ${exemplu.muchii.length} muchii). Algoritm: ${ALGORITHM_OPTIONS[APP_STATE.selectedAlgorithm]}. Apasă Start pentru a executa.`;
    }
    
    updateControlButtons();
  }, 200);
}

function setupGenerateButton() {
  const genBtn = document.getElementById('generate-graph');
  if (genBtn) {
    genBtn.addEventListener('click', () => {
      const numInput = document.getElementById('num-vertices');
      const n = Math.min(APP_CONFIG.MAX_NODURI, Math.max(APP_CONFIG.MIN_NODURI, parseInt(numInput.value) || 5));
      addPulseEffect(genBtn);
      generateRandomGraph(n);
    });
  }
}

function setupAlgorithmSelect() {
  const select = document.getElementById('algorithm-select');
  if (!select) return;

  select.value = APP_STATE.selectedAlgorithm;
  select.addEventListener('change', (event) => {
    APP_STATE.selectedAlgorithm = event.target.value;
    updateTraversalVisibility();

    if (APP_STATE.grafCurent) {
      rebuildCurrentGraph(true);
      APP_STATE.muchiiSaturate = [];
      APP_STATE.fluxTotal = 0;
      APP_STATE.numarBFS = 0;
      APP_STATE.bfsLayers = [];
      drawGraph();
      drawBFSLayers();
      updateEdgesTableUI();
    }

    const narrativeBox = document.querySelector('.narrative-box');
    if (narrativeBox) {
      narrativeBox.textContent = `Algoritm selectat: ${ALGORITHM_OPTIONS[APP_STATE.selectedAlgorithm]}.`;
    }
  });
}

function generateRandomGraph(n) {
  const includeRandomEdges = document.getElementById('random-edges')?.checked ?? true;
  APP_STATE.grafCurent = construiesteGraf(n, includeRandomEdges);
  APP_STATE.numarNoduri = n;
  APP_STATE.pozitiiNoduri = null;
  APP_STATE.execInCurs = false;
  APP_STATE.pausat = false;
  APP_STATE.draggingNodeId = null;
  APP_STATE.dragPointerId = null;
  APP_STATE.muchiiSaturate = [];
  APP_STATE.muchieActivaId = null;
  APP_STATE.fluxTotal = 0;
  APP_STATE.numarBFS = 0;
  APP_STATE.bfsLayers = [];
  APP_STATE.fazaAlgoritm = 'INIȚIALIZARE';

  const [, muchii] = APP_STATE.grafCurent;

  assignRandomImagesToNodes(n);
  assignIpAddressesToNodes(n);
  
  updateEdgesTableUI();
  drawGraph();
  drawBFSLayers();
  
  const narrativeBox = document.querySelector('.narrative-box');
  if (narrativeBox) {
    narrativeBox.textContent = `Rețea generată: ${n} noduri, ${muchii.length} muchii. Algoritm: ${ALGORITHM_OPTIONS[APP_STATE.selectedAlgorithm]}. Apasă Start.`;
  }
  
  updateControlButtons();
}

function setupControlButtons() {
  const btnStart = document.getElementById('btn-start');
  const btnPause = document.getElementById('btn-pause');
  const btnReset = document.getElementById('btn-reset');
  const btnNext = document.getElementById('btn-next');

  btnStart?.addEventListener('click', () => {
    addPulseEffect(btnStart);
    startSimulation();
  });
  btnPause?.addEventListener('click', () => {
    addPulseEffect(btnPause);
    pauseSimulation();
  });
  btnReset?.addEventListener('click', () => {
    addPulseEffect(btnReset);
    resetSimulation();
  });
  btnNext?.addEventListener('click', () => {
    addPulseEffect(btnNext);
    nextStep();
  });
}

function setupSpeedSlider() {
  const speedSlider = document.getElementById('speed-slider');
  const speedValue = document.getElementById('speed-value');
  
  if (speedSlider) {
    speedSlider.addEventListener('input', (e) => {
      const speed = parseFloat(e.target.value);
      APP_STATE.vitezaAnimatie = speed;
      
      if (speedValue) {
        speedValue.textContent = speed.toFixed(1) + 'x';
      }
    });
  }
}

function startSimulation() {
  if (!APP_STATE.grafCurent) {
    updateExplanationPanel({
      status: 'Eroare: Niciun graf încărcat',
      narrative: 'Selectează un exemplu sau generează un graf înainte de execuție'
    });
    return;
  }

  rebuildCurrentGraph(true);

  APP_STATE.execInCurs = true;
  APP_STATE.pausat = false;
  APP_STATE.pasulCurent = 0;
  APP_STATE.numarBFS = 0;
  APP_STATE.fluxTotal = 0;
  APP_STATE.muchiiSaturate = [];
  APP_STATE.muchieActivaId = null;
  APP_STATE.bfsLayers = [];
  updateControlButtons();

  const btnPause = document.getElementById('btn-pause');
  if (btnPause) {
    btnPause.textContent = 'Pauză';
  }
  
  const narrativeBox = document.querySelector('.narrative-box');
  if (narrativeBox) {
    narrativeBox.textContent = `Pornește ${ALGORITHM_OPTIONS[APP_STATE.selectedAlgorithm]}...`;
  }

  const [g, muchii] = APP_STATE.grafCurent;
  const s = 0;
  const t = APP_STATE.numarNoduri - 1;

  // Setup event handlers
  g.events = {
    bfsDelay: Math.max(50, 150 / APP_STATE.vitezaAnimatie),
    dfsDelay: Math.max(20, 80 / APP_STATE.vitezaAnimatie),
    
    onLayer: (layers, fromU, toV) => {
      APP_STATE.fazaAlgoritm = 'BFS';
      APP_STATE.muchieActivaId = null;
      if (
        ['dinic', 'edmonds-karp'].includes(APP_STATE.selectedAlgorithm) &&
        fromU === undefined &&
        toV === undefined
      ) {
        APP_STATE.numarBFS++;
      }
      APP_STATE.bfsLayers = [...layers];
      drawGraph();
      drawBFSLayers();
      
      if (fromU !== undefined && toV !== undefined) {
        updateExplanationPanel({
          status: 'BFS: Explorare noduri',
          narrative: `BFS Iterația #${APP_STATE.numarBFS}: găsesc nodul ${toV} de la ${fromU}`
        });
      } else {
        updateExplanationPanel({
          status: 'BFS: Inițializare straturi',
          narrative: `Inițiez BFS #${APP_STATE.numarBFS} - sursa la nivel 0`
        });
      }
    },

    onPathHighlight: (edge, u, v) => {
      APP_STATE.fazaAlgoritm = 'DFS - Căutare cale';
      APP_STATE.muchieActivaId = edge.edgeRef?.id ?? null;
      if (!algorithmUsesBFS(APP_STATE.selectedAlgorithm) && algorithmUsesDFS(APP_STATE.selectedAlgorithm)) {
        APP_STATE.numarBFS++;
      }
      updateExplanationPanel({
        status: 'DFS: Explorare muchie',
        currentNode: u,
        currentEdge: `${u} -> ${v}`,
        bottleneck: edge.cap,
        narrative: `DFS explorează muchia ${u} -> ${v} (capacitate: ${edge.cap}, flux: ${edge.edgeRef?.flux || 0})`
      });
      drawGraph();
    },

    onSaturatedEdge: (edge) => {
      APP_STATE.muchieActivaId = edge.id;
      if (!APP_STATE.muchiiSaturate.includes(edge.id)) {
        APP_STATE.muchiiSaturate.push(edge.id);
      }
      
      APP_STATE.fazaAlgoritm = 'SATURARE';
      updateExplanationPanel({
        status: 'Muchie saturată',
        currentEdge: `${edge.u} -> ${edge.v}`,
        bottleneck: edge.flux,
        narrative: `Muchia ${edge.u} -> ${edge.v} este saturată (flux=${edge.flux}/${edge.capacitate})`
      });
      drawGraph();
    },

    onFlowPush: (edge) => {
      APP_STATE.muchieActivaId = edge.id ?? null;
      APP_STATE.muchiiSaturate = APP_STATE.grafCurent[1]
        .filter((muchie) => muchie.flux >= muchie.capacitate)
        .map((muchie) => muchie.id);
      updateExplanationPanel({
        status: 'DFS: Flux împins',
        currentEdge: `${edge.u} -> ${edge.v}`,
        bottleneck: edge.flux,
        narrative: `Flux adăugat pe ${edge.u} -> ${edge.v}: ${formatMB(edge.flux)} / ${formatMB(edge.capacitate)}`
      });
      updateEdgesTableUI();
    },

    onFlowTotal: (totalFlow) => {
      APP_STATE.fluxTotal = totalFlow;
      showStatistics(totalFlow);
      updateExplanationPanel({
        status: `BFS #${APP_STATE.numarBFS} complet`,
        narrative: `Flux total după BFS #${APP_STATE.numarBFS}: ${formatMB(totalFlow)}`
      });
      APP_STATE.muchieActivaId = null;
    }
  };

  // Execute algorithm
  const executeAsync = async () => {
    startAnimation(); // Start moving lights animation
    try {
      const maxFlow = await g.maxFlow(s, t);
      APP_STATE.fluxTotal = maxFlow;
      
      updateExplanationPanel({
        status: 'Algoritm complet',
        narrative: `Flux maxim final: ${formatMB(maxFlow)}`
      });
      
      showStatistics(maxFlow);
      drawGraph();
      drawBFSLayers();
    } catch (err) {
      updateExplanationPanel({
        status: 'Eroare execuție',
        narrative: `Eroare: ${err.message}`
      });
    } finally {
      APP_STATE.execInCurs = false;
      APP_STATE.muchieActivaId = null;
      updateControlButtons();
    }
  };

  executeAsync();
}

function pauseSimulation() {
  if (APP_STATE.execInCurs) {
    APP_STATE.pausat = !APP_STATE.pausat;
    const btnPause = document.getElementById('btn-pause');
    if (btnPause) {
      btnPause.textContent = APP_STATE.pausat ? 'Reluare' : 'Pauză';
    }
  }
  updateControlButtons();
}

function nextStep() {
  // Placeholder for future step-by-step implementation
  if (!APP_STATE.execInCurs) {
    updateExplanationPanel({
      status: 'Info',
      narrative: 'Execuție pas cu pas - în curs de implementare în Etapa 4'
    });
  }
}

function resetSimulation() {
  if (!APP_STATE.grafCurent) return;

  rebuildCurrentGraph(true);

  // Reset state
  APP_STATE.execInCurs = false;
  APP_STATE.pausat = false;
  APP_STATE.draggingNodeId = null;
  APP_STATE.dragPointerId = null;
  APP_STATE.muchiiSaturate = [];
  APP_STATE.muchieActivaId = null;
  APP_STATE.fluxTotal = 0;
  APP_STATE.numarBFS = 0;
  APP_STATE.bfsLayers = [];
  APP_STATE.pasulCurent = 0;
  APP_STATE.fazaAlgoritm = 'INIȚIALIZARE';
  APP_STATE.animationTime = 0;
  APP_STATE.lastAnimationTimestamp = 0;

  updateEdgesTableUI();
  drawGraph();
  drawBFSLayers();
  const btnPause = document.getElementById('btn-pause');
  if (btnPause) {
    btnPause.textContent = 'Pauză';
  }
  updateExplanationPanel({
    status: 'Reset - Gata pentru nou start',
    narrative: 'Graful a fost resetat. Apasă Start pentru o execuție nouă.'
  });
  updateControlButtons();
}

function updateExplanationPanel(data) {
  const phaseEl = document.getElementById('current-phase');
  const bfsEl = document.getElementById('bfs-count');
  const nodeEl = document.getElementById('current-node');
  const edgeEl = document.getElementById('current-edge');
  const bottleneckEl = document.getElementById('bottleneck');
  const totalFlowEl = document.getElementById('total-flow');

  if (phaseEl) phaseEl.textContent = data.status || APP_STATE.fazaAlgoritm || 'Așteptare';
  if (bfsEl) bfsEl.textContent = APP_STATE.numarBFS;
  if (nodeEl) nodeEl.textContent = data.currentNode ?? '—';
  if (edgeEl) edgeEl.textContent = data.currentEdge ?? '—';
  if (bottleneckEl) bottleneckEl.textContent = data.bottleneck ?? '—';
  if (totalFlowEl) totalFlowEl.textContent = formatMB(APP_STATE.fluxTotal || 0);

  const narrativeBox = document.querySelector('.narrative-box');
  if (narrativeBox) {
    const text = data.narrative || 'Inițializare algoritm - apasă Start pentru a începe.';
    narrativeBox.textContent = text;
    
    // Add animation
    narrativeBox.classList.remove('pulse');
    void narrativeBox.offsetWidth;
    narrativeBox.classList.add('pulse');
  }
}

function updateControlButtons() {
  const btnStart = document.getElementById('btn-start');
  const btnPause = document.getElementById('btn-pause');
  const btnNext = document.getElementById('btn-next');

  if (APP_STATE.execInCurs) {
    btnStart?.setAttribute('disabled', '');
    btnNext?.setAttribute('disabled', '');
    btnPause?.removeAttribute('disabled');
  } else {
    btnStart?.removeAttribute('disabled');
    btnNext?.removeAttribute('disabled');
    btnPause?.setAttribute('disabled', '');
  }
}

function showStatistics(flux) {
  const statsSection = document.getElementById('statistics-section');
  if (statsSection) {
    statsSection.style.display = 'block';
  }

  const statCards = document.querySelectorAll('.stat-card');
  if (statCards.length >= 4) {
    // Flux maxim
    const fluxCard = statCards[0].querySelector('.stat-value');
    if (fluxCard) fluxCard.textContent = formatMB(flux || 0);

    // BFS iterations
    const bfsCard = statCards[1].querySelector('.stat-value');
    if (bfsCard) bfsCard.textContent = APP_STATE.numarBFS;

    // Saturated edges
    const saturatedCard = statCards[2].querySelector('.stat-value');
    if (saturatedCard) saturatedCard.textContent = APP_STATE.muchiiSaturate.length;

    // Graph density
    if (APP_STATE.grafCurent && APP_STATE.numarNoduri > 0) {
      const [g, muchii] = APP_STATE.grafCurent;
      const totalEdges = muchii.length;
      const maxEdges = APP_STATE.numarNoduri * (APP_STATE.numarNoduri - 1);
      const density = totalEdges > 0 ? (totalEdges / maxEdges).toFixed(2) : '0.00';
      const densityCard = statCards[3].querySelector('.stat-value');
      if (densityCard) densityCard.textContent = density;
    }
  }

  // Update conclusion
  const conclusionBox = document.querySelector('.conclusion-box p');
  if (conclusionBox) {
    if (APP_STATE.numarBFS > 0) {
      conclusionBox.textContent = `Algoritmul Dinic a finalizat după ${APP_STATE.numarBFS} iterații BFS. Flux maxim: ${formatMB(flux)}. ${APP_STATE.muchiiSaturate.length} muchii sunt saturate.`;
    }
  }
}

// ====== INITIALIZATION ======

document.addEventListener('DOMContentLoaded', async () => {
  // Preload all PNG images
  await preloadImages();
  
  setupModeTabs();
  setupExampleButtons();
  setupGenerateButton();
  setupControlButtons();
  setupSpeedSlider();
  setupAlgorithmSelect();
  setupCanvasInteractions();
  updateTraversalVisibility();

  // Load first example
  loadExample('simple');

  // Set initial mode
  switchMode('learn');
  document.querySelector('[data-mode="learn"]')?.classList.add('active');

  window.addEventListener('resize', () => {
    APP_STATE.pozitiiNoduri = null;
    drawGraph();
    drawBFSLayers();
  });

  startAnimation();
});
