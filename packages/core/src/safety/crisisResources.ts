export interface CrisisResource {
  region: string;
  label: string;
  contact: string;
}

export const crisisResources: CrisisResource[] = [
  {
    region: "通用",
    label: "紧急危险",
    contact: "请立即联系当地紧急服务、医院或身边可信任的人。"
  }
];
