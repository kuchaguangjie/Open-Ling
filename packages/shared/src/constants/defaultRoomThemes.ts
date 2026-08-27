import type { RoomTheme } from "../types/roomTheme.js";

export const defaultRoomThemes: RoomTheme[] = [
  {
    id: "warm-study",
    name: "温暖书房",
    description: "适合日常倾诉、关系梳理和温柔陪伴。",
    tone: "暖白宣纸、茶色木纹、柔和书房光",
    accentColor: "#8a9c83",
    waitingText: "我在这里。我们可以慢慢说。"
  },
  {
    id: "cold-study",
    name: "清冷书房",
    description: "适合日常倾诉、关系梳理和自我探索。",
    tone: "米白、浅灰、低饱和蓝绿色",
    accentColor: "#6f9f9a",
    waitingText: "我在这里。你可以慢慢说。"
  },
  {
    id: "rainy-room",
    name: "雨夜咨询室",
    description: "更适合深度情绪表达，安静，有包裹感。",
    tone: "雾蓝、深灰绿、柔和暖光",
    accentColor: "#5c7d88",
    waitingText: "窗外有雨，我们不用急着整理好一切。"
  },
  {
    id: "white-room",
    name: "白色静室",
    description: "适合问题整理、自我觉察和冷静思考。",
    tone: "白色、浅灰、微冷中性色",
    accentColor: "#9aa6a3",
    waitingText: "先把此刻最清楚的一点放在这里。"
  }
];
