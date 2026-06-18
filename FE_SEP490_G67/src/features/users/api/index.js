import { api } from '@/lib/api-clien';

const users = {
	getAll: async () => {
		const response = await api.get("/users");
		
		return response;
	}
}
export default users;