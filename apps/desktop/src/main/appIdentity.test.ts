import { describe, expect, it } from "vitest";
import {
  LING_CONTACT_EMAIL,
  LING_COPYRIGHT_NOTICE,
  LING_MAINTAINER,
  LING_PROJECT_RELEASE_STATUS
} from "./appIdentity";

describe("Ling app identity", () => {
  it("keeps the About panel focused on the Ling product identity", () => {
    expect(LING_MAINTAINER).toBe("维护团队 @Ling-Team");
    expect(LING_CONTACT_EMAIL).toBe("openling@xiaoqunpsy.cn");
    expect(LING_COPYRIGHT_NOTICE).toBe("© 2026 Ling-Team");
    expect(LING_PROJECT_RELEASE_STATUS).toBe("公开仓库准备中");
  });
});
