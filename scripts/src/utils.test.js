import { test } from "node:test";
import assert from "node:assert";
import { removeCodeFence } from "./utils.js";

test("removeCodeFence", async (t) => {
  await t.test("removes code fence", () => {
    let input = "```typescript\nlet x = 1;\n```";
    let expected = "let x = 1;";
    assert.strictEqual(removeCodeFence(input), expected);
  });

  await t.test("returns original string if no code fence", () => {
    let input = "let x = 1;";
    assert.strictEqual(removeCodeFence(input), input);
  });

  await t.test("handles different languages", () => {
    let input = "```javascript\nlet x = 1;\n```";
    let expected = "let x = 1;";
    assert.strictEqual(removeCodeFence(input), expected);
  });

  await t.test("handles empty code block", () => {
    let input = "```typescript\n```";
    let expected = "";
    assert.strictEqual(removeCodeFence(input), expected);
  });

  await t.test("handles multiple code fences, returning only the first", () => {
    let input =
      '```typescript\nlet x = 1;\n```\n```python\nprint("hello")\n```';
    let expected = "let x = 1;";
    assert.strictEqual(removeCodeFence(input), expected);
  });

  await t.test("handles incomplete code fence", () => {
    let input = "```typescript\nlet x = 1;";
    assert.strictEqual(removeCodeFence(input), input);
  });
});
