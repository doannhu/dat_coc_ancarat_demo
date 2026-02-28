import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ContractGenerator } from '../components/ContractGenerator';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import styles from './Orders.module.css';
import { formatTime, formatDate, todayHanoi, startOfMonthHanoi } from '../lib/dateUtils';

// Types (should ideally be shared/generated, but defining here for now)
interface Product {
    product_type: string;
    product_code?: string;
    status: string;
    last_price: number;
    store_id: number;
}

interface TransactionItem {
    id: number;
    transaction_id: number;
    product_id: number;
    price_at_time: number;
    product: Product;
    swapped: boolean;
    original_product_id: number | null;
    original_product: Product | null;
}

interface Customer {
    id: number;
    name: string;
    phone_number: string;
}

interface Store {
    id: number;
    name: string;
}

interface Staff {
    id: number;
    staff_name: string;
    role: string;
}

interface Transaction {
    id: number;
    type: string;
    created_at: string;
    transaction_code?: string;
    payment_method: string;
    cash_amount?: number;
    bank_transfer_amount?: number;
    items: TransactionItem[];
    customer?: Customer;
    store?: Store;
    staff?: Staff;
    order_status?: string;  // 'Mua lại', 'Đã giao', 'Bán lại NSX', or null
}

interface StoreStats {
    store_name: string;
    total_orders: number;
    revenue: number;
}

interface TransactionStats {
    total_orders: number;
    total_revenue: number;
    payment_method_stats: Record<string, number>;
    store_stats: StoreStats[];
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Đã bán': return 'bg-blue-100 text-blue-800';
        case 'Có sẵn': return 'bg-green-100 text-green-800';
        case 'Đã đặt hàng': return 'bg-purple-100 text-purple-800';
        case 'Đã giao': return 'bg-teal-100 text-teal-800';
        case 'Đã bán lại NSX': return 'bg-red-100 text-red-800';
        case 'Đã nhận hàng NSX': return 'bg-orange-100 text-orange-800';
        case 'Mua lại': return 'bg-indigo-100 text-indigo-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

export const Orders = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Transaction[]>([]);
    const [stats, setStats] = useState<TransactionStats | null>(null);
    const [startDate, setStartDate] = useState<string>(startOfMonthHanoi());
    const [endDate, setEndDate] = useState<string>(todayHanoi());
    const [loading, setLoading] = useState(false);
    const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

    const toggleOrder = (orderId: number) => {
        setExpandedOrders(prev => {
            const next = new Set(prev);
            if (next.has(orderId)) {
                next.delete(orderId);
            } else {
                next.add(orderId);
            }
            return next;
        });
    };

