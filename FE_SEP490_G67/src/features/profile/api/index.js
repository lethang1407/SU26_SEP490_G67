import { api } from '@/lib/api-clien';
import { MOCK_PROFILE } from '../constants';

export async function getProfile() {
	try {
		const response = await api.get('/users/me');
		return response.data;
	} catch {
		return MOCK_PROFILE;
	}
}
