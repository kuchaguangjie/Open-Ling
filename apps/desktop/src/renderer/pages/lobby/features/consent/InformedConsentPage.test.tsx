import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSettingsStore } from "../../../../stores/settingsStore";
import { InformedConsentPage } from "./InformedConsentPage";

describe("InformedConsentPage", () => {
  it("需要用户主动确认后才能进入咨询", () => {
    const onConfirm = vi.fn();
    render(<InformedConsentPage onCancel={vi.fn()} onConfirm={onConfirm} />);

    expect(screen.getByRole("heading", { name: "完整知情同意书" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "开始之前，请完整了解这段 AI 心理咨询关系" })).toBeInTheDocument();
    expect(screen.getByText(/资料桌中会一直保留同一份完整知情同意书/)).toBeInTheDocument();
    expect(screen.queryByText(/上海啸群教育科技有限公司/)).not.toBeInTheDocument();
    expect(screen.getByText(/官方版本计划在完成发布检查后以 Apache-2.0 开源发布/)).toBeInTheDocument();
    expect(screen.getByText(/公开仓库目前仍在准备中/)).toBeInTheDocument();
    expect(screen.queryByText(/github\.com\/Ling-Team\/Open-Ling/)).not.toBeInTheDocument();
    expect(screen.getByText(/不是医疗、诊断、心理治疗/)).toBeInTheDocument();
    expect(screen.queryByText(/独立法律主体/)).not.toBeInTheDocument();
    expect(screen.getByText("版本 2026.08.26 · © 2026 Ling-Team")).toBeInTheDocument();

    const confirmButton = screen.getByRole("button", { name: "同意并进入咨询" });
    expect(confirmButton).toBeDisabled();

    const serviceAcknowledgement = screen.getByRole("checkbox", { name: /我已阅读并理解这份完整知情同意书/ });
    const dataAcknowledgement = screen.getByRole("checkbox", { name: /会谈记录默认保存在这台设备上/ });
    expect(serviceAcknowledgement).toHaveAccessibleName(/我已阅读并理解这份完整知情同意书/);
    expect(serviceAcknowledgement).not.toHaveAccessibleName(/成年人/);
    expect(serviceAcknowledgement).toHaveAccessibleName(/基于 AI 大语言模型的心理咨询/);
    expect(serviceAcknowledgement).toHaveAccessibleName(/由具备专业资质的真人提供的心理咨询、心理治疗、精神科诊疗或危机救援/);
    expect(dataAcknowledgement).toHaveAccessibleName(/不会通过 Ling 自有服务器传输/);
    expect(dataAcknowledgement).toHaveAccessibleName(/使用第三方模型 API 服务时/);
    expect(dataAcknowledgement).not.toHaveAccessibleName(/性与亲密关系|暴力|创伤经历/);

    fireEvent.click(serviceAcknowledgement);
    expect(confirmButton).toBeDisabled();
    fireEvent.click(dataAcknowledgement);
    expect(confirmButton).not.toBeDisabled();
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("允许暂不进入且不会默认勾选", () => {
    const onCancel = vi.fn();
    render(<InformedConsentPage onCancel={onCancel} onConfirm={vi.fn()} />);

    expect(screen.getByRole("checkbox", { name: /我已阅读并理解这份完整知情同意书/ })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /会谈记录默认保存在这台设备上/ })).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "暂不进入" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("使用完整的八章目录，并且不提供返回资料桌入口", () => {
    render(<InformedConsentPage onCancel={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getAllByRole("button", { name: /^第\d部分/ })).toHaveLength(8);
    fireEvent.click(screen.getByRole("button", { name: "第4部分 费用与用量" }));
    expect(screen.getByRole("heading", { name: "费用与用量" })).toBeInTheDocument();
    expect(screen.getByText(/Ling 官方发行方不收取软件下载费、咨询费、订阅费或使用费/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "第6部分 关于隐私和会谈资料" }));
    expect(screen.getByRole("heading", { name: "关于隐私和会谈资料" })).toBeInTheDocument();
    expect(screen.getByText(/别人拿到本地数据库、备份或同步盘中的文件/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /返回资料目录/ })).not.toBeInTheDocument();
  });

  it("英文模式下使用英文工作室品牌标签", () => {
    useSettingsStore.getState().updateLocale("en-US");
    render(<InformedConsentPage onCancel={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByLabelText("Qunxin Psychology Studio")).toBeInTheDocument();
    expect(screen.queryByLabelText("群心心理工作室")).not.toBeInTheDocument();
    const serviceAcknowledgement = screen.getByRole("checkbox", { name: /I have read and understood this full informed-consent document/ });
    const dataAcknowledgement = screen.getByRole("checkbox", { name: /session records are stored on this device/ });
    expect(serviceAcknowledgement).toHaveAccessibleName(/counseling based on AI large language models/);
    expect(serviceAcknowledgement).not.toHaveAccessibleName(/\badult\b/i);
    expect(dataAcknowledgement).toHaveAccessibleName(/third-party model API/);
    expect(dataAcknowledgement).not.toHaveAccessibleName(/sexuality|violence|trauma/i);
  });
});
