import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock Login Logic
        if (username === 'admin' && password === '1234') {
            login('admin', 'admin', 'Admin');
            navigate('/dashboard');
        } else if (username === 'nhanvien' && password === '1') {
            login('nhanvien', 'staff', 'Nhân Viên');
            navigate('/dashboard');
        } else {
            setError('Tên đăng nhập hoặc mật khẩu không đúng');
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <img
                        src="/logo.svg"
                        alt="Logo"
                        className="w-20 h-20 mx-auto mb-4 rounded-full border-2 border-gray-100 shadow-sm"
                    />
                    <CardTitle className="text-3xl font-bold text-gray-900">Bạc Hoa Tùng</CardTitle>
                    <p className="text-gray-500 mt-2">Đăng nhập để quản lý hệ thống</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="text"
                                placeholder="Tên đăng nhập"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder="Mật khẩu"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                        <Button type="submit" className="w-full" size="lg">
                            Đăng nhập
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
