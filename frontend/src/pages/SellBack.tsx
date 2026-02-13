import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Package, Check, X, AlertTriangle, Info } from 'lucide-react';
import { formatDate, formatTime, formatDateTime, todayHanoi, nowHanoiLocal, hanoiToISO } from '../lib/dateUtils';

// Types
interface Product {
    id: number;
    product_type: string;
    status: string;
    last_price: number;
    store_id: number;
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
    code?: string;
    items: TransactionItem[];
    store?: Store;
    staff?: Staff;
}

interface SellBackItem {
    product_id: number;
    product_type: string;
    sell_back_price: number;
    selected: boolean;
}

interface BuybackInfo {
    transaction_code?: string;
    created_at: string;
    customer_name?: string;
}

interface ProductStatusInfo {
    id: number;
    status: string;
    buyback_info?: BuybackInfo;
    sale_info?: BuybackInfo;
    swap_info?: BuybackInfo;  // Returned via swap (Hoán đổi)
}

export function SellBack() {
    const navigate = useNavigate();

    // Date range for filtering manufacturer orders
    const [startDate, setStartDate] = useState<string>(todayHanoi());
    const [endDate, setEndDate] = useState<string>(todayHanoi());

    // Data
    const [mfrOrders, setMfrOrders] = useState<Transaction[]>([]);
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Selection
    const [selectedOrder, setSelectedOrder] = useState<Transaction | null>(null);
    const [sellBackItems, setSellBackItems] = useState<SellBackItem[]>([]);
    const [selectedStaffId, setSelectedStaffId] = useState<number>(0);
    const [sellBackDate, setSellBackDate] = useState<string>(nowHanoiLocal());

    // Status Info
    const [statusInfos, setStatusInfos] = useState<Map<number, ProductStatusInfo>>(new Map());
    const [popupInfo, setPopupInfo] = useState<{ type: 'warning' | 'info', data: ProductStatusInfo } | null>(null);

    useEffect(() => {
        fetchStaff();
    }, []);

    useEffect(() => {
        fetchMfrOrders();
    }, [startDate, endDate]);

    const fetchMfrOrders = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v1/transactions/', {
                params: { start_date: startDate, end_date: endDate, tx_type: 'Đặt hàng NSX' }
            });
            setMfrOrders(res.data);
        } catch (e) {
            console.error("Failed to fetch manufacturer orders", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchStaff = async () => {
        try {
            const res = await axios.get('/api/v1/staff/');
            setStaffList(res.data);
            if (res.data.length > 0) {
                setSelectedStaffId(res.data[0].id);
            }
        } catch (e) {
            console.error("Failed to fetch staff", e);
        }
    };

    const fetchStatusInfos = async (ids: number[]) => {
        try {
            const res = await axios.post('/api/v1/products/status-info', { product_ids: ids });
            const map = new Map();
            res.data.forEach((info: ProductStatusInfo) => map.set(info.id, info));
            setStatusInfos(map);
        } catch (e) {
            console.error("Failed to fetch product status info", e);
        }
    };

    const selectOrder = (order: Transaction) => {
        setSelectedOrder(order);
        // Pre-populate sell-back items from order items
        // Only include items where product is NOT already sold back (to manufacturer)
        const items: SellBackItem[] = order.items
            .filter(item => item.product.status !== 'Đã bán lại NSX')
            .map(item => ({
                product_id: item.product_id,
                product_type: item.product.product_type,
                sell_back_price: item.price_at_time,
                selected: true
            }));
        setSellBackItems(items);

        // Fetch statuses
        const productIds = order.items.map(i => i.product_id);
        fetchStatusInfos(productIds);
    };

    const toggleItem = (productId: number) => {
        setSellBackItems(prev =>
            prev.map(item =>
                item.product_id === productId
                    ? { ...item, selected: !item.selected }
                    : item
            )
        );
    };

    const updatePrice = (productId: number, price: number) => {
        setSellBackItems(prev =>
            prev.map(item =>
                item.product_id === productId
                    ? { ...item, sell_back_price: price }
                    : item
            )
        );
    };

    const selectedItems = sellBackItems.filter(item => item.selected);
    const totalAmount = selectedItems.reduce((sum, item) => sum + item.sell_back_price, 0);

    const handleSubmit = async () => {
        if (selectedItems.length === 0) {
            alert("Vui lòng chọn ít nhất một sản phẩm để bán lại");
            return;
        }

        if (!selectedOrder) return;

        setSubmitting(true);
        try {
            const payload = {
                original_transaction_id: selectedOrder.id,
                staff_id: selectedStaffId,
                store_id: selectedOrder.store?.id || 1,
                items: selectedItems.map(item => ({
                    product_id: item.product_id,
                    sell_back_price: item.sell_back_price
                })),
                created_at: hanoiToISO(sellBackDate)
            };

            await axios.post('/api/v1/transactions/sell-back', payload);
            alert('Bán lại NSX thành công!');
            setSelectedOrder(null);
            setSellBackItems([]);
            fetchMfrOrders(); // Refresh
        } catch (error: any) {
            alert(`Lỗi: ${error.response?.data?.detail || 'Không thể xử lý bán lại'}`);
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    // Check if ALL products in order have been sold back
    const isFullySoldBack = (order: Transaction): boolean => {
        return order.items.every(item => item.product.status === 'Đã bán lại NSX');
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900">Bán lại NSX</h1>
                </div>

                {/* Date Filter */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex gap-4 items-end">
                            <div>
                                <label className="block text-sm font-medium mb-1">Từ ngày</label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Đến ngày</label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                            <Button onClick={fetchMfrOrders}>Tải lại</Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Manufacturer Orders List */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Đơn đặt hàng NSX ({mfrOrders.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-center py-4">Đang tải...</div>
                            ) : mfrOrders.length === 0 ? (
                                <div className="text-center py-4 text-gray-500">
                                    Không có đơn hàng NSX trong khoảng ngày này.
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                    {mfrOrders.map((order) => {
                                        const fullySoldBack = isFullySoldBack(order);
                                        const isSelected = selectedOrder?.id === order.id;

                                        return (
                                            <div
                                                key={order.id}
                                                onClick={() => !fullySoldBack && selectOrder(order)}
                                                className={`border rounded-lg p-4 transition-all
                                                    ${fullySoldBack
                                                        ? 'opacity-50 cursor-not-allowed bg-gray-100'
                                                        : 'cursor-pointer hover:border-purple-400 hover:shadow-sm'}
                                                    ${isSelected ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' : ''}
                                                `}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold">Đơn #{order.id}</span>
                                                            {order.code && (
                                                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-sm">
                                                                    {order.code}
                                                                </span>
                                                            )}
                                                            {fullySoldBack && (
                                                                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">
                                                                    Đã bán lại NSX
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {formatDate(order.created_at)}{' '}
                                                            {formatTime(order.created_at)}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {order.store?.name || '-'} • {order.staff?.staff_name || '-'}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-blue-600">
                                                            {formatCurrency(order.items.reduce((sum, item) => sum + item.price_at_time, 0))}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {order.items.length} sản phẩm
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Products preview */}
                                                <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-1">
                                                    {order.items.map(item => (
                                                        <span
                                                            key={item.id}
                                                            className={`inline-block px-2 py-0.5 rounded text-xs
                                                                ${item.product.status === 'Đã bán lại NSX'
                                                                    ? 'bg-red-100 text-red-700'
                                                                    : 'bg-gray-100 text-gray-700'}
                                                            `}
                                                        >
                                                            #{item.product_id} {item.product.product_type}
                                                            {item.product.status === 'Đã bán lại NSX' && ' ✓'}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Right: Sell Back Form */}
                    <div className="space-y-4">
                        {selectedOrder ? (
                            <>
                                {/* Sell Back Details */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-purple-600">
                                            Bán lại - Đơn #{selectedOrder.id}
                                            {selectedOrder.code && ` (${selectedOrder.code})`}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Date/Time */}
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Ngày giờ bán lại</label>
                                            <Input
                                                type="datetime-local"
                                                value={sellBackDate}
                                                onChange={(e) => setSellBackDate(e.target.value)}
                                            />
                                        </div>

                                        {/* Staff */}
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Nhân viên</label>
                                            <select
                                                className="w-full border rounded-md px-3 py-2 text-sm"
                                                value={selectedStaffId}
                                                onChange={(e) => setSelectedStaffId(Number(e.target.value))}
                                            >
                                                {staffList.map(s => (
                                                    <option key={s.id} value={s.id}>{s.staff_name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Store (auto-filled) */}
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Cửa hàng</label>
                                            <Input
                                                value={selectedOrder.store?.name || '-'}
                                                disabled
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Products to sell back */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Sản phẩm bán lại ({selectedItems.length}/{sellBackItems.length})</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {sellBackItems.length === 0 ? (
                                            <p className="text-gray-500 text-center py-4">
                                                Tất cả sản phẩm trong đơn này đã được bán lại.
                                            </p>
                                        ) : (
                                            <div className="space-y-3">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-100">
                                                        <tr>
                                                            <th className="px-3 py-2 text-center w-12">Chọn</th>
                                                            <th className="px-3 py-2 text-left">SP</th>
                                                            <th className="px-3 py-2 text-center w-16">Chi tiết</th>
                                                            <th className="px-3 py-2 text-left">Loại</th>
                                                            <th className="px-3 py-2 text-right">Giá bán lại</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {sellBackItems.map(item => {
                                                            const info = statusInfos.get(item.product_id);
                                                            // Warning: product sold to customer but not bought back (current state)
                                                            const isSoldToCustomer = !!info?.sale_info && !info?.buyback_info;
                                                            // Info: product was bought back from customer OR returned via swap
                                                            const hasBuybackOrSwapHistory = !!info?.buyback_info || !!info?.swap_info;

                                                            return (
                                                                <tr key={item.product_id} className="border-b">
                                                                    <td className="px-3 py-2 text-center">
                                                                        <button
                                                                            onClick={() => toggleItem(item.product_id)}
                                                                            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors
                                                                                ${item.selected
                                                                                    ? 'bg-purple-500 border-purple-500 text-white'
                                                                                    : 'border-gray-300 hover:border-purple-400'
                                                                                }`}
                                                                        >
                                                                            {item.selected && <Check className="h-4 w-4" />}
                                                                        </button>
                                                                    </td>
                                                                    <td className="px-3 py-2">#{item.product_id}</td>
                                                                    <td className="px-3 py-2 text-center">
                                                                        {isSoldToCustomer && (
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-8 w-8 p-0 text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50"
                                                                                onClick={() => info && setPopupInfo({ type: 'warning', data: info })}
                                                                            >
                                                                                <AlertTriangle className="h-4 w-4" />
                                                                            </Button>
                                                                        )}
                                                                        {hasBuybackOrSwapHistory && (
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                                                                onClick={() => info && setPopupInfo({ type: 'info', data: info })}
                                                                            >
                                                                                <Info className="h-4 w-4" />
                                                                            </Button>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-3 py-2">{item.product_type}</td>
                                                                    <td className="px-3 py-2">
                                                                        <Input
                                                                            type="number"
                                                                            className="text-right w-40 ml-auto"
                                                                            value={item.sell_back_price}
                                                                            onChange={(e) => updatePrice(item.product_id, Number(e.target.value))}
                                                                            disabled={!item.selected}
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Total and Submit */}
                                {selectedItems.length > 0 && (
                                    <Card>
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="text-lg font-semibold">Tổng tiền bán lại:</span>
                                                <span className="text-2xl font-bold text-purple-600">
                                                    {formatCurrency(totalAmount)}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    className="flex-1"
                                                    onClick={() => {
                                                        setSelectedOrder(null);
                                                        setSellBackItems([]);
                                                    }}
                                                >
                                                    <X className="h-4 w-4 mr-2" />
                                                    Hủy
                                                </Button>
                                                <Button
                                                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                                                    onClick={handleSubmit}
                                                    disabled={submitting || selectedItems.length === 0}
                                                >
                                                    <Package className="h-4 w-4 mr-2" />
                                                    {submitting ? 'Đang xử lý...' : 'Xác nhận bán lại NSX'}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </>
                        ) : (
                            <Card>
                                <CardContent className="p-8 text-center text-gray-500">
                                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                    <p>Chọn một đơn đặt hàng NSX từ danh sách bên trái để bán lại</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
                {/* Popup Modal */}
                {popupInfo && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setPopupInfo(null)}>
                        <Card className="w-96 max-w-full m-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                            <CardHeader className="pb-2 text-center border-b">
                                <CardTitle className={popupInfo.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'}>
                                    {popupInfo.type === 'warning' ? 'Cảnh báo' : (popupInfo.data.swap_info ? 'Chi tiết Hoán đổi' : 'Chi tiết Mua lại')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {popupInfo.type === 'warning' ? (
                                    <div className="flex flex-col items-center gap-4 text-center">
                                        <AlertTriangle className="h-12 w-12 text-yellow-500" />
                                        <p className="font-medium text-gray-900">
                                            Sản phẩm đã cọc nhưng chưa khách hàng bán lại cho cửa hàng
                                        </p>
                                        {popupInfo.data.sale_info && (
                                            <div className="text-sm text-gray-600 mt-2 text-left w-full bg-gray-50 p-3 rounded border">
                                                <div className="flex justify-between mb-1">
                                                    <span className="font-medium">Khách hàng:</span>
                                                    <span>{popupInfo.data.sale_info.customer_name}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="font-medium">Ngày bán:</span>
                                                    <span>{formatDateTime(popupInfo.data.sale_info.created_at)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {popupInfo.data.buyback_info ? (
                                            <div className="text-sm">
                                                <div className="text-xs font-medium text-gray-400 uppercase mb-2">Mua lại</div>
                                                <div className="flex justify-between items-center py-2 border-b">
                                                    <span className="text-gray-500">Mã giao dịch</span>
                                                    <span className="font-bold text-gray-900">{popupInfo.data.buyback_info.transaction_code || '-'}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-2 border-b">
                                                    <span className="text-gray-500">Người bán lại</span>
                                                    <span className="font-medium text-gray-900">{popupInfo.data.buyback_info.customer_name || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-2">
                                                    <span className="text-gray-500">Thời gian</span>
                                                    <span className="font-medium text-gray-900">{formatDateTime(popupInfo.data.buyback_info.created_at)}</span>
                                                </div>
                                            </div>
                                        ) : null}
                                        {popupInfo.data.swap_info ? (
                                            <div className="text-sm">
                                                <div className="text-xs font-medium text-gray-400 uppercase mb-2">Hoán đổi</div>
                                                <div className="flex justify-between items-center py-2 border-b">
                                                    <span className="text-gray-500">Mã giao dịch</span>
                                                    <span className="font-bold text-gray-900">{popupInfo.data.swap_info.transaction_code || '-'}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-2 border-b">
                                                    <span className="text-gray-500">Ghi chú</span>
                                                    <span className="font-medium text-gray-900">{popupInfo.data.swap_info.customer_name || 'Hoán đổi'}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-2">
                                                    <span className="text-gray-500">Thời gian</span>
                                                    <span className="font-medium text-gray-900">{formatDateTime(popupInfo.data.swap_info.created_at)}</span>
                                                </div>
                                            </div>
                                        ) : null}
                                        {!popupInfo.data.buyback_info && !popupInfo.data.swap_info && (
                                            <p className="text-center text-gray-500">Không có thông tin.</p>
                                        )}
                                    </div>
                                )}
                                <div className="mt-6">
                                    <Button className="w-full" onClick={() => setPopupInfo(null)}>Đóng</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
