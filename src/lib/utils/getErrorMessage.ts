/**
 * Get error message from a thrown error object
 * @param e Error object
 * @returns Error message
 */
export default function getErrorMessage(e: unknown) {
	let errorMessage = "Unknown error";
	if (typeof e === "string") {
		errorMessage = e;
	} else if (e instanceof Error) {
		errorMessage = e.message;
	}
	return errorMessage;
}
