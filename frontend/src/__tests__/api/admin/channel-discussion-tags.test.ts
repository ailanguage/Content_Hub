import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────
jest.mock("@/db", () => ({
  db: { select: jest.fn(), insert: jest.fn(), update: jest.fn() },
}));
jest.mock("@/lib/auth", () => ({
  getAuthFromCookies: jest.fn(),
}));

import { POST } from "@/app/api/admin/channels/route";
import { PATCH } from "@/app/api/admin/channels/[channelId]/route";
import { db } from "@/db";
import { getAuthFromCookies } from "@/lib/auth";

// ── Helpers ────────────────────────────────────────────────────────────────

function makePostReq(body: object) {
  return new NextRequest("http://localhost/api/admin/channels", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makePatchReq(body: object) {
  return new NextRequest("http://localhost/api/admin/channels/ch-1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const patchParams = { params: Promise.resolve({ channelId: "ch-1" }) };

function mockSelect(rows: any[]) {
  const limitMock = jest.fn().mockResolvedValue(rows);
  const whereMock = jest.fn().mockReturnValue({ limit: limitMock });
  const innerJoinMock = jest.fn().mockReturnValue({ where: whereMock });
  const fromMock = jest.fn().mockReturnValue({
    where: whereMock,
    limit: limitMock,
    innerJoin: innerJoinMock,
  });
  (db.select as jest.Mock).mockReturnValueOnce({ from: fromMock });
}

function mockInsert(returned: any[] = []) {
  const returningMock = jest.fn().mockResolvedValue(returned);
  const valuesMock = jest.fn().mockReturnValue({ returning: returningMock });
  (db.insert as jest.Mock).mockReturnValueOnce({ values: valuesMock });
}

function mockUpdate(returned: any[]) {
  const returningMock = jest.fn().mockResolvedValue(returned);
  const whereMock = jest.fn().mockReturnValue({ returning: returningMock });
  const setMock = jest.fn().mockReturnValue({ where: whereMock });
  (db.update as jest.Mock).mockReturnValueOnce({ set: setMock });
}

beforeEach(() => jest.clearAllMocks());

// ── POST: Discussion channel with required tag ─────────────────────────────

describe("POST /api/admin/channels — discussion channel with tag", () => {
  it("creates discussion channel with requiredTagId", async () => {
    (getAuthFromCookies as jest.Mock).mockResolvedValue({ userId: "a1", role: "admin" });
    mockSelect([]); // slug unique
    mockSelect([{ id: "tag-1" }]); // tag found
    const newChannel = {
      id: "ch-disc-tagged",
      name: "Private Discussion",
      slug: "private-discussion",
      type: "discussion",
      requiredTagId: "tag-1",
    };
    mockInsert([newChannel]);

    const res = await POST(makePostReq({
      name: "Private Discussion",
      type: "discussion",
      requiredTagId: "tag-1",
    }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.channel.requiredTagId).toBe("tag-1");
    expect(json.channel.type).toBe("discussion");
  });

  it("creates discussion channel without tag (no restriction)", async () => {
    (getAuthFromCookies as jest.Mock).mockResolvedValue({ userId: "a1", role: "admin" });
    mockSelect([]); // slug unique
    const newChannel = {
      id: "ch-disc-open",
      name: "Open Discussion",
      slug: "open-discussion",
      type: "discussion",
      requiredTagId: null,
    };
    mockInsert([newChannel]);

    const res = await POST(makePostReq({
      name: "Open Discussion",
      type: "discussion",
    }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.channel.requiredTagId).toBeNull();
  });

  it("returns 400 when tag not found for discussion channel", async () => {
    (getAuthFromCookies as jest.Mock).mockResolvedValue({ userId: "a1", role: "admin" });
    mockSelect([]); // slug unique
    mockSelect([]); // tag NOT found

    const res = await POST(makePostReq({
      name: "Private Discussion",
      type: "discussion",
      requiredTagId: "nonexistent-tag",
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/tag not found/i);
  });
});

// ── PATCH: Discussion channel tag update ────────────────────────────────────

describe("PATCH /api/admin/channels/[channelId] — discussion channel tag", () => {
  it("adds requiredTagId to existing discussion channel", async () => {
    (getAuthFromCookies as jest.Mock).mockResolvedValue({ userId: "a1", role: "admin" });
    mockSelect([{ id: "ch-1", isFixed: false, type: "discussion" }]); // channel
    mockSelect([{ id: "tag-1" }]); // tag found
    const updated = { id: "ch-1", type: "discussion", requiredTagId: "tag-1" };
    mockUpdate([updated]);

    const res = await PATCH(makePatchReq({ requiredTagId: "tag-1" }), patchParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.channel.requiredTagId).toBe("tag-1");
  });

  it("removes requiredTagId from discussion channel", async () => {
    (getAuthFromCookies as jest.Mock).mockResolvedValue({ userId: "a1", role: "admin" });
    mockSelect([{ id: "ch-1", isFixed: false, type: "discussion", requiredTagId: "tag-1" }]);
    const updated = { id: "ch-1", type: "discussion", requiredTagId: null };
    mockUpdate([updated]);

    const res = await PATCH(makePatchReq({ requiredTagId: null }), patchParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.channel.requiredTagId).toBeNull();
  });

  it("returns 400 when tag not found for discussion channel update", async () => {
    (getAuthFromCookies as jest.Mock).mockResolvedValue({ userId: "a1", role: "admin" });
    mockSelect([{ id: "ch-1", isFixed: false, type: "discussion" }]);
    mockSelect([]); // tag NOT found

    const res = await PATCH(makePatchReq({ requiredTagId: "nonexistent" }), patchParams);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/tag not found/i);
  });

  it("does not allow requiredTagId on special channels", async () => {
    (getAuthFromCookies as jest.Mock).mockResolvedValue({ userId: "a1", role: "admin" });
    mockSelect([{ id: "ch-1", isFixed: false, type: "special" }]);

    const res = await PATCH(makePatchReq({ requiredTagId: "tag-1" }), patchParams);
    expect(res.status).toBe(200);
    // requiredTagId should be ignored for special channels (no-op update)
    const json = await res.json();
    expect(json.channel).toBeDefined();
  });
});
