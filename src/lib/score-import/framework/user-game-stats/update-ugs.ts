// "rating" refers to a user's profile statistics, as in their "rating" on a game.
// Some games have dedicated methods to calculate statistics like these, other games do not.
// That's about all there is to it!

import { Game, Playtypes, integer, UserGameStats, ClassDelta } from "kamaitachi-common";
import db from "../../../../external/mongo/db";
import { KtLogger } from "../../../logger/logger";
import { CalculateClassDeltas, UpdateUGSClasses, ClassHandler } from "./classes";
import { CalculateRatings, CalculateCustomRatings } from "./rating";

export async function UpdateUsersGamePlaytypeStats(
    game: Game,
    playtype: Playtypes[Game],
    userID: integer,
    classHandler: ClassHandler | null,
    logger: KtLogger
): Promise<ClassDelta[]> {
    const { rating, lampRating } = await CalculateRatings(game, playtype, userID, logger);
    const customRatings = await CalculateCustomRatings(game, playtype, userID, logger);

    // Attempt to find a users game stats if one already exists. If one doesn't exist,
    // this is this players first import for this game!
    const userGameStats = await db["game-stats"].findOne({
        game,
        playtype,
        userID,
    });

    logger.debug(`Calculating UGSClasses...`);

    const classes = await UpdateUGSClasses(
        game,
        playtype,
        userID,
        customRatings,
        classHandler,
        logger
    );

    logger.debug(`Finished Calculating UGSClasses`);

    logger.debug(`Calculating Class Deltas...`);

    const deltas = CalculateClassDeltas(game, playtype, classes, userGameStats, logger);

    logger.debug(`Had ${deltas.length} deltas.`);

    if (userGameStats) {
        logger.debug(`Updated player gamestats for ${game} (${playtype})`);
        await db["game-stats"].update(
            {
                game,
                playtype,
                userID,
            },
            {
                $set: {
                    rating,
                    lampRating,
                    customRatings,
                    classes,
                },
            }
        );
    } else {
        const newStats: UserGameStats = {
            game,
            playtype,
            userID,
            rating,
            lampRating,
            customRatings,
            classes,
        };

        logger.info(`Created new gamestats for ${game} (${playtype})`);
        await db["game-stats"].insert(newStats);
    }

    return deltas;
}