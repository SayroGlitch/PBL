#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#ifdef _WIN32
#include <windows.h>
#include <psapi.h>
double get_time_us() {
    LARGE_INTEGER freq, counter;
    QueryPerformanceFrequency(&freq);
    QueryPerformanceCounter(&counter);
    return (double)counter.QuadPart / freq.QuadPart * 1000.0;
}
size_t get_memory_kb() {
    PROCESS_MEMORY_COUNTERS pmc;
    GetProcessMemoryInfo(GetCurrentProcess(), &pmc, sizeof(pmc));
    return pmc.WorkingSetSize / 1024;
}
#else
#include <sys/resource.h>
#include <time.h>
double get_time_us() {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return ts.tv_sec * 1000000.0 + ts.tv_nsec / 1000.0;
}
size_t get_memory_kb() {
    struct rusage r;
    getrusage(RUSAGE_SELF, &r);
    return r.ru_maxrss;
}
#endif

#define MAX_V 5005
#define MAX_E 120010

typedef long long ll;
#define INF (1LL << 60)

int head[MAX_V];  // head[u] = index of first edge leaving u
int eto [MAX_E];  // destination of each edge
ll  ecap[MAX_E];  // capacity of each edge
int enxt[MAX_E];  // next edge from the same source node
int   edge_cnt = 0;

int   level[MAX_V];
int   cur  [MAX_V];
int   bfsq [MAX_V];

static inline void add_edge(int u, int v, ll c) {
    eto[edge_cnt] = v; ecap[edge_cnt] = c; enxt[edge_cnt] = head[u]; head[u] = edge_cnt++;
    eto[edge_cnt] = u; ecap[edge_cnt] = 0; enxt[edge_cnt] = head[v]; head[v] = edge_cnt++;
}

static int bfs(int s, int t, int n) {
    memset(level, -1, (n + 1) * sizeof(int));
    int front = 0, rear = 0;
    level[s] = 0;
    bfsq[rear++] = s;
    while (front < rear) {
        int u = bfsq[front++];
        int e;
        for (e = head[u]; e != -1; e = enxt[e]) {
            int v = eto[e];
            if (ecap[e] > 0 && level[v] < 0) {
                level[v] = level[u] + 1;
                bfsq[rear++] = v;
            }
        }
    }
    return level[t] >= 0;
}

static ll dfs(int u, int t, ll pushed) {
    if (u == t) return pushed;
    int *e;
    for (e = &cur[u]; *e != -1; *e = enxt[*e]) {
        int v = eto[*e];
        ll  c = ecap[*e];
        if (c > 0 && level[v] == level[u] + 1) {
            ll d = dfs(v, t, pushed < c ? pushed : c);
            if (d > 0) {
                ecap[*e]     -= d;
                ecap[*e ^ 1] += d;
                return d;
            }
        }
    }
    return 0;
}

static ll dinic(int s, int t, int n) {
    ll flow = 0, f;
    while (bfs(s, t, n)) {
        memcpy(cur, head, (n + 1) * sizeof(int));
        while ((f = dfs(s, t, INF)) > 0) flow += f;
    }
    return flow;
}

int main(int argc, char *argv[]) {
    FILE *in;

    if (argc >= 2) {
        in = fopen(argv[1], "r");
        if (!in) {
            fprintf(stderr, "Error: cannot open file '%s'\n", argv[1]);
            return 1;
        }
    } else {
        in = stdin;
    }

    memset(head, -1, sizeof(head));

    int n, m, s, t;
    if (fscanf(in, "%d %d %d %d", &n, &m, &s, &t) != 4) {
        fprintf(stderr, "Error: invalid input format\n");
        return 1;
    }

    int i;
    for (i = 0; i < m; i++) {
        int u, v; ll c;
        fscanf(in, "%d %d %lld", &u, &v, &c);
        add_edge(u, v, c);
    }

    if (in != stdin) fclose(in);

    double t0 = get_time_us();
    ll result = dinic(s, t, n);
    double t1 = get_time_us();

    size_t mem_kb = get_memory_kb();

    printf("Max Flow     : %lld\n",    result);
    printf("Time         : %.5f ms\n", t1 - t0);
    printf("Memory       : %zu KB\n",  mem_kb);
    printf("Edges (arcs) : %d\n",      edge_cnt);
    return 0;
}
