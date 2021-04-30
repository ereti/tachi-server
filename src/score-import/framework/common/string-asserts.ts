import { InvalidScoreFailure } from "../importing/converter-failures";

const isIntegerRegex = /^-?\d+$/;

export function AssertStrAsPositiveInt(strVal: string, errorMessage: string) {
    let isInt = isIntegerRegex.test(strVal);

    if (!isInt) {
        throw new InvalidScoreFailure(`${errorMessage} (Not an integer.)`);
    }

    let val = Number(strVal);

    if (!Number.isSafeInteger(val)) {
        throw new InvalidScoreFailure(`${errorMessage} (Not an integer.)`);
    } else if (val < 0) {
        throw new InvalidScoreFailure(`${errorMessage} (Was negative.)`);
    }

    return val;
}

export function AssertStrAsPositiveNonZeroInt(strVal: string, errorMessage: string) {
    let isInt = isIntegerRegex.test(strVal);

    if (!isInt) {
        throw new InvalidScoreFailure(`${errorMessage} (Not an integer.)`);
    }

    let val = Number(strVal);

    if (!Number.isSafeInteger(val)) {
        throw new InvalidScoreFailure(`${errorMessage} (Not an integer.)`);
    } else if (val <= 0) {
        throw new InvalidScoreFailure(`${errorMessage} (Was negative or zero.)`);
    }

    return val;
}