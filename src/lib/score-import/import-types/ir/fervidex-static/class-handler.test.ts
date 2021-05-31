import t from "tap";
import { CloseAllConnections } from "../../../../../test-utils/close-connections";
import ResetDBState from "../../../../../test-utils/reset-db-state";
import CreateLogCtx from "../../../../logger/logger";
import { FerStaticClassHandler } from "./class-handler";

const logger = CreateLogCtx(__filename);

t.test("#FerStaticClassHandler", (t) => {
    t.beforeEach(ResetDBState);

    t.test("Should curry a function", (t) => {
        const res = FerStaticClassHandler({ sp_dan: 1 });

        t.equal(typeof res, "function");

        t.end();
    });

    t.test("Should work with no dans", (t) => {
        const res = FerStaticClassHandler({})("iidx", "SP", 1, {}, logger);

        t.equal(res, undefined, "Should return nothing.");

        t.end();
    });

    t.test("Should update the same dan as the playtype.", (t) => {
        const fn = FerStaticClassHandler({ sp_dan: 5, dp_dan: 7 });
        const res = fn("iidx", "SP", 1, {}, logger);

        t.strictSame(res, { dan: 5 }, "Should return SP dan's value.");

        const res2 = fn("iidx", "DP", 1, {}, logger);

        t.strictSame(res2, { dan: 7 }, "Should return DP dan's value.");

        t.end();
    });

    t.test("Should skip if dan is invalid.", (t) => {
        const fn = FerStaticClassHandler({ sp_dan: -1, dp_dan: 100 });
        const res = fn("iidx", "SP", 1, {}, logger);

        t.equal(res, undefined, "Should skip SP dan's value.");

        const res2 = fn("iidx", "DP", 1, {}, logger);

        t.equal(res2, undefined, "Should skip DP dan's value.");

        t.end();
    });

    t.test("Should skip if playtype is invalid", (t) => {
        const fn = FerStaticClassHandler({ sp_dan: 5, dp_dan: 7 });
        const res = fn("iidx", "INVALID" as any, 1, {}, logger);

        t.equal(res, undefined, "Should skip over as a failsafe.");

        t.end();
    });

    t.end();
});

t.teardown(CloseAllConnections);