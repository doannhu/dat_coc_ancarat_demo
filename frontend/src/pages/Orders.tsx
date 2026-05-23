import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ContractGenerator } from '../components/ContractGenerator';
import { ReturnReceiptGenerator } from '../components/ReturnReceiptGenerator';
import { ArrowLeft, ChevronDown, ChevronRight, Search, X } from 'lucide-react';
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
    fulfillment_date?: string;
    delivered_to_kc?: boolean;
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

interface ProductTransaction {
    transaction_id: number;
    code: string;
    type: string;
    created_at: string;
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
    const [saveDateRange, setSaveDateRange] = useState<boolean>(() => {
        return localStorage.getItem('orders_save_date_range') === 'true';
    });
    const [startDate, setStartDate] = useState<string>(() => {
        const savedSave = localStorage.getItem('orders_save_date_range') === 'true';
        if (savedSave) {
            const savedStart = localStorage.getItem('orders_saved_start_date');
            if (savedStart) return savedStart;
        }
        return startOfMonthHanoi();
    });
    const [endDate, setEndDate] = useState<string>(() => {
        const savedSave = localStorage.getItem('orders_save_date_range') === 'true';
        if (savedSave) {
            const savedEnd = localStorage.getItem('orders_saved_end_date');
            if (savedEnd) return savedEnd;
        }
        return todayHanoi();
    });
    const [loading, setLoading] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [activeSearch, setActiveSearch] = useState('');
    const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
    const [expandedProducts, setExpandedProducts] = useState<Record<number, ProductTransaction[] | null>>({});
    const [selectedStore, setSelectedStore] = useState<string>('');
    const [chartViewMode, setChartViewMode] = useState<'grid' | 'chart'>('chart');

    useEffect(() => {
        localStorage.setItem('orders_save_date_range', String(saveDateRange));
        if (saveDateRange) {
            localStorage.setItem('orders_saved_start_date', startDate);
            localStorage.setItem('orders_saved_end_date', endDate);
        } else {
            localStorage.removeItem('orders_saved_start_date');
            localStorage.removeItem('orders_saved_end_date');
        }
    }, [saveDateRange, startDate, endDate]);

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

