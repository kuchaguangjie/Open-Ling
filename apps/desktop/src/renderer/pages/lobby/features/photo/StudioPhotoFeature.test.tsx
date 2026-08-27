import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StudioPhotoFeature } from "./StudioPhotoFeature";

describe("StudioPhotoFeature", () => {
  it("可以依次切换并循环浏览三张合照", () => {
    render(<StudioPhotoFeature />);

    expect(screen.getByRole("img", { name: /围坐在圆桌旁交流/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "下一张合照" }));
    expect(screen.getByRole("img", { name: /并排坐在茶桌旁交谈/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "下一张合照" }));
    expect(screen.getByRole("img", { name: /肩并肩面对镜头微笑/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "下一张合照" }));
    expect(screen.getByRole("img", { name: /围坐在圆桌旁交流/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "上一张合照" }));
    expect(screen.getByRole("img", { name: /肩并肩面对镜头微笑/ })).toBeInTheDocument();
  });

  it("可以从分页点直接打开指定合照", () => {
    render(<StudioPhotoFeature />);

    fireEvent.click(screen.getByRole("button", { name: "查看下午茶合照" }));

    expect(screen.getByRole("img", { name: /并排坐在茶桌旁交谈/ })).toBeInTheDocument();
    expect(screen.getByText("当前照片 2 / 3")).toBeInTheDocument();
  });
});
