import Pr from "prudence";
import t from "tap";
import { CloseConnection, ReOpenConnection } from "../../../../db/db";
import CreateLogCtx from "../../../../logger";
import prAssert from "../../../../test-utils/prassert";
import {
    Testing511SPA,
    TestingIIDXSPDryScore,
    TestingSDVXSingleDryScore,
} from "../../../../test-utils/test-data";
import { CreateGameSpecific } from "./game-specific";
const logger = CreateLogCtx("fake-testing-context");

/**
 * These tests only check that the right properties are assigned.
 */
t.test("#CreateGameSpecific", (t) => {
    t.test("IIDX:SP", async (t) => {
        let res = await CreateGameSpecific(
            "iidx",
            "SP",
            Testing511SPA,
            TestingIIDXSPDryScore,
            logger
        );

        prAssert(
            res,
            {
                BPI: "null",
                "K%": "null",
                KESDC: "null",
            },
            "Response should contain nulled keys for IIDX:SP GameSpecifics"
        );

        t.end();
    });

    t.test("IIDX:DP", async (t) => {
        let res = await CreateGameSpecific(
            "iidx",
            "DP",
            Testing511SPA,
            TestingIIDXSPDryScore, // fake! this is an SP score. but we're testing
            logger
        );

        prAssert(
            res,
            {
                BPI: "null",
                KESDC: "null",
            },
            "Response should contain nulled keys for IIDX:DP GameSpecifics"
        );

        t.end();
    });

    t.test("SDVX:Single", async (t) => {
        let res = await CreateGameSpecific(
            "sdvx",
            "Single",
            Testing511SPA,
            TestingSDVXSingleDryScore,
            logger
        );

        prAssert(
            res,
            {
                VF4: Pr.nullable(Pr.isPositiveInteger),
                VF5: Pr.nullable(Pr.isPositive),
            },
            "Response should contain nulled keys for SDVX:Single GameSpecifics"
        );

        t.end();
    });

    t.test("DDR:SP", async (t) => {
        let res = await CreateGameSpecific(
            "ddr",
            "SP",
            Testing511SPA,
            TestingIIDXSPDryScore, // fake! this is an iidx score. but we're testing
            logger
        );

        prAssert(
            res,
            {
                MFCP: "null",
            },
            "Response should contain nulled keys for DDR:SP GameSpecifics"
        );

        t.end();
    });

    t.test("DDR:DP", async (t) => {
        let res = await CreateGameSpecific(
            "ddr",
            "DP",
            Testing511SPA,
            TestingIIDXSPDryScore, // fake! this is an iidx score. but we're testing
            logger
        );

        prAssert(
            res,
            {
                MFCP: "null",
            },
            "Response should contain nulled keys for DDR:DP GameSpecifics"
        );

        t.end();
    });

    t.end();
});

t.teardown(CloseConnection);