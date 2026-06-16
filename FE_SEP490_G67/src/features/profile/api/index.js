import { api } from '@/lib/api-clien';

export async function getProfile() {
	const response = await api.get('/users/me');
	return response.result;
}

export async function updateProfile(payload) {
	const response = await api.put('/users/me', payload);
	return response.result;
}
