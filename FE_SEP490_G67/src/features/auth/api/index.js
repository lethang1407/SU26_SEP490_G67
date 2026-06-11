import { api } from '@/lib/api-clien';

const auth = {
  login: async (payload) => {
    const response = await api.post("/auth/token", {
        username: payload.username,
        password: payload.password
    });

    return response;
  },

};

export default auth;