import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor 目前只承载 Web 渲染层。主进程能力（加密 SQLite、文件读写、本地语音模型）
// 尚未迁移到移动端，所以这里不引入任何插件：移动端是「能进界面、但无本地持久化」的壳子。
// appId 与 electron-builder 的 cn.xiaoqunpsy.ling 保持一致。
const config: CapacitorConfig = {
  appId: "cn.xiaoqunpsy.ling",
  appName: "Ling",
  webDir: "dist"
};

export default config;
