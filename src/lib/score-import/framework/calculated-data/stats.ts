import {
    AnyChartDocument,
    ESDCore,
    integer,
    Grades,
    Lamps,
    Game,
    Playtypes,
} from "kamaitachi-common";
import db from "../../../../external/mongo/db";
import { GetAllTierlistDataOfType, GetOneTierlistData } from "../../../../utils/tierlist";
import { KtLogger } from "../../../logger/logger";
import { DryScore } from "../common/types";
import { lamps, clearLamp, ratingParameters } from "kamaitachi-common/js/config";

/**
 * Calculates the in-game CHUNITHM rating for a score.
 */
export function CalculateCHUNITHMRating(dryScore: DryScore, chartData: AnyChartDocument) {
    const score = dryScore.scoreData.score;
    const levelBase = chartData.levelNum * 100;

    let val = 0;

    if (score >= 1_007_500) {
        val = levelBase + 200;
    } else if (score >= 1_005_000) {
        val = levelBase + 150 + ((score - 1_005_000) * 10) / 500;
    } else if (score >= 1_000_000) {
        val = levelBase + 100 + ((score - 1_000_000) * 5) / 100;
    } else if (score >= 975_000) {
        val = levelBase + ((score - 975_000) * 2) / 500;
    } else if (score >= 925_000) {
        val = levelBase - 300 + ((score - 925_000) * 3) / 500;
    } else if (score >= 900_000) {
        val = levelBase - 500 + ((score - 900_000) * 4) / 500;
    } else if (score >= 800_000) {
        val = (levelBase - 500) / 2 + ((score - 800_000) * ((levelBase - 500) / 2)) / 100_000;
    }

    return Math.max(Math.floor(val) / 100, 0);
}

/**
 * Calculates the in-game GITADORA rating for a score.
 */
export function CalculateGITADORASkill(dryScore: DryScore, chartData: AnyChartDocument) {
    const trueRating = (dryScore.scoreData.percent / 100) * chartData.levelNum * 20;
    const flooredRating = Math.floor(trueRating * 100) / 100;
    return flooredRating;
}

/**
 * Calculates the PikaGreatFunction, used in BPI. I have no idea what this does.
 * @returns
 */
function BPIPikaGreatFn(score: integer, max: integer) {
    return score === max ? max * 0.8 : 1 + (score / max - 0.5) / (1 - score / max);
}

/**
 * Oh boy.
 *
 * Calculates the "Beat Performance Index" of an IIDX score. This algorithm has many issues,
 * but is a direct port of Poyashi's implementation for consistencies sake.
 * https://github.com/potakusan/iidx_score_manager/blob/f21ba6b85fcc0bf8b7ca888fa2239a3951a9c9c2/src/components/bpi/index.tsx#L120
 *
 * @param kaidenEx The kaiden average EX score.
 * @param wrEx The world record's EX score.
 * @param yourEx Your EX score.
 * @param max The maximum amount of EX achievable on this chart.
 * @param powCoef What power the BPI should be raised to. This is arbitrary, and assigned on a per-song basis. Defaults to 1.175.
 * @returns A number between -15 and 100. Unless your score is better than the world record, in which case
 * returns can be above 100.
 */
export function CalculateBPI(
    kaidenEx: integer,
    wrEx: integer,
    yourEx: integer,
    max: integer,
    pc: number | null
) {
    const powCoef = pc ?? 1.175;
    const yourPGF = BPIPikaGreatFn(yourEx, max);
    const kaidenPGF = BPIPikaGreatFn(kaidenEx, max);
    const wrPGF = BPIPikaGreatFn(wrEx, max);

    // no idea what these var names are
    const _s_ = yourPGF / kaidenPGF,
        _z_ = wrPGF / kaidenPGF;

    const isBetterThanKavg = yourEx >= kaidenEx;

    // this line of code isn't mine, and that's why it's *really* bad here.
    return Math.max(
        -15,
        Math.round(
            (isBetterThanKavg ? 100 : -100) *
                Math.pow(
                    (isBetterThanKavg ? Math.log(_s_) : -Math.log(_s_)) / Math.log(_z_),
                    powCoef
                ) *
                100
        ) / 100
    );
}

/**
 * Calculates the percent of Kaidens you are ahead of with this score.
 * @returns Null, if this chart has no kaidens, a percent between 0 and 100, if there are.
 */
export async function KaidenPercentile(scoreObj: DryScore, chartData: AnyChartDocument) {
    const scoreCount = await db["iidx-eam-scores"].count({
        chartID: chartData.chartID,
    });

    if (!scoreCount) {
        return null;
    }

    const worseScores = await db["iidx-eam-scores"].count({
        chartID: chartData.chartID,
        score: { $lt: scoreObj.scoreData.score },
    });

    return (100 * worseScores) / scoreCount;
}

