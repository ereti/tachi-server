import {
    CounterDocument,
    FolderDocument,
    GoalDocument,
    IIDXBPIData,
    IIDXEamusementScoreDocument,
    ImportDocument,
    TierlistParent,
    InviteCodeDocument,
    TierlistDataDocument,
    GenericAuthDocument,
    MilestoneDocument,
    NotificationDocument,
    FolderChartLookup,
    ImportTimingsDocument,
    PrivateUserDocument,
    ScoreDocument,
    KaiAuthDocument,
    SessionDocument,
    AnySongDocument,
    AnyChartDocument,
    UserGameStats,
    UserGoalDocument,
    PBScoreDocument,
    UserMilestoneDocument,
    BMSCourseDocument,
} from "kamaitachi-common";
import monk, { IMonkManager } from "monk";
import { MONGO_BASE_URL } from "../../lib/env/env";
import CreateLogCtx from "../../lib/logger/logger";

const logger = CreateLogCtx(__filename);

/* istanbul ignore next */
const base = MONGO_BASE_URL ?? "127.0.0.1";

/* istanbul ignore next */
let url = `${base}:27017/ktblackdb`;

if (process.env.NODE_ENV === "test") {
    if (process.env.KTBSV_PARALLEL_TESTS) {
        url = `${base}:27017/test-ephemeral-${process.pid}`;
    } else {
        url = `${base}:27017/testingdb`;
    }
}

logger.info(`Connecting to ${url}`);

let dbtime: [number, number] = [0, 0];
/* istanbul ignore next */
if (process.env.NODE_ENV !== "test") {
    logger.info(`Connecting to database ${url}...`);
    dbtime = process.hrtime();
}

export const monkDB = monk(url);
monkDB
    .then(() => {
        /* istanbul ignore next */
        if (process.env.NODE_ENV !== "test") {
            const time = process.hrtime(dbtime);
            const elapsed = time[0] + time[1] / 1e6;
            logger.info(`Database connection successful: took ${elapsed}ms`);
        }
    })
    .catch((err) => {
        logger.crit(err);
        process.exit(1);
    });

export async function CloseMongoConnection() {
    await monkDB.close();
}

const songs = {
    bms: monkDB.get<AnySongDocument>(`songs-bms`),
    chunithm: monkDB.get<AnySongDocument>(`songs-chunithm`),
    ddr: monkDB.get<AnySongDocument>(`songs-ddr`),
    gitadora: monkDB.get<AnySongDocument>(`songs-gitadora`),
    iidx: monkDB.get<AnySongDocument>(`songs-iidx`),
    jubeat: monkDB.get<AnySongDocument>(`songs-jubeat`),
    maimai: monkDB.get<AnySongDocument>(`songs-maimai`),
    museca: monkDB.get<AnySongDocument>(`songs-museca`),
    popn: monkDB.get<AnySongDocument>(`songs-popn`),
    sdvx: monkDB.get<AnySongDocument>(`songs-sdvx`),
    usc: monkDB.get<AnySongDocument>(`songs-usc`),
};

const charts = {
    bms: monkDB.get<AnyChartDocument>(`charts-bms`),
    chunithm: monkDB.get<AnyChartDocument>(`charts-chunithm`),
    ddr: monkDB.get<AnyChartDocument>(`charts-ddr`),
    gitadora: monkDB.get<AnyChartDocument>(`charts-gitadora`),
    iidx: monkDB.get<AnyChartDocument>(`charts-iidx`),
    jubeat: monkDB.get<AnyChartDocument>(`charts-jubeat`),
    maimai: monkDB.get<AnyChartDocument>(`charts-maimai`),
    museca: monkDB.get<AnyChartDocument>(`charts-museca`),
    popn: monkDB.get<AnyChartDocument>(`charts-popn`),
    sdvx: monkDB.get<AnyChartDocument>(`charts-sdvx`),
    usc: monkDB.get<AnyChartDocument>(`charts-usc`),
};

const db = {
    // i have to handwrite this out for TS... :(
    // dont worry, it was all macro'd
    songs,
    charts,
    scores: monkDB.get<ScoreDocument>("scores"),
    tierlists: monkDB.get<TierlistParent>("tierlists"),
    "tierlist-data": monkDB.get<TierlistDataDocument<never>>("tierlist-data"),
    "score-pbs": monkDB.get<PBScoreDocument>("score-pbs"),
    folders: monkDB.get<FolderDocument>("folders"),
    "folder-chart-lookup": monkDB.get<FolderChartLookup>("folder-chart-lookup"),
    goals: monkDB.get<GoalDocument>("goals"),
    "user-goals": monkDB.get<UserGoalDocument>("user-goals"),
    milestones: monkDB.get<MilestoneDocument>("milestones"),
    "user-milestones": monkDB.get<UserMilestoneDocument>("user-milestones"),
    users: monkDB.get<PrivateUserDocument>("users"),
    imports: monkDB.get<ImportDocument>("imports"),
    "import-timings": monkDB.get<ImportTimingsDocument>("import-timings"),
    notifications: monkDB.get<NotificationDocument>("notifications"),
    sessions: monkDB.get<SessionDocument>("sessions"),
    "iidx-bpi-data": monkDB.get<IIDXBPIData>("iidx-bpi-data"),
    invites: monkDB.get<InviteCodeDocument>("invites"),
    counters: monkDB.get<CounterDocument>("counters"),
    "iidx-eam-scores": monkDB.get<IIDXEamusementScoreDocument>("iidx-eam-scores"),
    "game-stats": monkDB.get<UserGameStats>("game-stats"),
    "kai-auth-tokens": monkDB.get<KaiAuthDocument>("kai-auth-tokens"),
    "usc-auth-tokens": monkDB.get<GenericAuthDocument>("usc-auth-tokens"),
    "beatoraja-auth-tokens": monkDB.get<GenericAuthDocument>("beatoraja-auth-tokens"),
    "bms-course-lookup": monkDB.get<BMSCourseDocument>("bms-course-lookup"),
};

export default db;
