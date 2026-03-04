import axios from 'axios';

const client = axios.create({
    baseURL: '/',
    headers: {
        'Content-Type': 'application/json',
    },
});

client.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const { data } = await axios.post('/api/auth/refresh');
                localStorage.setItem('access_token', data.access_token);
                originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
                return client(originalRequest);
            } catch (refreshError) {
                localStorage.removeItem('access_token');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default client;

