import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConsultationEntryChoice } from "./ConsultationEntryChoice";

describe("ConsultationEntryChoice", () => {
  it("未结束咨询只显示继续和新开两个选项", () => {
    render(
      <ConsultationEntryChoice
        counselorName="程灵"
        isBusy={false}
        kind="active"
        onCancel={vi.fn()}
        onPrimary={vi.fn()}
        onSecondary={vi.fn()}
      />
    );

    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "继续之前的咨询" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开启新咨询" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "返回选择咨询师" })).not.toBeInTheDocument();
  });

  it("尚未开始的草稿保留继续、取消和返回操作", () => {
    render(
      <ConsultationEntryChoice
        counselorName="程灵"
        isBusy={false}
        kind="draft"
        onCancel={vi.fn()}
        onPrimary={vi.fn()}
        onSecondary={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "返回选择咨询师" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "取消这次咨询" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "继续进入咨询室" })).toBeInTheDocument();
  });
});
