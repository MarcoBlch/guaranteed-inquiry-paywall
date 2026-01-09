# Performance Monitoring Guide

This guide explains how to monitor and optimize performance in the FastPass escrow platform (React + Supabase stack).

## Table of Contents

1. [Overview](#overview)
2. [Frontend Performance Monitoring](#frontend-performance-monitoring)
3. [Backend Performance Monitoring](#backend-performance-monitoring)
4. [Detecting N+1 Queries](#detecting-n1-queries)
5. [Performance Best Practices](#performance-best-practices)
6. [Tools & Utilities](#tools--utilities)

---

## Overview

Performance monitoring in a React + Supabase stack differs from traditional server-rendered frameworks like Ruby on Rails. Instead of tools like Bullet (N+1 detection) or Brakeman (security), we use:

- **Frontend**: React Performance Profiler, custom hooks, Browser DevTools
- **Backend**: Supabase Dashboard, Edge Function logs, custom performance utilities
- **Database**: Supabase Query Performance panel, pg_stat_statements

---

## Frontend Performance Monitoring

### 1. React Query DevTools (Recommended)

React Query DevTools helps detect query waterfalls, cache issues, and excessive refetches.

#### Installation

```bash
npm install @tanstack/react-query-devtools --save-dev
```

#### Setup

Add to `src/App.tsx`:

```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* Your app content */}
        <BrowserRouter>
          <Routes>{/* routes */}</Routes>
        </BrowserRouter>

        {/* Add DevTools - only renders in development */}
        <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
};
```

#### Using DevTools

1. Open your app in development mode (`npm run dev`)
2. Click the React Query icon in the bottom-right corner
3. Inspect:
   - **Query Keys**: See all active queries
   - **Query Status**: fresh, fetching, stale, inactive
   - **Cache Time**: When queries will be garbage collected
   - **Refetch Count**: How many times a query has refetched (high = potential issue)

**Red Flags**:
- Same query key appearing multiple times → Duplicate fetches
- Queries in "fetching" state for too long → Slow database queries
- High refetch counts → Unnecessary re-renders triggering refetches

### 2. Custom Performance Monitoring Hook

Use the `usePerformanceMonitor` hook for tracking component lifecycle and render performance.

#### Basic Usage

```tsx
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

const Dashboard = () => {
  const perf = usePerformanceMonitor('Dashboard', {
    trackRenders: true,
    logThreshold: 16, // Warn if render takes >16ms (60fps)
  });

  // Track user journey
  const loadData = async () => {
    perf.markStart('loadDashboardData');

    await Promise.all([
      loadMessages(),
      loadTransactions(),
      loadAnalytics(),
    ]);

    perf.markEnd('loadDashboardData'); // Logs total time
  };

  return <div>...</div>;
};
```

#### Console Output

```
[Perf] Dashboard mounted at 1234.56ms
[Perf] Dashboard render #1 took 12.34ms
[Perf Journey] Dashboard.loadDashboardData completed in 456.78ms
```

### 3. Query Performance Monitoring

Detect N+1 queries in frontend code using `useQueryPerformanceMonitor`.

#### Usage

```tsx
import { useQueryPerformanceMonitor } from '@/hooks/usePerformanceMonitor';

const Dashboard = () => {
  const queryMonitor = useQueryPerformanceMonitor('Dashboard');

  const loadMessages = async () => {
    // Track the query
    const messages = await queryMonitor.trackQuery('fetchMessages', async () => {
      const { data } = await supabase.from('messages').select('*').eq('user_id', user.id);
      return data;
    });

    // Log stats
    console.log(queryMonitor.getQueryStats());
  };
};
```

#### Console Output (N+1 Detected)

```
[Perf Query] Dashboard.fetchMessages took 45.23ms
[Perf Query] Dashboard.fetchMessages took 42.10ms
[Perf Query] Dashboard.fetchMessages took 43.67ms
[Perf N+1?] Dashboard.fetchMessages called 4 times. Latest: 43.67ms, Avg: 43.67ms. Consider batching or using Promise.all()
```

### 4. Browser Performance Tools

#### Chrome DevTools Performance Tab

1. Open DevTools → Performance tab
2. Record a session while navigating the app
3. Analyze:
   - **Long Tasks**: Yellow bars >50ms indicate blocking JavaScript
   - **Layout Shifts**: Visual changes causing reflows
   - **Network Waterfall**: Sequential vs parallel requests

#### React Profiler

```tsx
import { Profiler } from 'react';

const Dashboard = () => {
  const onRenderCallback = (
    id: string,
    phase: "mount" | "update",
    actualDuration: number
  ) => {
    if (actualDuration > 16) {
      console.warn(`Slow render: ${id} took ${actualDuration}ms during ${phase}`);
    }
  };

  return (
    <Profiler id="Dashboard" onRender={onRenderCallback}>
      {/* Your component */}
    </Profiler>
  );
};
```

---

## Backend Performance Monitoring

### 1. Supabase Dashboard

Navigate to **Database → Query Performance**:
- View slowest queries in real-time
- See query execution times, I/O stats
- Identify missing indexes

**Action Items**:
- Queries >100ms → Add indexes or optimize
- High row counts → Add `LIMIT` clauses
- Sequential scans → Add indexes on filter columns

### 2. Edge Function Logs

View logs in Supabase Dashboard → **Edge Functions → [Function Name] → Logs**

Look for:
- Execution time (shown at end of logs)
- Error rates
- Cold start times (first execution after idle)

### 3. Custom Performance Utilities

Use the `PerformanceMonitor` class in Edge Functions.

#### Basic Usage

```ts
import { PerformanceMonitor } from '../_shared/performanceMonitor.ts';

serve(async (req) => {
  const perf = new PerformanceMonitor('process-escrow-payment');
  perf.start();

  try {
    // Track database query
    const message = await perf.measure('insert-message', async () => {
      return await supabase.from('messages').insert({ ... }).single();
    });

    // Track Stripe API call
    const payment = await perf.measure('stripe-confirm', async () => {
      return await stripe.paymentIntents.retrieve(paymentIntentId);
    });

    perf.end(); // Logs total execution time
    perf.logSummary(); // Logs breakdown of all operations

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    perf.end();
    throw error;
  }
});
```

#### Console Output

```
[Perf] process-escrow-payment.insert-message: 45.23ms
[Perf] process-escrow-payment.stripe-confirm: 120.56ms
[Perf] process-escrow-payment total execution: 178.34ms
[Perf Summary] process-escrow-payment:
  insert-message: 1x, avg: 45.23ms, min: 45.23ms, max: 45.23ms
  stripe-confirm: 1x, avg: 120.56ms, min: 120.56ms, max: 120.56ms
```

---

## Detecting N+1 Queries

### What is an N+1 Query?

An N+1 query pattern occurs when you:
1. Fetch a list of items (1 query)
2. Loop through items and fetch related data for each (N queries)

**Example (BAD)**:

```tsx
// ❌ N+1 Query Pattern
const messages = await supabase.from('messages').select('*');

for (const message of messages) {
  // This runs a separate query for EACH message
  const { data: escrow } = await supabase
    .from('escrow_transactions')
    .select('*')
    .eq('message_id', message.id);
}
```

**Fixed (GOOD)**:

```tsx
// ✅ Single batch query
const messages = await supabase.from('messages').select('*');
const messageIds = messages.map(m => m.id);

// Fetch ALL escrow transactions in one query
const { data: escrowData } = await supabase
  .from('escrow_transactions')
  .select('*')
  .in('message_id', messageIds);

// Join on client side
const enrichedMessages = messages.map(msg => ({
  ...msg,
  escrow_transactions: escrowData.filter(e => e.message_id === msg.id)
}));
```

### Current N+1 Fixes in Dashboard.tsx

The Dashboard previously had an N+1 issue. **This has been fixed** (see lines 160-210):

```tsx
// ✅ Fixed: Parallel queries instead of N+1
const loadMessages = async () => {
  // 1. Fetch messages first
  const { data: messagesData } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', user.id);

  const messageIds = messagesData?.map(m => m.id) || [];

  // 2. Fetch related data in parallel (NOT in a loop)
  const [escrowResult, responsesResult] = await Promise.all([
    supabase.from('escrow_transactions').select('*').in('message_id', messageIds),
    supabase.from('message_responses').select('*').in('message_id', messageIds)
  ]);

  // 3. Join on client side
  const enrichedMessages = messagesData?.map(message => ({
    ...message,
    escrow_transactions: escrowResult.data?.filter(e => e.message_id === message.id) || [],
    message_responses: responsesResult.data?.filter(r => r.message_id === message.id) || []
  }));
};
```

### How to Detect N+1 Queries

1. **Use React Query DevTools**: Look for the same query key appearing multiple times in quick succession
2. **Check Network Tab**: See if multiple identical requests fire sequentially
3. **Use `useQueryPerformanceMonitor`**: Warns if same query runs >3 times
4. **Supabase Dashboard**: Check "Query Performance" for queries with high execution counts

---

## Performance Best Practices

### Frontend

1. **Use `Promise.all()` for parallel fetches**
   ```tsx
   // ✅ Good: Parallel
   await Promise.all([loadMessages(), loadTransactions()]);

   // ❌ Bad: Sequential
   await loadMessages();
   await loadTransactions();
   ```

2. **Memoize expensive computations**
   ```tsx
   const expensiveValue = useMemo(() => {
     return messages.reduce((acc, msg) => acc + msg.amount, 0);
   }, [messages]);
   ```

3. **Use `React.memo` for pure components**
   ```tsx
   const MessageCard = React.memo(({ message }: { message: Message }) => {
     return <div>{message.content}</div>;
   });
   ```

4. **Virtualize long lists**
   - For lists >100 items, use `react-window` or `react-virtualized`

5. **Code splitting for routes**
   ```tsx
   const Dashboard = lazy(() => import('./pages/Dashboard'));
   ```

### Backend (Edge Functions)

1. **Batch database queries**
   - Use `.in()` instead of loops with `.eq()`

2. **Use indexes on filter columns**
   ```sql
   CREATE INDEX idx_messages_user_id ON messages(user_id);
   CREATE INDEX idx_escrow_message_id ON escrow_transactions(message_id);
   ```

3. **Limit result sets**
   - Always use `.limit()` for lists
   - Add pagination for large datasets

4. **Use Supabase RPC for complex queries**
   - Create PostgreSQL functions for heavy aggregations
   - Reduces round-trips between Edge Function and database

5. **Cache static data**
   - Store config/lookup data in-memory for function duration
   - Avoid repeated database calls for unchanging data

### Database

1. **Add indexes for common filters**
   ```sql
   -- Check current indexes
   SELECT * FROM pg_indexes WHERE tablename = 'messages';

   -- Add index if missing
   CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
   ```

2. **Analyze slow queries**
   ```sql
   EXPLAIN ANALYZE SELECT * FROM messages WHERE user_id = '...';
   ```

3. **Use appropriate data types**
   - `uuid` for IDs (indexed by default)
   - `timestamptz` for dates
   - `jsonb` for structured data (supports GIN indexes)

---

## Tools & Utilities

### Installed Tools

- **@tanstack/react-query** (v5.56.2): Server state management
- **Browser Performance API**: Built-in timing utilities

### Custom Utilities

- **`usePerformanceMonitor`** (`src/hooks/usePerformanceMonitor.ts`): Component lifecycle tracking
- **`useQueryPerformanceMonitor`** (`src/hooks/usePerformanceMonitor.ts`): N+1 detection
- **`PerformanceMonitor`** (`supabase/functions/_shared/performanceMonitor.ts`): Edge Function timing

### Recommended Additions

1. **React Query DevTools** (not installed)
   ```bash
   npm install @tanstack/react-query-devtools --save-dev
   ```

2. **Sentry** (optional, for production monitoring)
   - Real User Monitoring (RUM)
   - Performance tracking across user sessions

3. **Lighthouse CI** (optional, for CI/CD)
   - Automated performance audits on every deploy

---

## Quick Reference

### Performance Thresholds

- **Component Render**: <16ms (60fps)
- **Edge Function Total**: <500ms
- **Database Query**: <100ms
- **API Call (Stripe/Postmark)**: <1000ms
- **Page Load (LCP)**: <2.5s

### Common Performance Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| N+1 Queries | Multiple identical queries in Network tab | Batch with `.in()` or `Promise.all()` |
| Slow Renders | >16ms render time | Use `React.memo`, `useMemo`, `useCallback` |
| Waterfall Requests | Sequential network requests | Use `Promise.all()` for parallel fetches |
| Large Bundle | Slow initial load | Code splitting with `lazy()` |
| Missing Indexes | Slow database queries | Add indexes on filter/join columns |
| Excessive Re-renders | Component flashing/jank | Check dependency arrays in hooks |

---

## Monitoring Checklist

Before deploying changes:

- [ ] Check React Query DevTools for duplicate queries
- [ ] Run Lighthouse audit (Performance score >90)
- [ ] Check Network tab for waterfalls
- [ ] Verify database query times in Supabase Dashboard
- [ ] Test Edge Function execution times in logs
- [ ] Profile with React Profiler for render times
- [ ] Check bundle size (`npm run build` → check `dist/` folder)

---

## Troubleshooting

### "My Dashboard loads slowly"

1. Open React Query DevTools → Check if queries are running in parallel
2. Check Network tab → Look for sequential requests (waterfall)
3. Check Supabase Dashboard → Query Performance → Look for slow queries
4. Add indexes to filtered columns

### "Edge Function times out"

1. Check function logs → Identify slow operation
2. Add `PerformanceMonitor` to measure each step
3. Optimize database queries (add indexes, reduce data fetched)
4. Consider caching or moving heavy logic to database RPC

### "Too many re-renders"

1. Use React Profiler → Identify which component re-renders
2. Check dependency arrays in `useEffect`, `useMemo`, `useCallback`
3. Use `React.memo` to prevent unnecessary child re-renders
4. Verify state updates are necessary

---

## Resources

- [React Query DevTools Docs](https://tanstack.com/query/latest/docs/react/devtools)
- [Supabase Performance Guide](https://supabase.com/docs/guides/database/performance)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
- [Web Vitals](https://web.dev/vitals/)

---

**Last Updated**: 2026-01-09
