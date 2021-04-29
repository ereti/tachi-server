import fs from "fs";
import path from "path";
import { PRUDENCE_CHART_SCHEMAS } from "../../src/db/schemas";
import p from "prudence";
import db from "../../src/db/db";
import CreateLogCtx from "../../src/logger";

const logger = CreateLogCtx("add-hcnver.ts");

let data = JSON.parse(fs.readFileSync(path.join(__dirname, "./hcnverdata.json"), "utf-8"));

for (const d of data) {
    let r = p(d, PRUDENCE_CHART_SCHEMAS.iidx);
    if (r) {
        logger.error(r.userVal);
        logger.error(r);
        throw r;
    }
}

db.charts.iidx.insert(data).then(() => {
    logger.info("Done.");
    process.exit(0);
});