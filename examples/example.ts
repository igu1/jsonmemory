import * as jm from "../src/index";

console.log("\x1b[90m$ npm i jsonmemory\n\x1b[0m");

console.log("\x1b[32m1. remember an object (first call stores it)\x1b[0m\n");
jm.memory("checkout", {
  user: { plan: "free", name: "Eeza" },
  cart: { items: ["item-1", "item-2", "item-3"] },
  payment: { status: "pending" },
  request_id: "req-9831",
}, { log: true });

console.log("\x1b[32m2. send updated data — see what actually changed\x1b[0m\n");
const result = jm.memory("checkout", {
  user: { plan: "pro", name: "Eeza" },
  cart: { items: ["item-1", "item-2", "item-3", "item-4"] },
  payment: { status: "paid" },
  request_id: "req-9871",
}, { log: true, ignore: ["request_id"] });

console.log("\x1b[32m3. result object\x1b[0m\n");
console.table(result.entries.map((e) => ({ kind: e.kind, path: e.path })));

console.log("\x1b[32m4. one-off deep diff\x1b[0m\n");
console.log(jm.diff(
  { a: 1, list: [{ x: 1, y: 2 }] },
  { a: 2, list: [{ x: 1, y: 3, z: 4 }] },
));
