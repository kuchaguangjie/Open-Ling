/** Voice-gate scorers used by L0.5 instrumentValidation tests. */

const SEQ =
  /先.{0,24}((照顾|安顿|顾着).{0,24}(别人|他人)|(别人|他人).{0,24}(照顾|安顿|顾着)).{0,80}(轮到|转到|回到)自己/;
const ADVICE = /你应该|我建议你|我们下次做个练习/;
const STRONG =
  /一方面.{0,80}另一方面|一边.{0,80}另一边|一边.{0,80}一边|一面.{0,40}另一面|既(?!然).{0,40}也|既(?!然).{0,40}又|有一部分.{0,40}也有一部分|一部分的你.{0,40}(也有一部分|另一部分)|想.{0,30}也想/;
const POLE_OTHER = /别人|他人/;
const POLE_SELF = /自己|那我呢|我呢/;
const ADDITIVE =
  /同时|同样|都成立|都是真|都真实|两者都|两边都|也(想|希望|怕|要|重视|在意|需要|让|是真)/;
const CL_CLUSTER = /感受|经验|需要|感觉|卡住|空着|成形/;
const CL_LEAK = /改变的理由|维持现状|两边摊开/;
const LS_POS = /看见|觉察|此刻|余地/;
const LS_NEG = /你应该|作业|放下执着/;

/** MI two-sided reflection for 周舟 — not the old dual∧poles∧都成立 conjunction. */
export function zhouzhouTwoSidedBind(output: string): boolean {
  if (SEQ.test(output)) return false;
  if (ADVICE.test(output)) return false;
  if (STRONG.test(output)) return true;
  const poles = POLE_OTHER.test(output) && POLE_SELF.test(output);
  return poles && ADDITIVE.test(output);
}

export function chenglingVoiceGate(output: string): boolean {
  return CL_CLUSTER.test(output) && !CL_LEAK.test(output);
}

export function linleshuiVoiceGate(output: string): boolean {
  return LS_POS.test(output) && !LS_NEG.test(output);
}
