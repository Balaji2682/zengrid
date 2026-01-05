# Performance Benchmarking Suite

Automated performance tests to ensure ZenGrid meets performance targets.

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Initial Render (1K rows) | < 50ms | ✅ |
| Initial Render (10K rows) | < 75ms | ✅ |
| Initial Render (100K rows) | < 100ms | ✅ |
| Scroll FPS | ≥ 60 FPS | ✅ |
| Memory Usage (100K rows) | < 100MB | ✅ |
| Cell Update Latency | < 16ms | ✅ |
| Single Cell Update | < 10ms | ✅ |
| 100 Cell Updates | < 50ms | ✅ |
| Pool Reuse Rate | > 95% | ✅ |

## Running Benchmarks

### Run All Performance Tests

```bash
pnpm test:perf
```

### Run Specific Test Suite

```bash
# Render performance
pnpm test packages/core/test/performance/benchmarks.spec.ts -t "Render Performance"

# Scroll performance
pnpm test packages/core/test/performance/benchmarks.spec.ts -t "Scroll Performance"

# Memory usage
pnpm test packages/core/test/performance/benchmarks.spec.ts -t "Memory Usage"
```

### Run with Memory Profiling (Chrome only)

```bash
# Requires --expose-gc flag
node --expose-gc node_modules/.bin/jest packages/core/test/performance/benchmarks.spec.ts
```

## Test Suites

### 1. Render Performance

Tests initial render time for various dataset sizes:
- 1K rows: < 50ms
- 10K rows: < 75ms
- 100K rows: < 100ms

### 2. Scroll Performance

Simulates scrolling and measures FPS:
- Target: ≥ 60 FPS
- Minimum acceptable: ≥ 55 FPS

### 3. Memory Usage

Tests memory consumption:
- 100K rows: < 100MB
- Memory leak detection on destroy

### 4. Data Structure Performance

Tests core data structure operations:
- SparseMatrix: 10K writes < 50ms
- ColumnStore: 30K writes < 50ms

### 5. Cell Update Performance

Tests cell update latency:
- Single cell: < 10ms
- 100 cells: < 50ms

### 6. Cell Pool Performance

Tests DOM element recycling efficiency:
- Reuse rate: > 95%

### 7. Regression Tests

Ensures performance doesn't degrade over time:
- Max 20% degradation over 100 operations

## Performance Optimization Tips

### For Rendering

1. **Use Cell Pooling** (enabled by default)
2. **Minimize overdraw**: Set appropriate overscan values
3. **Use CSS transforms**: For GPU acceleration
4. **Batch updates**: Update multiple cells at once

### For Memory

1. **Choose appropriate storage**:
   - Sparse data: `SparseMatrix`
   - Dense data: `ColumnStore`

2. **Clear references**: Call `destroy()` when done

3. **Limit cell pool size**: Adjust `maxSize` option

### For Scroll Performance

1. **Use `requestAnimationFrame`**: For smooth updates
2. **Throttle scroll events**: Built into Grid class
3. **Minimize reflows**: Use transforms, not top/left

### For Data Operations

1. **Batch operations**: Group multiple changes
2. **Use typed arrays**: For numeric data (ColumnStore)
3. **Cache computed values**: Avoid redundant calculations

## Profiling

### Chrome DevTools

1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Interact with grid
5. Stop recording
6. Analyze flame chart

### Memory Profiling

1. Open DevTools Memory tab
2. Take heap snapshot before
3. Perform operations
4. Take heap snapshot after
5. Compare snapshots

### FPS Monitoring

Enable FPS meter in Chrome:
1. Open DevTools
2. Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows)
3. Type "Show frame"
4. Select "Show frame rendering stats"

## Continuous Integration

Performance tests run automatically on:
- Pull requests
- Main branch commits
- Nightly builds

### CI Performance Thresholds

Tests fail if:
- Any render target is missed by >20%
- FPS drops below 55
- Memory usage exceeds 120MB
- Pool reuse falls below 90%

## Benchmarking Best Practices

1. **Run multiple iterations**: Average results
2. **Warm up**: Discard first run (JIT compilation)
3. **Isolate tests**: One operation per test
4. **Use realistic data**: Match production scenarios
5. **Test on multiple devices**: Desktop, mobile, tablets
6. **Monitor long-term trends**: Track performance over releases

## Reporting Issues

If performance tests fail:

1. **Check environment**: CPU, memory, browser version
2. **Run locally**: Verify CI results
3. **Profile the code**: Identify bottleneck
4. **Create issue**: Include profiling data
5. **Compare versions**: Identify regression commit

## Future Improvements

- [ ] WebWorker performance tests
- [ ] Large dataset tests (1M+ rows)
- [ ] Mobile device testing
- [ ] Network latency simulation
- [ ] Stress testing (rapid updates)
- [ ] Real user monitoring (RUM) integration
