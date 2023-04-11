import { error } from '@sveltejs/kit';

export function GET(request) {
	if (Math.random() > 0.5) {
		throw error(500, 'Server messed up (50% chance)');
	}

	return new Response(`Hello ${request.url}!`);
}
