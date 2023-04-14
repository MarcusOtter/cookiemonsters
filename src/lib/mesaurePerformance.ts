export function measurePerformanceInMs(fn: () => unknown): number {
	const startTime = performance.now();
	fn();
	return performance.now() - startTime;
}

export async function measurePerformanceInMsAsync(fn: () => Promise<unknown>): Promise<number> {
	const startTime = performance.now();
	await fn();
	return performance.now() - startTime;
}