    const handleToggleKC = async (orderId: number, isDelivered: boolean) => {
        try {
            await axios.put(`/api/v1/transactions/order/${orderId}`, {
                delivered_to_kc: isDelivered
            });
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, delivered_to_kc: isDelivered } : o));
        } catch (error) {
            console.error("Error updating KC status:", error);
            alert("Lỗi khi cập nhật trạng thái KC");
        }
    };

    const toggleProductTx = async (productId: number) => {
        setExpandedProducts(prev => {
            const next = { ...prev };
            if (next[productId] !== undefined) {
                delete next[productId];
                return next;
            } else {
                next[productId] = null; // loading
                return next;
            }
        });

        // If it wasn't expanded, we fetch
        if (expandedProducts[productId] === undefined) {
            try {
                const res = await axios.get(`/api/v1/products/${productId}/transactions`);
                setExpandedProducts(prev => ({ ...prev, [productId]: res.data }));
            } catch (e) {
                console.error(e);
                setExpandedProducts(prev => {
                    const next = { ...prev };
                    delete next[productId];
                    return next;
                });
            }
        }
    };

    useEffect(() => {
        if (!activeSearch) fetchOrders();
    }, [startDate, endDate]);

    const fetchOrders = async (searchTerm?: string) => {
        setLoading(true);
        try {
            const search = searchTerm ?? activeSearch;
            const params: Record<string, string> = { tx_type: 'Đơn cọc' };
            if (search) {
                params.customer_search = search;
            } else {
                params.start_date = startDate;
                params.end_date = endDate;
            }

            const [ordersRes, statsRes] = await Promise.all([
                axios.get('/api/v1/transactions/', { params }),
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

    const handleCustomerSearch = () => {
        const term = customerSearch.trim();
        if (!term) return;
        setActiveSearch(term);
        fetchOrders(term);
    };

    const clearSearch = () => {
        setCustomerSearch('');
        setActiveSearch('');
        fetchOrders('');
    };

    const calculateTotal = (items: TransactionItem[]) => {
        return items.reduce((sum, item) => sum + item.price_at_time, 0);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const storeOptions = Array.from(
        new Set(orders.map(o => o.store?.name).filter(Boolean))
    ) as string[];

    const filteredOrders = selectedStore
        ? orders.filter(o => o.store?.name === selectedStore)
        : orders;

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

    const sortedDates = Object.keys(productSummaryByDate).sort((a, b) => {
        const [ad, am, ay] = a.split('/');
        const [bd, bm, by] = b.split('/');
        const dateA = new Date(parseInt(ay), parseInt(am) - 1, parseInt(ad));
        const dateB = new Date(parseInt(by), parseInt(bm) - 1, parseInt(bd));
        return dateA.getTime() - dateB.getTime();
    });

    const total5Luong = Object.values(productSummaryByDate).reduce((sum, counts) => sum + (counts['5 lượng'] || 0), 0);
    const total1Kg = Object.values(productSummaryByDate).reduce((sum, counts) => sum + (counts['1 kg'] || 0), 0);
    const maxCount = Math.max(
        ...Object.values(productSummaryByDate).flatMap(counts => [
            counts['5 lượng'] || 0,
            counts['1 kg'] || 0
        ]),
        5
    );

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
                        disabled={!!activeSearch}
                    />
                </div>
                <div>
                    <label className={styles.label}>Ngày kết thúc</label>
                    <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        disabled={!!activeSearch}
                    />
                </div>
                
                <label className="flex items-center gap-2 cursor-pointer select-none pb-2.5">
                    <div className="relative inline-flex items-center">
                        <input
                            type="checkbox"
                            checked={saveDateRange}
                            onChange={(e) => setSaveDateRange(e.target.checked)}
                            disabled={!!activeSearch}
                            className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Lưu bộ lọc ngày</span>
                </label>

                <Button onClick={() => fetchOrders()} disabled={!!activeSearch}>Tải lại</Button>

                <div>
                    <label className={styles.label}>Cửa hàng</label>
                    <select
                        value={selectedStore}
                        onChange={(e) => setSelectedStore(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Tất cả</option>
                        {storeOptions.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                </div>

                <div className="ml-auto flex items-end gap-2">
                    <div>
                        <label className={styles.label}>Tìm khách hàng</label>
                        <Input
                            type="text"
                            placeholder="Tên / SĐT / CCCD"
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCustomerSearch()}
                            className="min-w-[200px]"
                        />
                    </div>
                    <Button onClick={handleCustomerSearch} disabled={!customerSearch.trim()}>
                        <Search className="h-4 w-4 mr-1" />
                        Tìm
                    </Button>
                    {activeSearch && (
                        <Button variant="outline" onClick={clearSearch}>
                            <X className="h-4 w-4 mr-1" />
                            Xóa
                        </Button>
                    )}
                </div>
            </div>

            {activeSearch && (
                <div className="mb-4 flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-4 py-2 rounded-lg border border-blue-200">
                    <Search className="h-4 w-4" />
                    <span>Kết quả tìm kiếm cho: <strong>"{activeSearch}"</strong> — {orders.length} đơn cọc</span>
                </div>
            )}

            <Card className="mb-6">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-medium">Sản phẩm bán được theo ngày</CardTitle>
                    <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs font-semibold gap-1 select-none">
                        <button
                            onClick={() => setChartViewMode('grid')}
                            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                                chartViewMode === 'grid'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            Dạng lưới
                        </button>
                        <button
                            onClick={() => setChartViewMode('chart')}
                            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                                chartViewMode === 'chart'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            Biểu đồ cột
                        </button>
                    </div>
                </CardHeader>
                <CardContent>
                    {chartViewMode === 'chart' ? (
                        <div className="space-y-4 pt-2">
                            {/* Legend */}
                            <div className="flex flex-wrap items-center gap-6 text-sm pb-2 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <span className="w-4 h-4 rounded bg-gradient-to-tr from-amber-500 to-yellow-400 shadow-sm"></span>
                                    <span className="font-semibold text-gray-700">5 lượng</span>
                                    <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                                        Tổng: {total5Luong}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-4 h-4 rounded bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-sm"></span>
                                    <span className="font-semibold text-gray-700">1 kg</span>
                                    <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                                        Tổng: {total1Kg}
                                    </span>
                                </div>
                            </div>

                            {Object.keys(productSummaryByDate).length === 0 ? (
                                <div className="text-sm text-gray-500 py-8 text-center">Không có dữ liệu trong khoảng thời gian này.</div>
                            ) : (
                                <div className="overflow-x-auto pb-2">
                                    <div className="min-w-[600px] h-72 relative mt-6 flex flex-col justify-end select-none">
                                        
                                        {/* Y-Axis Grid Lines */}
                                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 text-[10px] text-gray-400 font-medium">
                                            {[4, 3, 2, 1, 0].map((step) => {
                                                const value = Math.round((maxCount / 4) * step);
                                                return (
                                                    <div key={step} className="w-full flex items-center gap-2">
                                                        <span className="w-8 text-right tabular-nums">{value}</span>
                                                        <div className="flex-1 border-t border-dashed border-gray-200"></div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Columns Area */}
                                        <div className="relative flex justify-around items-end pl-10 pr-2 h-full pb-8 z-10">
                                            {sortedDates.map((date) => {
                                                const counts = productSummaryByDate[date] || {};
                                                const count5 = counts['5 lượng'] || 0;
                                                const count1 = counts['1 kg'] || 0;

                                                const pct5 = maxCount > 0 ? (count5 / maxCount) * 100 : 0;
                                                const pct1 = maxCount > 0 ? (count1 / maxCount) * 100 : 0;

                                                return (
                                                    <div key={date} className="flex flex-col items-center group/col">
                                                        <div className="flex items-end gap-2.5 h-48 w-24 justify-center">
                                                            {/* Bar for 5 lượng */}
                                                            <div className="relative flex flex-col items-center justify-end w-6 h-full group/bar">
                                                                {count5 > 0 && (
                                                                    <div className="absolute -top-6 text-[10px] font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none shadow-sm z-20 whitespace-nowrap">
                                                                        5 lượng: {count5}
                                                                    </div>
                                                                )}
                                                                {count5 > 0 && (
                                                                    <span className="absolute bottom-2 text-[10px] font-extrabold text-white z-10 pointer-events-none drop-shadow-md">
                                                                        {count5}
                                                                    </span>
                                                                )}
                                                                <div
                                                                    style={{ height: `${pct5}%` }}
                                                                    className="w-full rounded-t-md bg-gradient-to-t from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 transition-all duration-300 shadow-sm relative cursor-pointer"
                                                                />
                                                            </div>

                                                            {/* Bar for 1 kg */}
                                                            <div className="relative flex flex-col items-center justify-end w-6 h-full group/bar">
                                                                {count1 > 0 && (
                                                                    <div className="absolute -top-6 text-[10px] font-bold text-blue-700 bg-blue-50 px-1 py-0.5 rounded border border-blue-200 opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none shadow-sm z-20 whitespace-nowrap">
                                                                        1 kg: {count1}
                                                                    </div>
                                                                )}
                                                                {count1 > 0 && (
                                                                    <span className="absolute bottom-2 text-[10px] font-extrabold text-white z-10 pointer-events-none drop-shadow-md">
                                                                        {count1}
                                                                    </span>
                                                                )}
                                                                <div
                                                                    style={{ height: `${pct1}%` }}
                                                                    className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 transition-all duration-300 shadow-sm relative cursor-pointer"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Date Label */}
                                                        <div className="text-[11px] font-semibold text-gray-500 mt-2 text-center group-hover/col:text-gray-800 transition-colors">
                                                            {date}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
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
                    )}
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
                                    <th className={styles.th + " text-center"}>Đưa KC</th>
                                    <th className={styles.th}>Hợp đồng</th>
                                    <th className={styles.th}>Trả hàng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={11} className={styles.loading}>Loading...</td>
                                    </tr>
                                ) : orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className={styles.loading}>Không có đơn hàng trong khoảng ngày này.</td>
                                    </tr>
                                ) : (
                                    filteredOrders.map((order) => (
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
                                                                                <span
                                                                                    className="cursor-pointer hover:underline"
                                                                                    onClick={() => toggleProductTx(item.original_product_id!)}
                                                                                >
                                                                                    #{item.original_product_id}
                                                                                </span> • {item.original_product.product_code || '-'} • {item.original_product.product_type} - {formatCurrency(item.price_at_time)}
                                                                            </div>
                                                                            {item.original_product_id && expandedProducts[item.original_product_id] !== undefined && (
                                                                                <div className="ml-4 mt-1 mb-2 max-w-[250px] bg-white border border-gray-200 shadow-sm rounded p-2 z-10 relative">
                                                                                    <div className="font-semibold text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Lịch sử SP #{item.original_product_id}</div>
                                                                                    {expandedProducts[item.original_product_id] === null ? (
                                                                                        <div className="text-[10px] text-gray-400">Đang tải...</div>
                                                                                    ) : expandedProducts[item.original_product_id]?.length === 0 ? (
                                                                                        <div className="text-[10px] text-gray-400">Không có giao dịch.</div>
                                                                                    ) : (
                                                                                        <div className="space-y-1">
                                                                                            {expandedProducts[item.original_product_id]?.map(tx => (
                                                                                                <div key={tx.transaction_id} className="flex justify-between items-center bg-gray-50 p-1.5 rounded border border-gray-100">
                                                                                                    <div className="flex flex-col">
                                                                                                        <span className="font-bold text-[11px] text-indigo-600">{tx.code}</span>
                                                                                                        <span className="text-[9px] text-gray-500">{formatDate(tx.created_at)}</span>
                                                                                                    </div>
                                                                                                    <span className="text-[9px] px-1 py-0.5 bg-blue-100 text-blue-700 rounded">{tx.type}</span>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="px-1 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-medium">Hoán đổi</span>
                                                                                <span className="font-medium text-orange-700">
                                                                                    → <span
                                                                                        className="cursor-pointer hover:underline"
                                                                                        onClick={() => toggleProductTx(item.product_id)}
                                                                                    >
                                                                                        #{item.product_id}
                                                                                    </span> • {item.product?.product_code || '-'} • {item.product?.product_type || 'Unknown'}
                                                                                </span>
                                                                            </div>
                                                                            <div className="mt-1 flex items-center gap-2">
                                                                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusColor(item.product?.status || '')}`}>
                                                                                    {item.product?.status || '-'}
                                                                                </span>
                                                                                <span className="text-gray-600 font-medium">Giá chốt: {formatCurrency(item.price_at_time)}</span>
                                                                            </div>

                                                                            {expandedProducts[item.product_id] !== undefined && (
                                                                                <div className="ml-4 mt-1 mb-2 max-w-[250px] bg-white border border-gray-200 shadow-sm rounded p-2 z-10 relative">
                                                                                    <div className="font-semibold text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Lịch sử SP #{item.product_id}</div>
                                                                                    {expandedProducts[item.product_id] === null ? (
                                                                                        <div className="text-[10px] text-gray-400">Đang tải...</div>
                                                                                    ) : expandedProducts[item.product_id]?.length === 0 ? (
                                                                                        <div className="text-[10px] text-gray-400">Không có giao dịch.</div>
                                                                                    ) : (
                                                                                        <div className="space-y-1">
                                                                                            {expandedProducts[item.product_id]?.map(tx => (
                                                                                                <div key={tx.transaction_id} className="flex justify-between items-center bg-gray-50 p-1.5 rounded border border-gray-100">
                                                                                                    <div className="flex flex-col">
                                                                                                        <span className="font-bold text-[11px] text-indigo-600">{tx.code}</span>
                                                                                                        <span className="text-[9px] text-gray-500">{formatDate(tx.created_at)}</span>
                                                                                                    </div>
                                                                                                    <span className="text-[9px] px-1 py-0.5 bg-blue-100 text-blue-700 rounded">{tx.type}</span>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="space-y-1.5">
                                                                            <div className="font-medium text-gray-900">
                                                                                <span
                                                                                    className="cursor-pointer text-blue-600 hover:underline"
                                                                                    onClick={() => toggleProductTx(item.product_id)}
                                                                                >
                                                                                    #{item.product_id}
                                                                                </span> • {item.product?.product_code || '-'} • {item.product?.product_type || 'Unknown'}
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusColor(item.product?.status || '')}`}>
                                                                                    {item.product?.status || '-'}
                                                                                </span>
                                                                                <span className="text-gray-600 font-medium">Giá chốt: {formatCurrency(item.price_at_time)}</span>
                                                                            </div>

                                                                            {expandedProducts[item.product_id] !== undefined && (
                                                                                <div className="ml-4 mt-1 mb-2 max-w-[250px] bg-white border border-gray-200 shadow-sm rounded p-2 z-10 relative">
                                                                                    <div className="font-semibold text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Lịch sử SP #{item.product_id}</div>
                                                                                    {expandedProducts[item.product_id] === null ? (
                                                                                        <div className="text-[10px] text-gray-400">Đang tải...</div>
                                                                                    ) : expandedProducts[item.product_id]?.length === 0 ? (
                                                                                        <div className="text-[10px] text-gray-400">Không có giao dịch.</div>
                                                                                    ) : (
                                                                                        <div className="space-y-1">
                                                                                            {expandedProducts[item.product_id]?.map(tx => (
                                                                                                <div key={tx.transaction_id} className="flex justify-between items-center bg-gray-50 p-1.5 rounded border border-gray-100">
                                                                                                    <div className="flex flex-col">
                                                                                                        <span className="font-bold text-[11px] text-indigo-600">{tx.code}</span>
                                                                                                        <span className="text-[9px] text-gray-500">{formatDate(tx.created_at)}</span>
                                                                                                    </div>
                                                                                                    <span className="text-[9px] px-1 py-0.5 bg-blue-100 text-blue-700 rounded">{tx.type}</span>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
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
                                                <input
                                                    type="checkbox"
                                                    checked={order.delivered_to_kc || false}
                                                    onChange={(e) => handleToggleKC(order.id, e.target.checked)}
                                                    className="w-4 h-4 cursor-pointer"
                                                />
                                            </td>
                                            <td className={styles.td + " text-center"}>
                                                <ContractGenerator order={order} />
                                            </td>
                                            <td className={styles.td + " text-center"}>
                                                <ReturnReceiptGenerator
                                                    order={order}
                                                    disabled={order.order_status !== 'Đã giao'}
                                                    fulfillmentDate={order.fulfillment_date}
                                                />
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
