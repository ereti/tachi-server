import { ScoreDocument } from "kamaitachi-common";
import t from "tap";
import db, { CloseConnection } from "../../../db/db";
import ResetDBState from "../../../test-utils/reset-db-state";
import { InsertQueue, QueueScoreInsert } from "./insert-score";

// these two get the same tests, because they're too closely linked
t.test("#QueueScoreInsert, #InsertQueue", async (t) => {
    t.beforeEach(ResetDBState);

    // empty scoreDB after
    t.afterEach(async () => {
        await db.scores.remove({});
    });

    t.test("Single Queue Test", async (t) => {
        // fake score doc
        let res = await QueueScoreInsert(({ testDocument: "foo" } as unknown) as ScoreDocument);

        t.equal(res, null, "QueueScoreInsert should not insert a score when the queue is not full.");

        // this is the best way to get the size of the queue
        let flushSize = await InsertQueue();

        t.equal(flushSize, 1, "QueueScoreInsert should append the score to the queue.");

        let dbRes = await db.scores.find({
            testDocument: "foo",
        });

        t.equal(
            dbRes.length,
            1,
            "InsertQueue should insert all 1 members of the queue into the database."
        );

        t.end();
    });

    let r = await InsertQueue(); // flush queue just incase former test fails.

    t.equal(r, 0, "Queue should be empty after test.");

    t.test("Queue Overflow Test", async (t) => {
        for (let i = 0; i < 499; i++) {
            // eslint-disable-next-line no-await-in-loop
            let res = await QueueScoreInsert(({ testDocument: "foo" } as unknown) as ScoreDocument);
        }

        let overflowRes = await QueueScoreInsert(({
            testDocument: "foo",
        } as unknown) as ScoreDocument);

        t.equal(
            overflowRes,
            500,
            "Appending 500 items to the queue should result in them being inserted."
        );

        let flushRes = await InsertQueue();

        t.equal(flushRes, 0, "The queue should now be empty.");

        let dbRes = await db.scores.find({
            testDocument: "foo",
        });

        t.equal(
            dbRes.length,
            500,
            "InsertQueue should insert all 500 members of the queue into the database."
        );

        t.end();
    });

    t.end();
});

t.teardown(CloseConnection);