import glob from "glob";
import path from "path";

const files = glob.sync(path.join(__dirname, "../../", "**/*.test.ts"));

process.env.NODE_PATH = path.join(__dirname, "../../");

for (const file of files) {
	require(file);
}
