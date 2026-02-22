
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isFeatureAllowed } from '../config/permissions';
import {
    LogOut,
    MoveRight,
    ArrowDown,
    Users,
    Building2,
    PackageCheck,
    Truck,
    Repeat,
    RotateCcw,
    Store,
    Wallet,
    UserCheck,
    List,
    ClipboardList,
    RefreshCw,
    Edit,
    Lock
} from 'lucide-react';
import { motion, type Variants } from 'framer-motion';
import { cn } from '../lib/utils';

interface StepProps {
    title: string;
    sub?: string;
    icon?: React.ElementType;
    color: 'blue' | 'purple' | 'orange' | 'green' | 'red' | 'teal' | 'pink' | 'indigo' | 'yellow' | 'gray';
    onClick?: () => void;
    className?: string;
    disabled?: boolean;
}

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const arrowVariants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: { opacity: 1, scale: 1 }
};

function Step({ title, sub, icon: Icon, color, onClick, className, disabled }: StepProps) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-100 hover:bg-blue-100',
        purple: 'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-100 hover:bg-purple-100',
        orange: 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-100 hover:bg-orange-100',
        green: 'bg-green-50 text-green-700 border-green-200 ring-1 ring-green-100 hover:bg-green-100',
        red: 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-100 hover:bg-red-100',
        teal: 'bg-teal-50 text-teal-700 border-teal-200 ring-1 ring-teal-100 hover:bg-teal-100',
        pink: 'bg-pink-50 text-pink-700 border-pink-200 ring-1 ring-pink-100 hover:bg-pink-100',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-100 hover:bg-indigo-100',
        yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200 ring-1 ring-yellow-100 hover:bg-yellow-100',
        gray: 'bg-gray-50 text-gray-700 border-gray-200 ring-1 ring-gray-100 hover:bg-gray-100',
    };

    if (disabled) {
        return (
            <motion.div
                variants={itemVariants}
                className={cn(
                    'relative flex flex-col items-center justify-center p-3 rounded-lg w-40 md:w-48 text-center min-h-[90px] shadow-sm z-10',
                    'bg-gray-100 text-gray-400 border-gray-200 ring-1 ring-gray-100 cursor-not-allowed select-none',
                    className
                )}
            >
                <Lock className="w-3.5 h-3.5 absolute top-2 right-2 text-gray-400" />
                {Icon && <Icon className="w-6 h-6 mb-2 opacity-40" />}
                <span className="font-bold text-sm block leading-tight">{title}</span>
                {sub && <span className="text-xs opacity-50 block mt-1">{sub}</span>}
            </motion.div>
        );
    }

    return (
        <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.05, boxShadow: "0px 5px 15px rgba(0,0,0,0.1)" }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={cn(
                `flex flex-col items-center justify-center p-3 rounded-lg ${colorClasses[color]} w-40 md:w-48 text-center min-h-[90px] shadow-sm cursor-pointer transition-shadow z-10 bg-opacity-95`,
                className
            )}
        >
            {Icon && <Icon className="w-6 h-6 mb-2 opacity-80" />}
            <span className="font-bold text-sm block leading-tight">{title}</span>
            {sub && <span className="text-xs opacity-80 block mt-1">{sub}</span>}
        </motion.button>
    );
}

function ArrowHorizontal() {
    return (
        <motion.div variants={arrowVariants} className="text-gray-300 px-2">
            <MoveRight className="w-6 h-6" />
        </motion.div>
    );
}

function ArrowVertical() {
    return (
        <motion.div variants={arrowVariants} className="text-gray-300 py-2">
            <ArrowDown className="w-6 h-6" />
        </motion.div>
    );
}

