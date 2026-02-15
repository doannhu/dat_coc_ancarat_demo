import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/Card';
import {
    List,
    Repeat,
    Truck,
    Building2,
    ClipboardList,
    Store,
    Users,
    UserCheck,
    LogOut,
    RotateCcw,
    PackageCheck,
    RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';

export function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const menuItems = [
        {
            title: 'Danh sách đơn cọc',
            icon: List,
            color: 'bg-purple-100 text-purple-600',
            action: () => navigate('/orders'),
            roles: ['admin', 'staff'],
        },
        {
            title: 'Mua lại đơn KH',
            icon: Repeat,
            color: 'bg-green-100 text-green-600',
            action: () => navigate('/buyback'),
            roles: ['admin', 'staff'],
        },
        {
            title: 'Giao hàng KH',
            icon: Truck,
            color: 'bg-orange-100 text-orange-600',
            action: () => navigate('/fulfillment'),
            roles: ['admin', 'staff'],
        },
        // Admin Only
        {
            title: 'Đơn cọc KH',
            icon: Users,
            color: 'bg-indigo-100 text-indigo-600',
            action: () => navigate('/orders/new'),
            roles: ['admin', 'staff'],
        },
        {
            title: 'Đơn cọc NSX',
            icon: Building2,
            color: 'bg-pink-100 text-pink-600',
            action: () => navigate('/manufacturer-order'),
            roles: ['admin'],
        },
        {
            title: 'Danh sách đơn NSX',
            icon: ClipboardList,
            color: 'bg-pink-100 text-pink-600',
            action: () => navigate('/manufacturer-orders'),
            roles: ['admin'],
        },
        {
            title: 'Bán lại đơn NSX',
            icon: RotateCcw,
            color: 'bg-red-100 text-red-600',
            action: () => navigate('/sell-back'),
            roles: ['admin'],
        },
        {
            title: 'Nhận hàng NSX',
            icon: PackageCheck,
            color: 'bg-green-100 text-green-600',
            action: () => navigate('/manufacturer-receive'),
            roles: ['admin'],
        },
        {
            title: 'Hoán đổi SP',
            icon: RefreshCw,
            color: 'bg-yellow-100 text-yellow-600',
            action: () => navigate('/swap-products'),
            roles: ['admin'],
        },
        {
            title: 'Quản lý người dùng',
            icon: Users,
            color: 'bg-gray-100 text-gray-600',
            action: () => navigate('/users'),
            roles: ['admin'],
        },
        {
            title: 'Quản lý kho',
            icon: Store,
            color: 'bg-emerald-100 text-emerald-600',
            action: () => navigate('/stores'),
            roles: ['admin'],
        },
        {
            title: 'Danh sách KH',
            icon: UserCheck,
            color: 'bg-indigo-100 text-indigo-600',
            action: () => navigate('/customers'),
            roles: ['admin'],
        },
    ];

    const filteredItems = menuItems.filter(item =>
        user && item.roles.includes(user.role!)
    );

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Bảng chức năng</h1>
                    <p className="text-gray-500">Xin chào, {user?.name}</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors"
                >
                    <LogOut className="h-6 w-6" />
                </button>
            </header>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {filteredItems.map((item) => (
                    <Card
                        key={item.title}
                        className="cursor-pointer transition-all hover:scale-[1.02] active:scale-95 border-0 shadow-sm"
                        onClick={item.action}
                    >
                        <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
                            <div className={cn("mb-4 rounded-2xl p-4", item.color)}>
                                <item.icon className="h-8 w-8" />
                            </div>
                            <h3 className="font-semibold text-gray-900">{item.title}</h3>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
