import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResourceTableFeature } from "./ResourceTableFeature";

describe("ResourceTableFeature", () => {
  it("shows exactly three focused studio documents", () => {
    render(<ResourceTableFeature />);

    expect(screen.getByRole("heading", { name: "资料桌" })).toBeInTheDocument();
    expect(screen.getByText("工作室使用资料")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^查看/ })).toHaveLength(3);
    expect(screen.getByRole("button", { name: "查看使用帮助" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "查看心理危机与安全支持" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "查看知情同意书" })).toBeInTheDocument();
    expect(screen.queryByText(/访客留言册|呼吸|音乐|身体觉察/)).not.toBeInTheDocument();
  });

  it("uses the approved three-card illustration set for the catalog", () => {
    const { container } = render(<ResourceTableFeature />);

    expect(container.querySelectorAll('[data-resource-art="illustrated-card"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-resource-art="book-cover"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-resource-art="file-card"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-resource-art="document-icon"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-resource-art="botanical-corner"]')).toHaveLength(0);
  });

  it("keeps the full studio signature on the catalog and a compact brand on readers", () => {
    render(<ResourceTableFeature />);

    expect(screen.getByText("群心心理工作室")).toBeInTheDocument();
    expect(screen.getByText("STUDIO REFERENCE DESK")).toBeInTheDocument();
    expect(screen.getByText("使用帮助 · 安全支持 · 知情同意")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查看使用帮助" }));
    expect(screen.queryByText("STUDIO REFERENCE DESK")).not.toBeInTheDocument();
    expect(screen.getByLabelText("群心心理工作室")).toBeInTheDocument();
  });

  it("opens a document and returns to the catalog", () => {
    render(<ResourceTableFeature />);

    fireEvent.click(screen.getByRole("button", { name: "查看使用帮助" }));

    const reader = screen.getByRole("article", { name: "使用帮助" });
    expect(within(reader).getByRole("navigation", { name: "使用帮助目录" })).toBeInTheDocument();
    expect(within(reader).getByRole("heading", { name: "认识 Ling 和群心心理工作室" })).toBeInTheDocument();
    expect(within(reader).getByText(/采用 Apache-2.0 开源许可/)).toBeInTheDocument();
    expect(within(reader).getByText(/项目说明与咨询师扩展规范将在公开仓库开放后提供/)).toBeInTheDocument();
    expect(reader).not.toHaveTextContent(/github\.com\/Ling-Team\/Open-Ling/);
    expect(within(reader).getByText(/相关设计和内部测试不构成执业资质、临床验证或效果保证/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "返回资料目录" }));
    expect(screen.getByRole("button", { name: "查看使用帮助" })).toBeInTheDocument();
  });

  it("keeps session-management and letter guidance aligned with the implemented flow", () => {
    render(<ResourceTableFeature />);

    fireEvent.click(screen.getByRole("button", { name: "查看使用帮助" }));
    fireEvent.click(screen.getByRole("button", { name: "开始一场新咨询" }));
    expect(screen.getByText(/选择“开始新咨询”会先结束旧会谈并建立新会谈/)).toBeInTheDocument();
    expect(screen.queryByText(/开始新会谈不会改动旧会谈/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "承接过去理解" }));
    expect(screen.getByText("找到“新会谈承接同一咨询师的后台整理”")).toBeInTheDocument();
    expect(screen.getByText(/后台整理材料不是对你的事实定论/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "了解资料与模型边界" }));
    expect(screen.getByText(/不提供自有云同步、遥测或默认外部上传/)).toBeInTheDocument();
    expect(screen.getByText(/会加密本地会谈、来信、记忆和设置/)).toBeInTheDocument();
    expect(screen.getByText(/操作系统安全存储加密保存/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "遇到问题" }));
    expect(screen.getByText(/若页面仍显示咨询师正在写信/)).toBeInTheDocument();
    expect(screen.getByText(/图片需要选用支持视觉的模型/)).toBeInTheDocument();
    expect(screen.queryByText(/先确认 Ling 是否已经整理完这次咨询/)).not.toBeInTheDocument();
  });

  it("documents the current voice-input flow", () => {
    render(<ResourceTableFeature />);

    fireEvent.click(screen.getByRole("button", { name: "查看使用帮助" }));
    fireEvent.click(screen.getByRole("button", { name: "使用语音输入" }));

    expect(screen.getByRole("heading", { name: "使用语音输入" })).toBeInTheDocument();
    expect(screen.getByText(/识别结果只会写入输入框，不会自动发送/)).toBeInTheDocument();
    expect(screen.getByText(/安装包内置的离线中英文模型/)).toBeInTheDocument();
    expect(screen.getByText(/Ling 需要系统麦克风权限/)).toBeInTheDocument();
  });

  it("opens a concise crisis-support route with reality-first actions", () => {
    render(<ResourceTableFeature />);

    fireEvent.click(screen.getByRole("button", { name: "查看心理危机与安全支持" }));

    const reader = screen.getByRole("article", { name: "心理危机与安全支持" });
    expect(within(reader).getByRole("heading", { name: "心理危机与安全支持" })).toBeInTheDocument();
    expect(within(reader).queryByText("已核验资源")).not.toBeInTheDocument();
    expect(within(reader).queryByText("联系现实支持")).not.toBeInTheDocument();
    expect(within(reader).getByRole("heading", { name: "如果你担心自己或别人马上会受伤" })).toBeInTheDocument();
    expect(within(reader).getByText(/不要等待 Ling 或心理热线的回应/)).toBeInTheDocument();
    expect(within(reader).queryByText(/服药过量|中毒|暴力|威胁/)).not.toBeInTheDocument();
    expect(within(reader).getByLabelText("110 公安报警")).not.toHaveAttribute("href");
    expect(within(reader).getByLabelText("120 医疗急救")).not.toHaveAttribute("href");
    expect(reader.querySelector('a[href^="tel:"]')).not.toBeInTheDocument();

    fireEvent.click(within(reader).getByRole("button", { name: "如果现在真的很难熬" }));
    expect(within(reader).getByRole("heading", { name: "如果现在真的很难熬" })).toBeInTheDocument();
    expect(within(reader).getByRole("heading", { name: "现在就联系一个现实中的人" })).toBeInTheDocument();
    expect(within(reader).getByRole("heading", { name: "先和眼前的危险拉开距离" })).toBeInTheDocument();
    expect(within(reader).getByRole("heading", { name: "让陪伴者一起把安全放在前面" })).toBeInTheDocument();
    expect(within(reader).getByRole("heading", { name: "在等待现实帮助时照顾眼前一分钟" })).toBeInTheDocument();
    const selfHarmDetails = within(reader).getByText("现在就联系一个现实中的人").closest("details");
    expect(selfHarmDetails).not.toHaveAttribute("open");
    fireEvent.click(within(reader).getByText("现在就联系一个现实中的人"));
    expect(selfHarmDetails).toHaveAttribute("open");
    expect(within(reader).getByText(/如果说话很难，可以把这页给对方看/)).toBeInTheDocument();
    expect(within(reader).getByText(/只用于连接和等待现实帮助/)).toBeInTheDocument();
    expect(within(reader).getAllByText("更多做法")).toHaveLength(4);

    fireEvent.click(within(reader).getByText("先和眼前的危险拉开距离"));
    expect(within(reader).getByText(/不要自己携带、转移或处理危险物/)).toBeInTheDocument();
    expect(within(reader).getByText(/不要等待症状变化/)).toBeInTheDocument();

    fireEvent.click(within(reader).getByRole("button", { name: "中国大陆｜求助资源" }));
    expect(within(reader).getByText(/不能外呼、定位、报警或派出救援/)).toBeInTheDocument();

    fireEvent.click(within(reader).getByRole("button", { name: "不要把 Ling 当作紧急服务" }));
    expect(within(reader).getByRole("heading", { name: "不要把 Ling 当作紧急服务" })).toBeInTheDocument();
    expect(within(reader).getByText(/不能确认位置、拨号、报警、通知亲友或派出救援/)).toBeInTheDocument();
    expect(within(reader).queryByText(/高风险|中风险|低风险/)).not.toBeInTheDocument();
    expect(within(reader).queryByText("紧急服务负责现场救援；心理援助热线提供真人支持，但不能派出救援。")).not.toBeInTheDocument();
    expect(within(reader).getByText(/不能持续监测你是否安全或是否掉线/)).toBeInTheDocument();
    expect(within(reader).getByText(/任何回复也不代表已经完成专业风险评估/)).toBeInTheDocument();
  });

  it("shows one verified China resource list without a region selector", () => {
    render(<ResourceTableFeature />);

    fireEvent.click(screen.getByRole("button", { name: "查看心理危机与安全支持" }));
    fireEvent.click(screen.getByRole("button", { name: "中国大陆｜求助资源" }));

    expect(screen.getAllByText(/中国大陆/).length).toBeGreaterThan(0);

    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.getByLabelText("110 公安报警")).toBeInTheDocument();
    expect(screen.getByLabelText("120 医疗急救")).toBeInTheDocument();
    expect(screen.getByLabelText("12356 全国统一心理援助热线")).toBeInTheDocument();
    expect(screen.queryByLabelText(/北京市心理援助热线/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/上海市心理热线/)).not.toBeInTheDocument();
    expect(screen.queryByText(/上海线下就医示例|宛平南路/)).not.toBeInTheDocument();
    expect(screen.getByText(/如果没有接通，或危险仍在升级/)).toBeInTheDocument();
    expect(screen.getByText(/心理援助热线提供真人支持，但不等同于现场紧急救援/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看国家卫生健康委关于 12356 的说明" })).toHaveAttribute("href", "https://www.nhc.gov.cn/yzygj/c100068/202412/49a1a65386cd4be582d4702fd0926ee8.shtml");
    expect(screen.queryByText(/香港地区|其他地区|\+852/)).not.toBeInTheDocument();
  });

  it("shares one branded reader layout and shows each document version", () => {
    const { container } = render(<ResourceTableFeature />);

    fireEvent.click(screen.getByRole("button", { name: "查看使用帮助" }));
    expect(screen.getByRole("article", { name: "使用帮助" })).toHaveClass("resource-document-reader");
    expect(container.querySelector(".resource-document-reader-layout")).toBeInTheDocument();
    expect(screen.getByLabelText("群心心理工作室")).toBeInTheDocument();
    expect(screen.getByLabelText("文档版本 2026.08.08")).toBeInTheDocument();
    expect(screen.getByText("版本 2026.08.08 · © 2026 Ling-Team")).toBeInTheDocument();
    expect(screen.queryByText("资料桌 · 工作室使用资料")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "返回资料目录" }));
    fireEvent.click(screen.getByRole("button", { name: "查看知情同意书" }));
    expect(screen.getByRole("article", { name: "完整知情同意书" })).toHaveClass("resource-document-reader");
    expect(container.querySelector(".resource-document-reader-layout")).toBeInTheDocument();
    expect(screen.getByLabelText("群心心理工作室")).toBeInTheDocument();
    expect(screen.getByLabelText("文档版本 2026.08.26")).toBeInTheDocument();
    expect(screen.getByText("版本 2026.08.26 · © 2026 Ling-Team")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "返回资料目录" }));
    fireEvent.click(screen.getByRole("button", { name: "查看心理危机与安全支持" }));
    expect(screen.getByRole("article", { name: "心理危机与安全支持" })).toHaveClass("resource-document-reader");
    expect(screen.getByRole("navigation", { name: "心理危机与安全支持目录" })).toBeInTheDocument();
    expect(screen.getByLabelText("群心心理工作室")).toBeInTheDocument();
    expect(screen.getByLabelText("文档版本 2026.07.31")).toBeInTheDocument();
    expect(screen.getByText("版本 2026.07.31 · © 2026 Ling-Team")).toBeInTheDocument();
  });

  it("opens the complete informed consent without implying confirmation", () => {
    render(<ResourceTableFeature />);

    fireEvent.click(screen.getByRole("button", { name: "查看知情同意书" }));

    const reader = screen.getByRole("article", { name: "完整知情同意书" });
    expect(within(reader).getByRole("heading", { name: "完整知情同意书" })).toBeInTheDocument();
    expect(within(reader).getByRole("heading", { name: "阅读说明" })).toBeInTheDocument();
    expect(within(reader).getByText(/Ling 是一个开源 AI 心理咨询 App/)).toBeInTheDocument();
    expect(within(reader).getByRole("navigation", { name: "完整知情同意书目录" })).toBeInTheDocument();
    expect(within(reader).getAllByRole("button", { name: /^第\d部分/ })).toHaveLength(8);
    expect(screen.queryByText(/已确认|确认完成/)).not.toBeInTheDocument();
    expect(screen.queryByText("编写与审阅记录")).not.toBeInTheDocument();
  });

  it("reads the informed consent one module at a time", () => {
    render(<ResourceTableFeature />);

    fireEvent.click(screen.getByRole("button", { name: "查看知情同意书" }));
    fireEvent.click(screen.getByRole("button", { name: "第1部分 你正在和谁进行咨询" }));

    expect(screen.getByText(/程灵｜人本—心理动力取向/)).toBeInTheDocument();
    expect(screen.getByText(/周舟｜焦点解决取向/)).toBeInTheDocument();
    expect(screen.getByText(/林乐水｜中国传统心性哲学取向/)).toBeInTheDocument();
    expect(screen.getByText(/借助中国传统心性哲学理解关系、责任、得失与人生变化/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "第2部分 AI 心理咨询可以怎样陪你" }));

    expect(screen.getByRole("heading", { name: "AI 心理咨询可以怎样陪你" })).toBeInTheDocument();
    expect(screen.getByText(/Ling 不能为你提供医学或精神科诊断、正式心理测评、心理治疗/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "下一页" }));
    expect(screen.getByRole("heading", { name: "一次会谈怎样进行" })).toBeInTheDocument();
  });

  it("keeps the full privacy and crisis boundaries reachable from the consent directory", () => {
    render(<ResourceTableFeature />);

    fireEvent.click(screen.getByRole("button", { name: "查看知情同意书" }));
    fireEvent.click(screen.getByRole("button", { name: "第6部分 关于隐私和会谈资料" }));
    expect(screen.getByText(/别人拿到本地数据库、备份或同步盘中的文件/)).toBeInTheDocument();
    expect(screen.getByText(/模型服务商是否保存、由自动系统或人员审查、用于改进或训练/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "第7部分 心理危机与不适合只依靠 Ling 的情况" }));
    expect(screen.getByText(/不能依靠它持续监测安全、确认你是谁或身处哪里、拨号、报警、通知亲友/)).toBeInTheDocument();
    expect(screen.getByText(/不代表现实中的联络或救援已经发生/)).toBeInTheDocument();
    expect(screen.getByText(/不要等待 Ling 的下一条回复/)).toBeInTheDocument();
    expect(screen.getByText(/中国可根据情况拨打 110 或 120/)).toBeInTheDocument();
    expect(screen.getByText(/中国大陆/)).toBeInTheDocument();
  });

  it("returns from the complete consent to the resource catalog", () => {
    render(<ResourceTableFeature />);

    fireEvent.click(screen.getByRole("button", { name: "查看知情同意书" }));
    fireEvent.click(screen.getByRole("button", { name: "返回资料目录" }));

    expect(screen.getByRole("button", { name: "查看知情同意书" })).toBeInTheDocument();
  });

  it.each([
    ["loading", "正在打开资料……"],
    ["empty", "这份资料没有可显示的内容。"],
    ["error", "资料读取失败，请稍后重试。"]
  ] as const)("renders the %s state with a catalog return path", (status, message) => {
    render(<ResourceTableFeature status={status} />);

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回资料目录" })).toBeInTheDocument();
  });
});