export function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const allowed = (route: string) => isFeatureAllowed(route, user?.role);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 }
        }
    };

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

            <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="space-y-8"
            >
                {/* Workflow Section */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 relative overflow-x-auto">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                        <RotateCcw className="w-5 h-5 text-blue-600" />
                        Quy trình xử lý đơn hàng
                    </h2>

                    <div className="flex flex-col items-center min-w-[800px]">
                        <div className="flex items-center">
                            <Step
                                color="blue"
                                title="Khách hàng cọc"
                                sub="(Tạo đơn mới)"
                                icon={Users}
                                onClick={() => navigate('/orders/new')}
                            />
                            <ArrowHorizontal />
                            <Step
                                color="purple"
                                title="Admin đặt hàng"
                                sub="(Đơn cọc NSX)"
                                icon={Building2}
                                onClick={() => navigate('/manufacturer-order')}
                                disabled={!allowed('/manufacturer-order')}
                            />
                        </div>

                        {/* Fork Connector */}
                        <div className="h-12 w-full max-w-4xl relative flex justify-center">
                            <div className="h-full w-0.5 bg-gray-300 translate-x-[100px] md:translate-x-[116px]"></div>
                            <div className="absolute bottom-0 w-[50%] h-0.5 bg-gray-300"></div>
                            <div className="absolute bottom-0 w-[50%] flex justify-between">
                                <div className="h-3 w-0.5 bg-gray-300 translate-y-0.5"></div>
                                <div className="h-3 w-0.5 bg-gray-300 translate-y-0.5"></div>
                            </div>
                        </div>

                        {/* Main Branches */}
                        <div className="flex justify-between w-full max-w-4xl relative">

                            {/* LEFT: Standard Flow */}
                            <div className="flex flex-col items-center flex-1 pt-4">
                                <motion.div variants={itemVariants} className="mb-4 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm z-20">
                                    Quy trình Giao hàng
                                </motion.div>

                                <Step
                                    color="orange"
                                    title="Nhận hàng NSX"
                                    sub="(Cửa hàng đợi nhận)"
                                    icon={PackageCheck}
                                    onClick={() => navigate('/manufacturer-receive')}
                                />
                                <ArrowVertical />
                                <Step
                                    color="green"
                                    title="Giao hàng KH"
                                    sub="(Đưa hàng cho khách)"
                                    icon={Truck}
                                    onClick={() => navigate('/fulfillment')}
                                />
                            </div>

                            {/* RIGHT: Buyback Flow */}
                            <div className="flex flex-col items-center flex-1 pt-4">
                                <motion.div variants={itemVariants} className="mb-4 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm z-20">
                                    Quy trình Mua lại
                                </motion.div>

                                <Step
                                    color="red"
                                    title="Mua lại đơn KH"
                                    sub="(Khách hàng bán cọc)"
                                    icon={Repeat}
                                    onClick={() => navigate('/buyback')}
                                />

                                {/* Inner Fork Connector */}
                                <div className="h-8 w-full max-w-lg relative flex justify-center">
                                    <div className="h-full w-0.5 bg-gray-300"></div>
                                    <div className="absolute bottom-0 w-[50%] h-0.5 bg-gray-300"></div>
                                    <div className="absolute bottom-0 w-[50%] flex justify-between">
                                        <div className="h-3 w-0.5 bg-gray-300 translate-y-0.5"></div>
                                        <div className="h-3 w-0.5 bg-gray-300 translate-y-0.5"></div>
                                    </div>
                                </div>

                                {/* Inner Branches */}
                                <div className="flex justify-between w-full max-w-lg pt-4">
                                    {/* Left Sub: Sell back NSX */}
                                    <div className="flex flex-col items-center flex-1 px-2">
                                        <Step
                                            color="pink"
                                            title="Bán lại NSX"
                                            sub="(Bán lại đơn NSX)"
                                            icon={RotateCcw}
                                            onClick={() => navigate('/sell-back')}
                                            disabled={!allowed('/sell-back')}
                                        />
                                    </div>

                                    {/* Right Sub: Stock & Resell */}
                                    <div className="flex flex-col items-center flex-1 px-2">
                                        <Step
                                            color="teal"
                                            title="Cho đơn vào kho"
                                            sub="(Nhập kho)"
                                            icon={Store}
                                            onClick={() => navigate('/stores')}
                                        />
                                        <ArrowVertical />
                                        <Step
                                            color="blue"
                                            title="Bán khách khác"
                                            sub="(Tạo đơn mới)"
                                            icon={Users}
                                            onClick={() => navigate('/orders/new')}
                                        />
                                        <ArrowVertical />
                                        <Step
                                            color="orange"
                                            title="Nhận hàng NSX"
                                            sub="(Cửa hàng đợi nhận)"
                                            icon={PackageCheck}
                                            onClick={() => navigate('/manufacturer-receive')}
                                        />
                                        <ArrowVertical />
                                        <Step
                                            color="green"
                                            title="Giao hàng KH"
                                            sub="(Đưa hàng cho khách)"
                                            icon={Truck}
                                            onClick={() => navigate('/fulfillment')}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Management Section */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-gray-600" />
                        Quản lý & Danh sách
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        <Step
                            color="indigo"
                            title="Danh sách đơn cọc"
                            icon={List}
                            onClick={() => navigate('/orders')}
                            className="w-full"
                        />
                        <Step
                            color="pink"
                            title="Danh sách đơn NSX"
                            icon={ClipboardList}
                            onClick={() => navigate('/manufacturer-orders')}
                            className="w-full"
                            disabled={!allowed('/manufacturer-orders')}
                        />
                        <Step
                            color="orange"
                            title="Chỉnh sửa đơn"
                            icon={Edit}
                            onClick={() => navigate('/edit-orders')}
                            className="w-full"
                            disabled={!allowed('/edit-orders')}
                        />
                        <Step
                            color="yellow"
                            title="Hoán đổi SP"
                            icon={RefreshCw}
                            onClick={() => navigate('/swap-products')}
                            className="w-full"
                            disabled={!allowed('/swap-products')}
                        />
                        <Step
                            color="blue"
                            title="Quản lý tài chính"
                            icon={Wallet}
                            onClick={() => navigate('/financial-management')}
                            className="w-full"
                            disabled={!allowed('/financial-management')}
                        />
                        <Step
                            color="gray"
                            title="Quản lý người dùng"
                            icon={Users}
                            onClick={() => navigate('/users')}
                            className="w-full"
                            disabled={!allowed('/users')}
                        />
                        <Step
                            color="indigo"
                            title="Danh sách KH"
                            icon={UserCheck}
                            onClick={() => navigate('/customers')}
                            className="w-full"
                        />
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
