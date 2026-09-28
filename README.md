# jsonmemory

**Remember an object and tell me what actually changed.**

> One small problem. One obvious API. Very little setup. Immediate value.

JSON diffs are noisy. Most of the time the real question is simpler:

> What meaningful values changed since the last time I saw this object?

```ts
import { memory } from "jsonmemory";

memory("checkout", data);       //  ✓ checkout stored

memory("checkout", updated);    //  prints exactly what changed:
```

```
checkout changed

user.plan
  "free" → "pro"

cart.items
  3 → 4

payment.status
  "pending" → "paid"
```

## Install

```bash
npm i jsonmemory
```

One call, zero configuration, zero dependencies.

## Usage

```ts
import { memory } from "jsonmemory";

const result = memory("user", user);
// =>
// {
//   changed: true,
//   first: false,
//   added:   [ { kind: "added", path: "full_name", to: "Eeza A" } ],
//   removed: [ { kind: "removed", path: "email", from: "a@b.c" } ],
//   modified:[ { kind: "modified", path: "user.plan", from: "free", to: "pro" } ],
//   entries: [...],
//   summary: "user changed\n ..."
// }
```

### Ignore noisy fields

```ts
memory("user", user, {
  ignore: ["updated_at", "last_seen", "request_id"],
});
```

### Storage modes

```ts
memory("user", data, { storage: "memory" });     // default — per-process
memory("user", data, { storage: ".jsonmemory" }); // persisted to .jsonmemory/memory.json

import { memory, configure, useStorage } from "jsonmemory";
configure({ adapter: myRedisAdapter });          // bring your own store
useStorage(".jsonmemory");                       // set a default directory
```

### Deep diff without storage

```ts
import { diff } from "jsonmemory";

diff(oldObject, newObject);
// => [{ kind: "modified", path: "user.plan", from: "free", to: "pro" }, ...]
```

## What you get

- deep comparison with dot-paths (`user.plan`, `cart.items[2].name`)
- array length changes as friendly counts (`cart.items: 3 → 4`)
- `added` / `removed` / `modified` groups plus one flat `entries` list
- ignore rules by leaf name or dotted path
- Dates, NaN, Map, Set, bigint all compare correctly (no false changes)
- file storage to survive process restarts
- zero runtime dependencies, ESM + CJS + `.d.ts`

## License

MIT
