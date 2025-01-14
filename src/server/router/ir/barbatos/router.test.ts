import t from "tap";

import { CreateFakeAuthCookie } from "test-utils/fake-auth";
import ResetDBState from "test-utils/resets";
import mockApi from "test-utils/mock-api";
import { TestingBarbatosScore } from "test-utils/test-data";
import db from "external/mongo/db";

t.test("POST /ir/barbatos/score/submit", async (t) => {
	const cookie = await CreateFakeAuthCookie(mockApi);

	t.beforeEach(ResetDBState);

	t.test("Should import a valid score", async (t) => {
		const res = await mockApi
			.post("/ir/barbatos/score/submit")
			.set("Cookie", cookie)
			.send(TestingBarbatosScore);

		t.equal(res.body.success, true, "Should be successful");

		t.equal(res.body.body.errors.length, 0, "Should have 0 failed scores.");

		const scores = await db.scores.count({
			service: "Barbatos",
		});

		t.equal(scores, 1, "Should import 1 score.");

		t.end();
	});

	t.test("Should reject an invalid body", async (t) => {
		const res = await mockApi.post("/ir/barbatos/score/submit").set("Cookie", cookie).send({});

		t.equal(res.body.success, false, "Should not be successful.");
		t.equal(res.status, 400, "Should return 400.");

		t.end();
	});

	t.end();
});
