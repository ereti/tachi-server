import { KtLogger } from "lib/logger/logger";
import { ChartDocument } from "tachi-common";
import p, { PrudenceSchema } from "prudence";
import { FormatPrError } from "utils/prudence";
import { USCClientScore } from "server/router/ir/usc/types";
import { IRUSCContext } from "./types";
import { ParserFunctionReturns } from "../../common/types";
import ScoreImportFatalError from "../../../framework/score-importing/score-import-error";

const PR_USCIRScore: PrudenceSchema = {
	score: p.isBoundedInteger(0, 10_000_000),
	gauge: p.isBetween(0, 100),
	timestamp: p.isPositiveInteger,
	crit: p.isPositiveInteger,
	near: p.isPositiveInteger,
	error: p.isPositiveInteger,
	options: {
		gaugeType: p.isIn(0, 1),
		mirror: "boolean",
		random: "boolean",
		autoFlags: p.isInteger,
	},
};

export function ParseIRUSC(
	body: Record<string, unknown>,
	chartHash: string,
	logger: KtLogger
): ParserFunctionReturns<USCClientScore, IRUSCContext> {
	const err = p(
		body.score,
		PR_USCIRScore,
		{},
		{ throwOnNonObject: false, allowExcessKeys: true }
	);

	if (err) {
		throw new ScoreImportFatalError(400, FormatPrError(err, "Invalid USC Score."));
	}

	return {
		context: {
			chartHash,
		},
		game: "usc",
		iterable: [body.score] as USCClientScore[],
		classHandler: null,
	};
}
