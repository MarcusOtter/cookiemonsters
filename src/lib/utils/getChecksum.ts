import crypto from "crypto";

export default function getChecksum(input: string) {
	const hash = crypto.createHash("sha1");
	hash.update(input);
	return hash.digest("hex");
}
