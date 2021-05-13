import { FindSongOnID } from "../../../../common/database-lookup/song";
import { ConverterFunction, DryScore, EmptyObject } from "../../../../types";
import {
    GenericCalculatePercent,
    GetGradeFromPercent,
} from "../../../framework/common/score-utils";
import {
    InternalFailure,
    InvalidScoreFailure,
    KTDataNotFoundFailure,
} from "../../../framework/score-importing/converter-failures";
import { FervidexScore } from "./types";
import { Lamps, Grades, Difficulties, Playtypes } from "kamaitachi-common";
import { FindChartOnInGameID } from "../../../../common/database-lookup/chart";

const LAMP_LOOKUP = {
    0: "NO PLAY",
    1: "FAILED",
    2: "ASSIST CLEAR",
    3: "EASY CLEAR",
    4: "CLEAR",
    5: "HARD CLEAR",
    6: "EX HARD CLEAR",
    7: "FULL COMBO",
};

function KtchifyAssist(
    assist: FervidexScore["option"]["assist"]
): DryScore<"iidx:SP" | "iidx:DP">["scoreMeta"]["assist"] {
    switch (assist) {
        case "ASCR_LEGACY":
            return "FULL ASSIST";
        case "AUTO_SCRATCH":
            return "AUTO SCRATCH";
        case "FULL_ASSIST":
            return "FULL ASSIST";
        case "LEGACY_NOTE":
            return "LEGACY NOTE";
        case null:
        case undefined:
            return "NO ASSIST";
    }
}

function KtchifyGauge(
    gauge: FervidexScore["option"]["gauge"]
): DryScore<"iidx:SP" | "iidx:DP">["scoreMeta"]["gauge"] {
    switch (gauge) {
        case "ASSISTED_EASY":
            return "ASSISTED EASY";
        case "EASY":
            return "EASY";
        case "EX_HARD":
            return "EX-HARD";
        case "HARD":
            return "HARD";
        case null:
        case undefined:
            return "NORMAL";
    }
}

function KtchifyRange(
    gauge: FervidexScore["option"]["range"]
): DryScore<"iidx:SP" | "iidx:DP">["scoreMeta"]["range"] {
    switch (gauge) {
        case "HIDDEN_PLUS":
            return "HIDDEN+";
        case "LIFT":
            return "LIFT";
        case "LIFT_SUD_PLUS":
            return "LIFT SUD+";
        case "SUDDEN_PLUS":
            return "SUDDEN+";
        case "SUD_PLUS_HID_PLUS":
            return "SUD+ HID+";
        case null:
        case undefined:
            return "NONE";
    }
}

function KtchifyRandom(
    gauge: FervidexScore["option"]["style"]
): DryScore<"iidx:SP" | "iidx:DP">["scoreMeta"]["random"] {
    switch (gauge) {
        case "RANDOM":
            return "RANDOM";
        case "S_RANDOM":
            return "S-RANDOM";
        case "R_RANDOM":
            return "R-RANDOM";
        case "MIRROR":
            return "MIRROR";
        case null:
        case undefined:
            return "NONRAN";
    }
}

function SplitFervidexChartRef(ferDif: FervidexScore["chart"]) {
    let playtype: Playtypes["iidx"];
    if (ferDif.startsWith("sp")) {
        playtype = "SP";
    } else {
        playtype = "DP";
    }

    let difficulty: Difficulties["iidx:SP" | "iidx:DP"];

    switch (ferDif[ferDif.length - 1]) {
        case "b":
            difficulty = "BEGINNER";
            break;
        case "n":
            difficulty = "NORMAL";
            break;
        case "h":
            difficulty = "HYPER";
            break;
        case "a":
            difficulty = "ANOTHER";
            break;
        case "l":
            difficulty = "LEGGENDARIA";
            break;
        default:
            throw new InternalFailure(`Invalid fervidex difficulty of ${ferDif}`);
    }

    return { playtype, difficulty };
}

export const ConverterIRFervidex: ConverterFunction<FervidexScore, EmptyObject> = async (
    data,
    context,
    importType,
    logger
) => {
    let { difficulty, playtype } = SplitFervidexChartRef(data.chart);

    let chart = await FindChartOnInGameID("iidx", data.entry_id, playtype, difficulty);

    if (!chart) {
        throw new KTDataNotFoundFailure(
            `Could not find chart with songID ${data.entry_id} (${playtype} ${difficulty})`,
            importType,
            data,
            context
        );
    }

    let song = await FindSongOnID("iidx", chart.songID);

    if (!song) {
        logger.severe(`Song ${chart.songID} (iidx) has no parent song?`);
        throw new InternalFailure(`Song ${chart.songID} (iidx) has no parent song?`);
    }

    let gaugeHistory = data.gauge.map((e) => (e > 200 ? null : e));

    let gauge = gaugeHistory[gaugeHistory.length - 1];

    if (gauge && gauge > 100) {
        throw new InvalidScoreFailure(`Invalid value of gauge ${gauge}.`);
    }

    const percent = GenericCalculatePercent("iidx", data.ex_score);

    if (percent > 100) {
        throw new InvalidScoreFailure(
            `Invalid score of ${data.ex_score} for chart ${song.title} (${playtype} ${difficulty}). Resulted in percent ${percent}.`
        );
    }

    let dryScore: DryScore<"iidx:SP" | "iidx:DP"> = {
        game: "iidx",
        service: "fervidex",
        comment: null,
        importType: "ir/fervidex",
        timeAchieved: Date.now(),
        scoreData: {
            score: data.ex_score,
            percent,
            grade: GetGradeFromPercent("iidx", percent) as Grades["iidx:SP" | "iidx:DP"],
            lamp: LAMP_LOOKUP[data.clear_type] as Lamps["iidx:SP" | "iidx:DP"],
            hitData: {
                pgreat: data.pgreat,
                great: data.great,
                good: data.good,
                bad: data.bad,
                poor: data.poor,
            },
            hitMeta: {
                fast: data.fast,
                slow: data.slow,
                maxCombo: data.max_combo,
                gaugeHistory,
                gauge,
            },
        },
        scoreMeta: {
            assist: KtchifyAssist(data.option.assist),
            gauge: KtchifyGauge(data.option.gauge),
            random: KtchifyRandom(data.option.style),
            range: KtchifyRange(data.option.range),
        },
    };

    return { song, chart, dryScore };
};
