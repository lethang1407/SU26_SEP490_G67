import { api } from '@/lib/api-clien';
import { MOCK_PROFILE } from '../constants';

export async function getProfile() {
	try {
		const response = await api.get('/users/me');
		return response.data;
	} catch {
		return { ...MOCK_PROFILE };
	}
}

export async function updateProfile(payload) {
	try {
		const response = await api.put('/users/me', payload);
		return response.data;
	} catch {
		Object.assign(MOCK_PROFILE, payload);
		return { ...MOCK_PROFILE };
	}
}
