import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";
import { resetSettingsStore } from "../stores/settingsStore";

beforeEach(() => {
  resetSettingsStore();
});
