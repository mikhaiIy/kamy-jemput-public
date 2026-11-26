import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const ROOT = process.cwd()

function candidatePaths(filePath) {
  const candidates = [filePath]
  if (!path.extname(filePath)) {
    candidates.push(`${filePath}.ts`, `${filePath}.tsx`, `${filePath}.mjs`, `${filePath}.js`)
    candidates.push(path.join(filePath, "index.ts"), path.join(filePath, "index.tsx"))
  }
  return candidates
}

function resolveSourcePath(filePath) {
  return candidatePaths(filePath).find((candidate) => {
    try {
      return fs.statSync(candidate).isFile()
    } catch {
      return false
    }
  })
}

export async function resolve(specifier, context, defaultResolve) {
  let sourcePath
  if (specifier.startsWith("@/")) {
    sourcePath = resolveSourcePath(path.join(ROOT, specifier.slice(2)))
  } else if (specifier.startsWith(".")) {
    const parentPath = context.parentURL && fileURLToPath(context.parentURL)
    if (parentPath) {
      sourcePath = resolveSourcePath(path.resolve(path.dirname(parentPath), specifier))
    }
  }
  if (sourcePath) {
    return { shortCircuit: true, url: pathToFileURL(sourcePath).href }
  }
  return defaultResolve(specifier, context, defaultResolve)
}

export async function load(url, context, defaultLoad) {
  if (!url.endsWith(".ts") && !url.endsWith(".tsx")) {
    return defaultLoad(url, context, defaultLoad)
  }
  const source = fs.readFileSync(fileURLToPath(url), "utf8")
  const result = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      sourceMap: false,
    },
    fileName: fileURLToPath(url),
  })
  return { shortCircuit: true, format: "module", source: result.outputText }
}
