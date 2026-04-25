import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Guard for ADR-0008: lib/finance/** must not import from lib/db/** or
 * @prisma/client. We verify the ESLint flat config blocks such imports
 * by actually running ESLint against a temporary file staged into
 * lib/finance/ and asserting the rule fires.
 */
describe("ADR-0008 ESLint purity rule (lib/finance)", () => {
  const projectRoot = path.resolve(__dirname, "..", "..");
  const financeDir = path.join(projectRoot, "lib", "finance");
  const tmpFile = path.join(financeDir, "__adr_0008_probe__.ts");

  it("flags a forbidden import from @/lib/db/*", () => {
    mkdirSync(financeDir, { recursive: true });
    writeFileSync(
      tmpFile,
      `// temporary probe for ADR-0008 rule\nimport { something } from "@/lib/db/whatever";\nexport const x = something;\n`,
    );

    let output = "";
    let exitCode = 0;
    try {
      execFileSync(
        "npx",
        ["eslint", "--no-color", "--format", "json", tmpFile],
        { cwd: projectRoot, stdio: ["ignore", "pipe", "pipe"] },
      );
    } catch (err) {
      const e = err as { stdout?: Buffer; status?: number };
      output = e.stdout?.toString() ?? "";
      exitCode = e.status ?? 1;
    } finally {
      try {
        rmSync(tmpFile, { force: true });
      } catch {
        /* noop */
      }
    }

    expect(exitCode).toBeGreaterThan(0);
    expect(output).toContain("no-restricted-imports");
    expect(output).toContain("ADR-0008");
  }, 60_000);
});