/**
 * An experimental statistic for determining how good a score is versus the Kaiden Average
 * For those who know what ESDC is (me), this is just ESDC(kesd, your esd).
 */
export function CalculateKESDC(kaidenESD: number | null, yourESD: number) {
    if (!kaidenESD) {
        return null;
    }
    return ESDCore.ESDCompare(kaidenESD, yourESD);
}

/**
 * Calculate Marvelous Full Combo Points. This algorithm
 * is used in LIFE4, and described here:
 * https://life4ddr.com/requirements/#mfcpoints
 * @returns Null if this score was not eligible, a number otherwise.
 */
export function CalculateMFCP(dryScore: DryScore, chartData: AnyChartDocument, logger: KtLogger) {
    if (dryScore.scoreData.lamp !== "MARVELOUS FULL COMBO") {
        return null;
    }

    // Beginner and BASIC scores are explicitly excluded.
    if (chartData.difficulty === "BEGINNER" || chartData.difficulty === "BASIC") {
        return null;
    }

    if (chartData.levelNum < 8) {
        return null;
    } else if (chartData.levelNum <= 10) {
        return 1;
    } else if (chartData.levelNum <= 12) {
        return 2;
    } else if (chartData.levelNum === 13) {
        return 4;
    } else if (chartData.levelNum === 14) {
        return 8;
    } else if (chartData.levelNum === 15) {
        return 15;
    } else if (chartData.levelNum >= 16) {
        return 25;
    }

    logger.warn(
        `Invalid levelNum passed to MFCP ${chartData.levelNum}. ChartID ${chartData.chartID}.`
    );

    // failsafe
    return null;
}

const VF4GradeCoefficients = {
    S: 1.0,
    "AAA+": 0.99,
    AAA: 0.98,
    "AA+": 0.97,
    AA: 0.96,
    "A+": 0.95,
    A: 0.94,
    B: 0.93,
    C: 0.92,
    D: 0.91,
};

const VF5GradeCoefficients = {
    S: 1.05,
    "AAA+": 1.02,
    AAA: 1.0,
    "AA+": 0.97,
    AA: 0.94,
    "A+": 0.91, // everything below this point (incl. this) is marked with a (?) in bemaniwiki.
    A: 0.88,
    B: 0.85,
    C: 0.82,
    D: 0.8,
};

const VF5LampCoefficients = {
    "PERFECT ULTIMATE CHAIN": 1.1,
    "ULTIMATE CHAIN": 1.05,
    "EXCESSIVE CLEAR": 1.02,
    CLEAR: 1.0,
    FAILED: 0.5,
};

function FloorToNDP(number: number, dp: integer) {
    const mul = 10 ** dp;
    return Math.floor(number * mul) / mul;
}

export function CalculateVF6(
    grade: Grades["sdvx:Single"],
    lamp: Lamps["sdvx:Single"],
    per: number,
    levelNum: number,
    logger: KtLogger
) {
    const gradeCoefficient = VF5GradeCoefficients[grade];
    const lampCoefficient = VF5LampCoefficients[lamp];

    if (!lampCoefficient) {
        logger.warn(`Invalid lamp of ${lamp} passed to CalculateVF5. Returning null.`);
        return null;
    }
    if (!gradeCoefficient) {
        logger.warn(`Invalid grade of ${grade} passed to CalculateVF5. Returning null.`);
        return null;
    }

    const percent = per / 100;
    if (!levelNum || !percent) {
        return 0;
    }

    const realVF6 = (levelNum * 2 * percent * gradeCoefficient * lampCoefficient) / 100;

    return FloorToNDP(realVF6, 3);
}

// function CalculateJubility(
//     dryScore: DryScore<"jubeat:Single">,
//     chartData: AnyChartDocument,
//     logger: KtLogger
// ) {
//     let rate = dryScore.calculatedData.musicRate; eurgh, this is hard.
// }

interface RatingParameters {
    failHarshnessMultiplier: number;
    pivotPercent: number;
    clearExpMultiplier: number;
}

// Generic Rating Calc that is guaranteed to work for everything. This is unspecialised, and not great.
function KTRatingCalcV1(
    percent: number,
    levelNum: number,
    parameters: RatingParameters,
    logger: KtLogger
) {
    const percentDiv100 = percent / 100;

    if (percentDiv100 < parameters.pivotPercent) {
        return RatingCalcV0Fail(percentDiv100, levelNum, parameters);
    }

    return RatingCalcV1Clear(percentDiv100, levelNum, parameters, logger);
}

