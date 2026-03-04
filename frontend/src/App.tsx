import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppShell from './components/layout/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Analytics';
import Services from './pages/Services';
import Logs from './pages/Logs';
import Setup from './pages/Setup';
import Download from './pages/Download';
import { useAuthStore } from './store/auth';

const queryClient = new QueryClient();

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuthStore();
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<PrivateRoute><AppShell /></PrivateRoute>}>
                        <Route index element={<Navigate to="/analytics" />} />
                        <Route path="analytics" element={<Dashboard />} />
                        <Route path="services" element={<Services />} />
                        <Route path="logs" element={<Logs />} />
                        <Route path="setup" element={<Setup />} />
                        <Route path="download" element={<Download />} />
                    </Route>
                </Routes>
            </Router>
        </QueryClientProvider>
    );
}

export default App;
