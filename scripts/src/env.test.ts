import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateMtTradingCredentials } from "../../artifacts/api-server/src/helpers/mtCredentialsValidation.ts";
import { verifyCaptchaChallenge, createCaptchaChallenge } from "../../artifacts/api-server/src/helpers/captchaStore.ts";

describe("validateMtTradingCredentials", () => {
  it("requires all fields", () => {
    assert.equal(validateMtTradingCredentials({}), "MT4/MT5 account number is required");
    assert.equal(
      validateMtTradingCredentials({ accountNumber: "123" }),
      "Broker name is required",
    );
  });

  it("accepts valid credentials", () => {
    assert.equal(
      validateMtTradingCredentials({
        accountNumber: "12345678",
        broker: "IC Markets",
        serverName: "ICMarkets-Demo",
        tradingPassword: "secret123",
      }),
      null,
    );
  });
});

describe("captchaStore", () => {
  it("verifies correct answer once", () => {
    const { captchaToken, question } = createCaptchaChallenge();
    const answer = question.split(" + ").reduce((s, n) => s + Number(n), 0);
    assert.equal(verifyCaptchaChallenge(captchaToken, answer), true);
    assert.equal(verifyCaptchaChallenge(captchaToken, answer), false);
  });
});