function RatingCalcV1Clear(
    percentDiv100: number,
    levelNum: number,
    parameters: RatingParameters,
    logger: KtLogger
) {
    // https://www.desmos.com/calculator/hn7uxjmjkc

    const rating =
        Math.cosh(
            parameters.clearExpMultiplier * levelNum * (percentDiv100 - parameters.pivotPercent)
        ) +
        (levelNum - 1);

    // checks for Infinity or NaN. I'm not sure how this would happen, but it's a failsafe.
    if (!Number.isFinite(rating)) {
        logger.warn(
            `Percent: ${percentDiv100}, Level: ${levelNum} resulted in rating of ${rating}, which is invalid. Defaulting to 0.`
        );
        return 0;
    } else if (rating > 1000) {
        logger.warn(
            `Percent: ${percentDiv100}, Level: ${levelNum} resulted in rating of ${rating}, which is invalid (> 1000). Defaulting to 0.`
        );
        return 0;
    }

    return rating;
}

function RatingCalcV0Fail(percentDiv100: number, levelNum: number, parameters: RatingParameters) {
    // https://www.desmos.com/calculator/ngjie5elto
    return (
        percentDiv100 ** (parameters.failHarshnessMultiplier * levelNum) *
        (levelNum / parameters.pivotPercent ** (parameters.failHarshnessMultiplier * levelNum))
    );
}

export async function CalculateKTRating(
    dryScore: DryScore,
    game: Game,
    playtype: Playtypes[Game],
    chart: AnyChartDocument,
    logger: KtLogger,
    defaultTierlistID?: string
) {
    // If this game doesn't have a specific rating function declared, fall back to the default "generic" rating function.
    // This is just a function that is guaranteed to work for all input - and therefore not result in lower-skilled users
    // always seeing 0.
    const parameters = ratingParameters[dryScore.game];

    let levelNum = chart.levelNum;

    if (defaultTierlistID) {
        const tierlistData = await GetOneTierlistData(
            game,
            chart,
            "score",
            null,
            defaultTierlistID
        );

        if (tierlistData) {
            levelNum = tierlistData.data.value;
        }
    }

    return KTRatingCalcV1(dryScore.scoreData.percent, levelNum, parameters, logger);
}

export async function CalculateKTLampRating(
    dryScore: DryScore,
    game: Game,
    playtype: Playtypes[Game],
    chart: AnyChartDocument,
    defaultTierlistID?: string
) {
    // if no tierlist data
    if (!defaultTierlistID) {
        return LampRatingNoTierlistInfo(dryScore, game, chart);
    }

    const lampTierlistInfo = await GetAllTierlistDataOfType(game, chart, "lamp", defaultTierlistID);

    // if no tierlist info
    if (lampTierlistInfo.length === 0) {
        return LampRatingNoTierlistInfo(dryScore, game, chart);
    }

    const userLampIndex = lamps[game].indexOf(dryScore.scoreData.lamp);

    // if this score is a clear, the lowest we should go is the levelNum of the chart.
    // Else, the lowest we can go is 0.
    let lampRating = userLampIndex >= lamps[game].indexOf(clearLamp[game]) ? chart.levelNum : 0;

    // why is this like this and not a lookup table?
    // Some charts have higher values for *lower* lamps, such as
    // one more lovely in IIDX being harder to NC than it is to HC!
    // this means we have to iterate over all tierlist data, in general.
    for (const tierlistData of lampTierlistInfo) {
        if (
            // this tierlistData has higher value than the current lampRating
            tierlistData.data.value > lampRating &&
            // and your clear is better than the lamp its for
            lamps[game].indexOf(tierlistData.key!) <= userLampIndex
        ) {
            lampRating = tierlistData.data.value;
        }
    }

    return lampRating;
}

function LampRatingNoTierlistInfo(dryScore: DryScore, game: Game, chart: AnyChartDocument) {
    const CLEAR_LAMP_INDEX = lamps[game].indexOf(clearLamp[game]);

    // if this is a clear
    if (lamps[game].indexOf(dryScore.scoreData.lamp) >= CLEAR_LAMP_INDEX) {
        // return this chart's numeric level as the lamp rating
        return chart.levelNum;
    }

    // else, this score is worth 0.
    return 0;
}

// deprecated calcs

// export function CalculateVF4(
//     grade: Grades["sdvx:Single"],
//     per: number,
//     levelNum: number,
//     logger: KtLogger
// ) {
//     const multiplier = 25;

//     const gradeCoefficient = VF4GradeCoefficients[grade];

//     if (!gradeCoefficient) {
//         logger.warn(`Invalid grade of ${grade} passed to CalculateVF4. Returning null.`);
//         return null;
//     }

//     const percent = per / 100;
//     if (!levelNum || !percent) {
//         return 0;
//     }

//     return Math.floor(multiplier * (levelNum + 1) * percent * gradeCoefficient);
// }

// // VF5 is just VF6 but to three decimal places instead of four.
// export function CalculateVF5(
//     grade: Grades["sdvx:Single"],
//     lamp: Lamps["sdvx:Single"],
//     per: number,
//     levelNum: number,
//     logger: KtLogger
// ) {
//     const vf6 = CalculateVF6(grade, lamp, per, levelNum, logger);

//     if (vf6 === null) {
//         return null;
//     }

//     return FloorToNDP(vf6, 2);
// }