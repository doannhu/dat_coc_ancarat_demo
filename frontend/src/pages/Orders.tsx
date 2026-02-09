import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import styles from './Orders.module.css';

// Types (should ideally be shared/generated, but defining here for now)
interface Product {
    product_type: string;
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
    payment_method: string;
    items: TransactionItem[];
    customer?: Customer;
    store?: Store;
    staff?: Staff;
    order_status?: string;  // 'buyback', 'fulfill', or null
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

export const Orders = () => {
    const [orders, setOrders] = useState<Transaction[]>([]);
    const [stats, setStats] = useState<TransactionStats | null>(null);
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchOrders();
    }, [startDate, endDate]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const [ordersRes, statsRes] = await Promise.all([
                axios.get('/api/v1/transactions/', {
                    params: { start_date: startDate, end_date: endDate, tx_type: 'sale' }
                }),
                axios.get('/api/v1/transactions/stats', {
                    params: { start_date: startDate, end_date: endDate }
                })
            ]);

            setOrders(ordersRes.data);
            setStats(statsRes.data);
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

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Order List</h1>


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total_orders || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Sales Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(stats?.total_revenue || 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                                <span>Cash:</span>
                                <span className="font-semibold">{formatCurrency(stats?.payment_method_stats?.cash || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Bank:</span>
                                <span className="font-semibold">{formatCurrency(stats?.payment_method_stats?.bank_transfer || 0)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Store Breakdown</CardTitle>
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
                    <label className={styles.label}>Start Date</label>
                    <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div>
                    <label className={styles.label}>End Date</label>
                    <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
                <Button onClick={fetchOrders} className="">Refresh</Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Transactions ({orders.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead className={styles.thead}>
                                <tr>
                                    <th className={styles.th}>ID</th>
                                    <th className={styles.th}>Type</th>
                                    <th className={styles.th}>Status</th>
                                    <th className={styles.th}>Time</th>
                                    <th className={styles.th}>Customer</th>
                                    <th className={styles.th}>Store</th>
                                    <th className={styles.th}>Staff</th>
                                    <th className={styles.th}>Products</th>
                                    <th className={styles.th + " text-right"}>Total Money</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={9} className={styles.loading}>Loading...</td>
                                    </tr>
                                ) : orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className={styles.loading}>No orders found for this date.</td>
                                    </tr>
                                ) : (
                                    orders.map((order) => (
                                        <tr key={order.id} className={styles.tr}>
                                            <td className={styles.td}>#{order.id}</td>
                                            <td className={styles.td}>
                                                <span className={`${styles.badge} ${order.type === 'sale' ? styles.badgeSale :
                                                    order.type === 'buyback' ? styles.badgeBuyback :
                                                        styles.badgeDefault
                                                    }`}>
                                                    {order.type.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className={styles.td}>
                                                {order.order_status ? (
                                                    <span className={`${styles.badge} ${order.order_status === 'buyback' ? styles.badgeBuyback :
                                                        order.order_status === 'fulfill' ? styles.badgeFulfill :
                                                            styles.badgeDefault
                                                        }`}>
                                                        {order.order_status === 'buyback' ? 'Buyback' :
                                                            order.order_status === 'fulfill' ? 'Fulfilled' : order.order_status}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className={styles.td}>
                                                {new Date(order.created_at).toLocaleTimeString()}
                                            </td>
                                            <td className={`${styles.td} font-medium`}>
                                                {order.customer?.name || '-'}
                                                {order.customer?.phone_number && <div className={styles.customerPhone}>{order.customer.phone_number}</div>}
                                            </td>
                                            <td className={styles.td}>{order.store?.name || '-'}</td>
                                            <td className={styles.td}>{order.staff?.staff_name || '-'}</td>
                                            <td className={styles.td}>
                                                <div className="space-y-1">
                                                    {order.items.map((item, idx) => (
                                                        <div key={idx} className="text-xs">
                                                            {item.product?.product_type || 'Unknown'} - {formatCurrency(item.price_at_time)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className={styles.totalMoney}>
                                                {formatCurrency(calculateTotal(order.items))}
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
