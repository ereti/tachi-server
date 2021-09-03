import db from "external/mongo/db";
import { PrivateUserInfoDocument, PublicUserDocument } from "tachi-common";
import MigrateRecords from "./migrate";

function ConvertFn(c: any): PrivateUserInfoDocument {
	const privateUserInfoDoc: PrivateUserInfoDocument = {
		userID: c.id,
		password: c.password,
		email: c.email,
	};

	return privateUserInfoDoc;
}

(async () => {
	await MigrateRecords(db.users, "user-private-information", ConvertFn);

	process.exit(0);
})();
