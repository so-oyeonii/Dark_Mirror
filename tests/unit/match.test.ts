import { describe, expect, it } from "vitest";
import { acceptInvitation, buildMatchReport, consentToFields, createInvitation, hashInvite, MATCH_TTL, pairSchema, revokePair, SAMPLE_A, SAMPLE_B, SAMPLE_PROFILES } from "@/lib/match";

const outsider = "c3333333-3333-4333-8333-333333333333";
describe("limited, mutually consented match domain", () => {
  async function accepted() {
    const invite = await createInvitation(SAMPLE_A, 1000);
    const pair = await acceptInvitation(invite.pair, invite.token, SAMPLE_B, 1001);
    if (!pair) throw new Error("accept failed");
    return { pair, token: invite.token };
  }
  it("persists only a random 256bit token hash with fixed 72h expiry", async () => {
    const { pair, token } = await createInvitation(SAMPLE_A, 1000);
    expect(token).toHaveLength(64);
    expect(pair.tokenHash).toBe(await hashInvite(token));
    expect(JSON.stringify(pair)).not.toContain(token);
    expect(pair.expiresAt).toBe(1000 + MATCH_TTL);
    expect((await createInvitation(SAMPLE_A, 1000)).token).not.toBe(token);
  });
  it("rejects bad, expired, self and already used invitations", async () => {
    const { pair, token } = await createInvitation(SAMPLE_A, 1000);
    expect(await acceptInvitation(pair, "0".repeat(64), SAMPLE_B, 1001)).toBeNull();
    expect(await acceptInvitation(pair, token, SAMPLE_A, 1001)).toBeNull();
    expect(await acceptInvitation(pair, token, SAMPLE_B, pair.expiresAt)).toBeNull();
    const next = await acceptInvitation(pair, token, SAMPLE_B, 1001);
    expect(await acceptInvitation(next!, token, outsider, 1002)).toBeNull();
  });
  it("requires party membership and both consents for whitelisted intersection only", async () => {
    let { pair } = await accepted();
    expect(consentToFields(pair, outsider, ["behavior"], 1002)).toBeNull();
    for (const fields of [["rawAnswers"], ["birthDate"], ["chat"], [], ["behavior", "behavior"]]) expect(consentToFields(pair, SAMPLE_A, fields, 1002)).toBeNull();
    pair = consentToFields(pair, SAMPLE_A, ["behavior", "mbti"], 1002)!;
    expect(buildMatchReport(pair, SAMPLE_A, SAMPLE_PROFILES, 1003)).toBeNull();
    pair = consentToFields(pair, SAMPLE_B, ["behavior"], 1003)!;
    const report = buildMatchReport(pair, SAMPLE_B, SAMPLE_PROFILES, 1004);
    expect(report?.behavior).toHaveLength(5);
    expect(report?.mbti).toBeNull();
    expect(buildMatchReport(pair, outsider, SAMPLE_PROFILES, 1004)).toBeNull();
    expect(buildMatchReport(pair, SAMPLE_A, SAMPLE_PROFILES, pair.expiresAt)).toBeNull();
    expect(JSON.stringify(report)).not.toMatch(/tokenHash|userId|birth|answers|chat/);
  });
  it("revocation closes report and blocks re-consent and token reuse", async () => {
    const setup = await accepted();
    let pair = setup.pair;
    const token = setup.token;
    pair = consentToFields(pair, SAMPLE_A, ["mbti"], 1002)!;
    pair = consentToFields(pair, SAMPLE_B, ["mbti"], 1003)!;
    expect(buildMatchReport(pair, SAMPLE_A, SAMPLE_PROFILES, 1004)?.mbti).not.toBeNull();
    expect(revokePair(pair, outsider)).toBeNull();
    pair = revokePair(pair, SAMPLE_B)!;
    expect(buildMatchReport(pair, SAMPLE_A, SAMPLE_PROFILES, 1005)).toBeNull();
    expect(consentToFields(pair, SAMPLE_A, ["behavior"], 1005)).toBeNull();
    expect(await acceptInvitation(pair, token, outsider, 1005)).toBeNull();
  });
  it("rejects forged consent membership and raw profile data", async () => {
    let { pair } = await accepted();
    expect(pairSchema.safeParse({ ...pair, consents: [{ userId: outsider, version: "limited-fields-v1", fields: ["behavior"], at: 1002 }] }).success).toBe(false);
    pair = consentToFields(pair, SAMPLE_A, ["behavior"], 1002)!;
    pair = consentToFields(pair, SAMPLE_B, ["behavior"], 1003)!;
    expect(() => buildMatchReport(pair, SAMPLE_A, { ...SAMPLE_PROFILES, [SAMPLE_A]: { ...SAMPLE_PROFILES[SAMPLE_A], birthDate: "2000-01-01" } as never }, 1004)).toThrow();
  });
});
