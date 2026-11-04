const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { execFileSync } = require("node:child_process")

const root = path.resolve(__dirname, "..")
const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "sample-workflow-"))
const compiler = path.join(root, "node_modules", "typescript", "bin", "tsc")
const tsconfig = path.join(outputDirectory, "tsconfig.json")

fs.writeFileSync(tsconfig, JSON.stringify({
  extends: path.join(root, "tsconfig.app.json"),
  compilerOptions: {
    module: "commonjs",
    moduleResolution: "bundler",
    noEmit: false,
    outDir: path.join(outputDirectory, "compiled"),
    rootDir: root,
    tsBuildInfoFile: path.join(outputDirectory, "tsconfig.tsbuildinfo"),
    typeRoots: [path.join(root, "node_modules", "@types")],
    types: ["node"],
  },
  include: [path.join(__dirname, "verify-sample-workflow.ts")],
}))

try {
  execFileSync(process.execPath, [compiler, "--project", tsconfig], {
    cwd: root,
    stdio: "inherit",
  })

  require(path.join(outputDirectory, "compiled", "scripts", "verify-sample-workflow.js"))
} finally {
  fs.rmSync(outputDirectory, { recursive: true, force: true })
}
