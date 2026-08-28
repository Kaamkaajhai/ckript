import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import ProducerRating from "../models/ProducerRating.js";
import Script from "../models/Script.js";
import { deleteProducerRating, getProducerRatings } from "./producerRatingController.js";

const originals = {
  countDocuments: ProducerRating.countDocuments,
  find: ProducerRating.find,
  findOne: ProducerRating.findOne,
  findById: ProducerRating.findById,
  scriptFindById: Script.findById,
};

afterEach(() => Object.assign(ProducerRating, {
  countDocuments: originals.countDocuments,
  find: originals.find,
  findOne: originals.findOne,
  findById: originals.findById,
}) && Object.assign(Script, { findById: originals.scriptFindById }));

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

describe("producer rating request boundary", () => {
  test("malformed script and rating ids are 400s before Mongo", async () => {
    ProducerRating.find = () => { throw new Error("must not query"); };
    let target = response();
    await getProducerRatings({ params: { scriptId: "bad" }, query: {}, user: {} }, target.res);
    assert.equal(target.captured.status, 400);

    target = response();
    await deleteProducerRating({ params: { id: "bad" }, user: { role: "producer" } }, target.res);
    assert.equal(target.captured.status, 400);
  });

  test("caps a caller-supplied ratings page at 50 rows", async () => {
    const scriptId = new mongoose.Types.ObjectId().toString();
    let receivedLimit = 0;
    ProducerRating.countDocuments = async () => 0;
    ProducerRating.find = () => {
      const chain = {
        populate: () => chain,
        sort: () => chain,
        skip: () => chain,
        limit: (value) => { receivedLimit = value; return Promise.resolve([]); },
      };
      return chain;
    };
    ProducerRating.findOne = () => ({ populate: async () => null });
    Script.findById = () => ({ select: async () => ({ producerRating: { average: 0, count: 0 } }) });
    const target = response();
    await getProducerRatings({ params: { scriptId }, query: { limit: "9999" }, user: { _id: "viewer", role: "producer" } }, target.res);
    assert.equal(target.captured.status, 200);
    assert.equal(receivedLimit, 50);
  });
});
