import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(process.cwd());
const hookPath = execFileSync("git", ["rev-parse", "--git-path", "hooks/post-merge"], {
  cwd: projectRoot,
  encoding: "utf8"
}).trim();
const markerStart = "# >>> Ling Dev automatic refresh >>>";
const markerEnd = "# <<< Ling Dev automatic refresh <<<";
const hookBlock = `${markerStart}
if [ "$(git symbolic-ref --quiet --short HEAD 2>/dev/null)" = "main" ]; then
  project_root="$(git rev-parse --show-toplevel)"
  mkdir -p "$project_root/tmp"
  log_path="$project_root/tmp/ling-dev-refresh.log"
  printf "Ling Dev automatic refresh started at %s\\n" "$(date '+%Y-%m-%d %H:%M:%S %z')" >"$log_path"
  printf "Source commit: %s\\n\\n" "$(git rev-parse HEAD)" >>"$log_path"
  nohup sh -c '
    npm --prefix "$1" run refresh:ling-dev
    status=$?
    printf "\\nLing Dev automatic refresh finished (exit %s)\\n" "$status"
    exit "$status"
  ' sh "$project_root" </dev/null >>"$log_path" 2>&1 &
  printf "Ling Dev automatic refresh started in background; see %s\\n" "$log_path" >&2
fi
${markerEnd}`;

let currentHook = existsSync(hookPath) ? readFileSync(hookPath, "utf8") : "#!/bin/sh\n";
const markerPattern = new RegExp(`${markerStart}[\\s\\S]*${markerEnd}`);
if (markerPattern.test(currentHook)) {
  currentHook = currentHook.replace(markerPattern, hookBlock);
} else {
  if (!currentHook.endsWith("\n")) currentHook += "\n";
  currentHook = `${currentHook}\n${hookBlock}\n`;
}
writeFileSync(hookPath, currentHook, "utf8");
chmodSync(hookPath, 0o755);

console.log(`已启用本地 main 自动刷新：${hookPath}`);
