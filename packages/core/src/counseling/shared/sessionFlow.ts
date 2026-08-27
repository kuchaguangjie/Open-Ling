export const sessionFlowSteps = ["新建会谈", "进行会谈", "结束会谈", "生成总结", "确认记忆"] as const;

export type SessionFlowStep = (typeof sessionFlowSteps)[number];
