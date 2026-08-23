import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Script from "../models/Script.js";
import ScriptOption from "../models/ScriptOption.js";
import { releaseHold } from "./scriptController.js";

const originals = {
  findOneAndUpdate: ScriptOption.findOneAndUpdate,
  findOne: ScriptOption.findOne,
  updateOne: Script.updateOne,
};

afterEach(() => {
  ScriptOption.findOneAndUpdate = originals.findOneAndUpdate;
  ScriptOption.findOne = originals.findOne;
  Script.updateOne = originals.updateOne;
});
const response = () => {
  const captured = { status: 200, body: null };
  return {
    captured,
    res: {
      status(code) { captured.status = code; return this; },
      json(body) { captured.body = body; return this; },
    },
  };
};

describe("release hold ownership boundary", () => {
  test("a malformed identity is refused before mutation", async () => {
    ScriptOption.findOneAndUpdate = () => { throw new Error("must not mutate"); };
    const target = response();
    await releaseHold({ body: { optionId: "bad" }, user: { _id: "viewer" } }, target.res);
    assert.equal(target.captured.status, 400);
  });

  test("cancels only the viewer's active unexpired option and clears only their project hold", async () => {
    const optionId = new mongoose.Types.ObjectId();
    const scriptId = new mongoose.Types.ObjectId();
    const viewerId = new mongoose.Types.ObjectId();
    let optionQuery;
    let scriptQuery;
    ScriptOption.findOneAndUpdate = async (query) => {
      optionQuery = query;
      return { _id: optionId, script: scriptId, status: "cancelled" };
    };
    Script.updateOne = async (query) => { scriptQuery = query; return { modifiedCount: 1 }; };
    const target = response();
    await releaseHold({ body: { optionId: optionId.toString() }, user: { _id: viewerId } }, target.res);

    assert.equal(target.captured.status, 200);
    assert.equal(String(optionQuery.holder), String(viewerId));
    assert.equal(optionQuery.status, "active");
    assert.ok(optionQuery.endDate.$gt instanceof Date);
    assert.equal(String(scriptQuery.heldBy), String(viewerId));
  });
});
