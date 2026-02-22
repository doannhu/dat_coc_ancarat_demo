import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import { formatDate, formatTime, todayHanoi } from '../lib/dateUtils';

// Types
interface Product {
    id: number;
    product_code?: string;
    product_type: string;
    status: string;
    last_price: number;
    store_id: number;
    store_name?: string;
    store?: Store;
    customer_name?: string;
    order_date?: string;
    is_delivered?: boolean;
}

interface TransactionItem {
    id: number;
    product_id: number;
    price_at_time: number;
    product: Product;
}

interface Store {
    id: number;
    name: string;
}

interface Staff {
    id: number;
    staff_name: string;
}

interface Transaction {
    id: number;
    type: string;
    created_at: string;
    code?: string;  // Manufacturer order code
    transaction_code?: string;
    items: TransactionItem[];
    store?: Store;
    staff?: Staff;
}



const getStatusColor = (status: string) => {
    switch (status) {
        case 'Đã bán': return 'bg-blue-100 text-blue-800';
        case 'Có sẵn': return 'bg-green-100 text-green-800';
        case 'Đã đặt hàng': return 'bg-purple-100 text-purple-800';
        case 'Đã giao': return 'bg-teal-100 text-teal-800';
        case 'Đã bán lại NSX': return 'bg-red-100 text-red-800';
        case 'Đã nhận hàng NSX': return 'bg-orange-100 text-orange-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

export function ManufacturerOrderList() {
    const navigate = useNavigate();

    const [orders, setOrders] = useState<Transaction[]>([]);
    const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
    const [startDate, setStartDate] = useState<string>(todayHanoi());
    const [endDate, setEndDate] = useState<string>(todayHanoi());
    const [loading, setLoading] = useState(false);

    // Track delivery status changes
    const [deliveryChanges, setDeliveryChanges] = useState<Map<number, boolean>>(new Map());


    useEffect(() => {
        fetchData();
    }, [startDate, endDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ordersRes, pendingRes] = await Promise.all([
                axios.get('/api/v1/transactions/', {
                    params: { start_date: startDate, end_date: endDate, tx_type: 'Đặt hàng NSX' }
                }),
                axios.get('/api/v1/products/pending-manufacturer')
            ]);

            setOrders(ordersRes.data);
            setPendingProducts(pendingRes.data);
            setDeliveryChanges(new Map()); // Reset changes on fresh load
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };


    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const calculateTotal = (items: TransactionItem[]) => {
        return items.reduce((sum, item) => sum + item.price_at_time, 0);
    };

    const totalOrderAmount = orders.reduce((sum, order) => sum + calculateTotal(order.items), 0);
    const totalPendingProducts = pendingProducts.length;
    const totalPendingValue = pendingProducts.reduce((sum, p) => sum + (p.last_price || 0), 0);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-3xl font-bold text-gray-900">Đơn hàng NSX</h1>
                    </div>
                </div>

                {/* Status Legend */}
                <Card>
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

                        <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col gap-3 text-sm">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-700">Sản phẩm khách đặt cọc:</span>
                                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-semibold">Đã bán</span>
                                <span className="text-gray-400">→</span>
                                <span className="text-gray-600">Đặt hàng NSX</span>
                                <span className="text-gray-400">→</span>
                                <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-semibold">Đã đặt hàng</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-700">Hàng mới đặt thêm từ NSX:</span>
                                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-semibold">Có sẵn</span>
                                <span className="text-gray-400">→</span>
                                <span className="text-gray-600">Bán cho khách hàng</span>
                                <span className="text-gray-400">→</span>
                                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-semibold">Đã bán</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Date Filter */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex gap-4 items-end">
                            <div>
                                <label className="block text-sm font-medium mb-1">Ngày bắt đầu</label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Ngày kết thúc</label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                            <Button onClick={fetchData}>Tải lại</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Tổng số đơn hàng</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{orders.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Tổng giá trị đơn hàng</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalOrderAmount)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Sản phẩm chưa đặt hàng</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">{totalPendingProducts} items</div>
                            <div className="text-sm text-gray-500">{formatCurrency(totalPendingValue)}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Manufacturer Orders List with Delivery Status */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Đơn hàng NSX ({orders.length})</CardTitle>
                            {/* <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>Toggle delivery status for each product</span>
                            </div> */}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-4">Đang tải...</div>
                        ) : orders.length === 0 ? (
                            <div className="text-center py-4 text-gray-500">Không có đơn hàng NSX trong khoảng thời gian này.</div>
                        ) : (
                            <div className="space-y-4">
                                {orders.map((order) => (
                                    <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50">
                                        {/* Order Header */}
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-blue-700 px-2 py-1 bg-blue-100 rounded text-sm">
                                                        {order.code || `Order #${order.id}`}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {formatDate(order.created_at)}{' '}
                                                    {formatTime(order.created_at)}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-blue-600">{formatCurrency(calculateTotal(order.items))}</div>
                                                <div className="text-sm text-gray-500">
                                                    {order.store?.name || '-'} • {order.staff?.staff_name || '-'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Products Table with Switches */}
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="px-3 py-2 text-left">Mã sản phẩm</th>
                                                    <th className="px-3 py-2 text-left">Loại</th>
                                                    <th className="px-3 py-2 text-left">Cửa hàng nhận</th>
                                                    <th className="px-3 py-2 text-right">Giá</th>
                                                    <th className="px-3 py-2 text-center">Trạng thái</th>
                                                    {/* <th className="px-3 py-2 text-center">Đã nhận hàng NSX</th> */}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {order.items.map((item) => {
                                                    // const isDelivered = getDeliveryStatus(item.product);
                                                    const hasChange = deliveryChanges.has(item.product.id);

                                                    return (
                                                        <tr
                                                            key={item.id}
                                                            className={`border-b ${hasChange ? 'bg-yellow-50' : ''}`}
                                                        >
                                                            <td className="px-3 py-2">
                                                                <div>#{item.product.id}</div>
                                                                <div className="text-xs text-gray-500 font-mono">{item.product.product_code || '-'}</div>
                                                            </td>
                                                            <td className="px-3 py-2">{item.product.product_type}</td>
                                                            <td className="px-3 py-2">{item.product.store?.name || '-'}</td>
                                                            <td className="px-3 py-2 text-right">{formatCurrency(item.price_at_time)}</td>
                                                            <td className="px-3 py-2 text-center">
                                                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(item.product.status)}`}>
                                                                    {item.product.status}
                                                                </span>
                                                            </td>
                                                            {/* <td className="px-3 py-2">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <IOSSwitch
                                                                        checked={isDelivered}
                                                                        onChange={() => handleDeliveryToggle(item.product.id, isDelivered)}
                                                                    />
                                                                    <span className={`text-xs ${isDelivered ? 'text-green-600' : 'text-gray-400'}`}>
                                                                        {isDelivered ? 'Yes' : 'No'}
                                                                    </span>
                                                                </div>
                                                            </td> */}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pending Products (Not Yet Ordered from Manufacturer) */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-orange-600">
                                Sản phẩm chưa đặt hàng ({pendingProducts.length})
                            </CardTitle>
                            {pendingProducts.length > 0 && (
                                <Button onClick={() => navigate('/manufacturer-order')}>
                                    Tạo đơn đặt hàng NSX
                                </Button>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                            Sản phẩm từ đơn hàng khách hàng cần đặt hàng từ NSX
                        </p>
                    </CardHeader>
                    <CardContent>
                        {pendingProducts.length === 0 ? (
                            <div className="text-center py-4 text-gray-500">
                                Không có sản phẩm chưa đặt hàng. Tất cả đơn hàng khách hàng đã được đặt hàng từ NSX.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-orange-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Mã sản phẩm</th>
                                            <th className="px-4 py-3 text-left">Loại</th>
                                            <th className="px-4 py-3 text-left">Khách hàng</th>
                                            <th className="px-4 py-3 text-left">Ngày đặt hàng</th>
                                            <th className="px-4 py-3 text-left">Cửa hàng</th>
                                            <th className="px-4 py-3 text-right">Giá</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingProducts.map((product) => (
                                            <tr key={product.id} className="border-b hover:bg-orange-50">
                                                <td className="px-4 py-3">
                                                    <div>#{product.id}</div>
                                                    <div className="text-xs text-gray-500 font-mono">{product.product_code || '-'}</div>
                                                </td>
                                                <td className="px-4 py-3">{product.product_type}</td>
                                                <td className="px-4 py-3 font-medium">{product.customer_name || '-'}</td>
                                                <td className="px-4 py-3">
                                                    {product.order_date
                                                        ? formatDate(product.order_date)
                                                        : '-'}
                                                </td>
                                                <td className="px-4 py-3">{product.store_name || '-'}</td>
                                                <td className="px-4 py-3 text-right font-bold text-orange-600">
                                                    {formatCurrency(product.last_price || 0)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-orange-100">
                                        <tr>
                                            <td colSpan={5} className="px-4 py-3 font-bold">Tổng</td>
                                            <td className="px-4 py-3 text-right font-bold text-orange-600">
                                                {formatCurrency(totalPendingValue)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}
