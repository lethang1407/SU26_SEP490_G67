import { api } from '@/lib/api-clien';

const auth = {
  login: async (payload) => {
    const response = await api.post("/auth/token", {
        username: payload.username,
        password: payload.password
    });

    return response;
  },
  initiatePasswordReset: async (payload) => {
    const response = await api.post("/auth/forgot-password/initiate", {
        phoneNumber: payload.phoneNumber
    });

    return response;
  },
  verifyOtp: async (payload) => {
    const response = await api.post("/auth/forgot-password/verify-otp", {
        phoneNumber: payload.phoneNumber,
        otp: payload.otp
    }); 
    return response;
  },
  resetPassword: async (payload) => {
    const response = await api.post("/auth/forgot-password/change-password", {
        phoneNumber: payload.phoneNumber,
        newPassword: payload.newPassword
    }); 
    return response;
  }
};

export default auth;