    useEffect(() => {
        fetchOrders();
    }, [startDate, endDate]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const [ordersRes, statsRes] = await Promise.all([
                axios.get('/api/v1/transactions/', {
                    params: { start_date: startDate, end_date: endDate, tx_type: 'Đơn cọc' }
                }),
                axios.get('/api/v1/transactions/stats', {
                    params: { start_date: startDate, end_date: endDate }
                })
            ]);

            setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
            setStats(statsRes.data ?? null);
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setLoading(false);
        }
    };

    const calculateTotal = (items: TransactionItem[]) => {
        return items.reduce((sum, item) => sum + item.price_at_time, 0);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const productSummaryByDate = orders.reduce((acc, order) => {
        const dateStr = formatDate(order.created_at);
        if (!acc[dateStr]) acc[dateStr] = {};
        order.items.forEach(item => {
            if (item.product && item.product.status !== 'Có sẵn' && item.product.status !== 'Đã trả nhà SX') {
                const type = item.product.product_type || 'Unknown';
                acc[dateStr][type] = (acc[dateStr][type] || 0) + 1;
            }
        });
        return acc;
    }, {} as Record<string, Record<string, number>>);

    return (
        <div className={styles.container}>
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className={`${styles.title} mb-0`}>Danh sách đơn hàng</h1>
            </div>

            {/* Status Legend */}
            <Card className="mb-6">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Chú thích trạng thái sản phẩm</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-start gap-2">
                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap min-w-[90px] text-center">Đã bán</span>
                            <span className="text-gray-600 text-xs">Sản phẩm khách đã đặt</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap min-w-[90px] text-center">Có sẵn</span>
                            <span className="text-gray-600 text-xs">Đã đặt dư trong kho, sẵn sàng để bán</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap min-w-[90px] text-center">Đã đặt hàng</span>
                            <span className="text-gray-600 text-xs">Đã lên đơn đặt hàng với Ancarat</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap min-w-[90px] text-center">Đã giao</span>
                            <span className="text-gray-600 text-xs">Đã đưa hàng cho khách</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap min-w-[90px] text-center">Đã bán lại NSX</span>
                            <span className="text-gray-600 text-xs">Đã bán lại cho Ancarat</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap min-w-[90px] text-center">Đã nhận hàng NSX</span>
                            <span className="text-gray-600 text-xs">Đã về cửa hàng, chờ giao</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap min-w-[90px] text-center">Mua lại</span>
                            <span className="text-gray-600 text-xs">Đơn hàng mua lại từ khách</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Tổng số đơn hàng</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total_orders || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(stats?.total_revenue || 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Phương thức thanh toán</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                                <span>Tiền mặt:</span>
                                <span className="font-semibold">{formatCurrency(stats?.payment_method_stats?.cash || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Chuyển khoản:</span>
                                <span className="font-semibold">{formatCurrency(stats?.payment_method_stats?.bank_transfer || 0)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Doanh thu theo cửa hàng</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs space-y-1 max-h-20 overflow-y-auto">
                            {stats?.store_stats?.map((s, idx) => (
                                <div key={idx} className="flex justify-between">
                                    <span>{s.store_name}:</span>
                                    <span className="font-semibold">{formatCurrency(s.revenue)}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className={styles.filterSection}>
                <div>
                    <label className={styles.label}>Ngày bắt đầu</label>
                    <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div>
                    <label className={styles.label}>Ngày kết thúc</label>
                    <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
                <Button onClick={fetchOrders} className="">Tải lại</Button>
            </div>

            <Card className="mb-6">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Sản phẩm bán được theo ngày</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Object.entries(productSummaryByDate).length === 0 ? (
                            <div className="text-sm text-gray-500">Không có dữ liệu trong khoảng thời gian này.</div>
                        ) : Object.entries(productSummaryByDate).map(([date, counts], index) => {
                            const colors = [
                                'bg-pink-50 border-pink-200 text-pink-900',
                                'bg-purple-50 border-purple-200 text-purple-900',
                                'bg-blue-50 border-blue-200 text-blue-900',
                                'bg-teal-50 border-teal-200 text-teal-900',
                                'bg-orange-50 border-orange-200 text-orange-900'
                            ];
                            const colorClass = colors[index % colors.length];
                            return (
                                <div key={date} className={`border rounded p-3 ${colorClass}`}>
                                    <div className="font-bold border-b border-black/10 pb-1 mb-2">{date}</div>
                                    <div className="space-y-1 text-sm">
                                        {Object.entries(counts).map(([type, count]) => (
                                            <div key={type} className="flex justify-between">
                                                <span className="opacity-80 font-medium">{type}</span>
                                                <span className="font-bold">{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Đơn hàng ({orders.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead className={styles.thead}>
                                <tr>
                                    <th className={styles.th}>Mã đơn</th>
                                    <th className={styles.th}>Loại</th>
                                    <th className={styles.th}>Trạng thái</th>
                                    <th className={styles.th}>Thời gian</th>
                                    <th className={styles.th}>Khách hàng</th>
                                    <th className={styles.th}>Cửa hàng</th>
                                    <th className={styles.th}>Nhân viên</th>
                                    <th className={styles.th}>Sản phẩm</th>
                                    <th className={styles.th + " text-right"}>Tổng tiền</th>
                                    <th className={styles.th}>Hợp đồng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={10} className={styles.loading}>Loading...</td>
                                    </tr>
                                ) : orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className={styles.loading}>Không có đơn hàng trong khoảng ngày này.</td>
                                    </tr>
                                ) : (
                                    orders.map((order) => (
                                        <tr key={order.id} className={styles.tr}>
                                            <td className={styles.td}>{order.transaction_code || `#${order.id}`}</td>
                                            <td className={styles.td}>
                                                <span className={`${styles.badge} ${order.type === 'Đơn cọc' ? styles.badgeSale :
                                                    order.type === 'Mua lại' ? styles.badgeBuyback :
                                                        styles.badgeDefault
                                                    }`}>
                                                    {order.type}
                                                </span>
                                            </td>
                                            <td className={styles.td}>
                                                {order.order_status ? (
                                                    <span className={`${styles.badge} ${order.order_status === 'Mua lại' ? styles.badgeBuyback :
                                                        order.order_status === 'Đã giao' ? styles.badgeFulfill :
                                                            styles.badgeDefault
                                                        }`}>
                                                        {order.order_status}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className={styles.td}>
                                                {formatTime(order.created_at)}
                                            </td>
                                            <td className={`${styles.td} font-medium`}>
                                                {order.customer?.name || '-'}
                                                {order.customer?.phone_number && <div className={styles.customerPhone}>{order.customer.phone_number}</div>}
                                            </td>
                                            <td className={styles.td}>{order.store?.name || '-'}</td>
                                            <td className={styles.td}>{order.staff?.staff_name || '-'}</td>
                                            <td className={styles.td}>
                                                <div className="space-y-2">
                                                    <div
                                                        className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded -ml-1"
                                                        onClick={() => toggleOrder(order.id)}
                                                    >
                                                        <div className="text-gray-500 mt-0.5">
                                                            {expandedOrders.has(order.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                        </div>
                                                        <div className="text-sm font-medium">
                                                            {Object.entries(order.items.reduce((acc, item) => {
                                                                if (item.product && item.product.status !== 'Có sẵn' && item.product.status !== 'Đã trả nhà SX') {
                                                                    const type = item.product.product_type || 'Unknown';
                                                                    acc[type] = (acc[type] || 0) + 1;
                                                                }
                                                                return acc;
                                                            }, {} as Record<string, number>)).map(([type, count]) => `${count} x ${type}`).join(', ')}
                                                        </div>
                                                    </div>

                                                    {expandedOrders.has(order.id) && (
                                                        <div className="pl-6 space-y-3 pb-2 w-max">
                                                            {order.items.map((item, idx) => (
                                                                <div key={idx} className="text-xs border-l-2 border-gray-200 pl-3">
                                                                    {item.swapped && item.original_product ? (
                                                                        <div className="space-y-1.5">
                                                                            <div className="line-through text-gray-400">
                                                                                #{item.original_product_id} • {item.original_product.product_code || '-'} • {item.original_product.product_type} - {formatCurrency(item.price_at_time)}
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="px-1 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-medium">Hoán đổi</span>
                                                                                <span className="font-medium text-orange-700">
                                                                                    → #{item.product_id} • {item.product?.product_code || '-'} • {item.product?.product_type || 'Unknown'}
                                                                                </span>
                                                                            </div>
                                                                            <div className="mt-1 flex items-center gap-2">
                                                                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusColor(item.product?.status || '')}`}>
                                                                                    {item.product?.status || '-'}
                                                                                </span>
                                                                                <span className="text-gray-600 font-medium">Giá chốt: {formatCurrency(item.price_at_time)}</span>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="space-y-1.5">
                                                                            <div className="font-medium text-gray-900">
                                                                                #{item.product_id} • {item.product?.product_code || '-'} • {item.product?.product_type || 'Unknown'}
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusColor(item.product?.status || '')}`}>
                                                                                    {item.product?.status || '-'}
                                                                                </span>
                                                                                <span className="text-gray-600 font-medium">Giá chốt: {formatCurrency(item.price_at_time)}</span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={styles.totalMoney}>
                                                {formatCurrency(calculateTotal(order.items))}
                                            </td>
                                            <td className={styles.td + " text-center"}>
                                                <ContractGenerator order={order} />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
