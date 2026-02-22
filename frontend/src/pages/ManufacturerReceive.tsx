import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ArrowLeft, PackageCheck, Check, X } from 'lucide-react';
import { formatDate, formatTime, todayHanoi, nowHanoiLocal, hanoiToISO } from '../lib/dateUtils';

// Types
interface Product {
    id: number;
    product_code?: string;
    product_type: string;
    status: string;
    last_price: number;
    store_id: number;
    is_ordered?: boolean;
    is_delivered?: boolean;
    customer_name?: string;
    store_name?: string;
    store?: Store;
    received_date?: string;
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

interface ReceiveItem {
    product_id: number;
    product_code?: string;
    product_type: string;
    price: number;
    selected: boolean;
    customer_name?: string;
    store_name?: string;
}

export function ManufacturerReceive() {
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
    const [receiveItems, setReceiveItems] = useState<ReceiveItem[]>([]);
    const [selectedStaffId, setSelectedStaffId] = useState<number>(0);
    const [receiveDate, setReceiveDate] = useState<string>(nowHanoiLocal());

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

    const selectOrder = (order: Transaction) => {
        setSelectedOrder(order);
        // Strict filtering: 
        // - 'Đã đặt hàng'
        // - 'Đã bán' AND is_ordered (Customer deposit that was ordered from manufacturer)
        // - 'Có sẵn' AND is_ordered (Store inventory ordered from manufacturer)
        const items: ReceiveItem[] = order.items
            .filter(item => {
                const status = item.product?.status ?? '';
                const isOrdered = item.product?.is_ordered === true;

                return status === 'Đã đặt hàng' ||
                    (status === 'Đã bán' && isOrdered) ||
                    (status === 'Có sẵn' && isOrdered);
            })
            .map(item => ({
                product_id: item.product_id,
                product_code: item.product.product_code,
                product_type: item.product.product_type,
                price: item.price_at_time,
                selected: true,
                customer_name: item.product?.customer_name ?? undefined,
                store_name: item.product?.store?.name ?? undefined
            }));
        setReceiveItems(items);
    };

    const toggleItem = (productId: number) => {
        setReceiveItems(prev =>
            prev.map(item =>
                item.product_id === productId
                    ? { ...item, selected: !item.selected }
                    : item
            )
        );
    };

    const selectedItems = receiveItems.filter(item => item.selected);

    const handleSubmit = async () => {
        if (selectedItems.length === 0) {
            alert("Vui lòng chọn ít nhất một sản phẩm để nhận hàng");
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
                    price: item.price
                })),
                created_at: hanoiToISO(receiveDate)
            };

            await axios.post('/api/v1/transactions/manufacturer-receive', payload);
            alert('Nhận hàng NSX thành công!');
            setSelectedOrder(null);
            setReceiveItems([]);
            fetchMfrOrders(); // Refresh
        } catch (error: any) {
            alert(`Lỗi: ${error.response?.data?.detail || 'Không thể xử lý nhận hàng'}`);
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    // Check if there are any items that CAN be received 
    const hasReceivableItems = (order: Transaction): boolean => {
        return order.items.some(item => {
            const status = item.product?.status ?? '';
            const isOrdered = item.product?.is_ordered === true;
            return status === 'Đã đặt hàng' ||
                (status === 'Đã bán' && isOrdered) ||
                (status === 'Có sẵn' && isOrdered);
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900">
                        <PackageCheck className="inline-block mr-2 h-8 w-8 text-orange-600" />
                        Nhận hàng NSX
                    </h1>
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
                                        const canReceive = hasReceivableItems(order);
                                        const isSelected = selectedOrder?.id === order.id;

                                        return (
                                            <div
                                                key={order.id}
                                                onClick={() => canReceive && selectOrder(order)}
                                                className={`border rounded-lg p-4 transition-all
                                                    ${!canReceive
                                                        ? 'opacity-50 cursor-not-allowed bg-gray-50'
                                                        : 'cursor-pointer hover:border-green-400 hover:shadow-sm'}
                                                    ${isSelected ? 'border-green-500 bg-green-50 ring-2 ring-green-200' : ''}
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
                                                            {!canReceive && (
                                                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">
                                                                    Đã xử lý xong
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
                                                                ${item.product.status === 'Đã nhận hàng NSX'
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-gray-100 text-gray-700'}
                                                            `}
                                                        >
                                                            #{item.product_id}
                                                            {item.product.product_code && <span className="font-mono ml-1 text-[10px] text-gray-500">({item.product.product_code})</span>}
                                                            {' '}{item.product.product_type}
                                                            {item.product.status === 'Đã nhận hàng NSX' && (
                                                                <span className="ml-1 font-medium">
                                                                    ✓ {item.product.received_date ? `(${formatTime(item.product.received_date)} ${formatDate(item.product.received_date)})` : ''}
                                                                </span>
                                                            )}
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

                    {/* Right: Receive Form */}
                    <div className="space-y-4">
                        {selectedOrder ? (
                            <>
                                {/* Receive Details */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-green-600">
                                            Nhận hàng - Đơn #{selectedOrder.id}
                                            {selectedOrder.code && ` (${selectedOrder.code})`}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Date/Time */}
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Ngày giờ nhận</label>
                                            <Input
                                                type="datetime-local"
                                                value={receiveDate}
                                                onChange={(e) => setReceiveDate(e.target.value)}
                                            />
                                        </div>

                                        {/* Staff */}
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Nhân viên nhận</label>
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

                                {/* Products to receive */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Sản phẩm nhận ({selectedItems.length}/{receiveItems.length})</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {receiveItems.length === 0 ? (
                                            <p className="text-gray-500 text-center py-4">
                                                Không có sản phẩm nào hợp lệ (chưa nhận hàng) để xử lý.
                                            </p>
                                        ) : (
                                            <div className="space-y-3">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-100">
                                                        <tr>
                                                            <th className="px-3 py-2 text-center w-12">Chọn</th>
                                                            <th className="px-3 py-2 text-left">SP</th>
                                                            <th className="px-3 py-2 text-left">Loại</th>
                                                            <th className="px-3 py-2 text-left">Cửa hàng nhận</th>
                                                            <th className="px-3 py-2 text-left">Khách hàng nhận</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {receiveItems.map(item => (
                                                            <tr key={item.product_id} className="border-b">
                                                                <td className="px-3 py-2 text-center">
                                                                    <button
                                                                        onClick={() => toggleItem(item.product_id)}
                                                                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors
                                                                            ${item.selected
                                                                                ? 'bg-green-500 border-green-500 text-white'
                                                                                : 'border-gray-300 hover:border-green-400'
                                                                            }`}
                                                                    >
                                                                        {item.selected && <Check className="h-4 w-4" />}
                                                                    </button>
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <div>#{item.product_id}</div>
                                                                    <div className="text-xs text-gray-500 font-mono">{item.product_code || '-'}</div>
                                                                </td>
                                                                <td className="px-3 py-2">{item.product_type}</td>
                                                                <td className="px-3 py-2 text-gray-700">
                                                                    {item.store_name || '-'}
                                                                </td>
                                                                <td className="px-3 py-2 text-gray-700">
                                                                    {item.customer_name || '—'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Submit */}
                                {selectedItems.length > 0 && (
                                    <Card>
                                        <CardContent className="p-4">
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="flex-1"
                                                    onClick={() => {
                                                        setSelectedOrder(null);
                                                        setReceiveItems([]);
                                                    }}
                                                >
                                                    <X className="h-4 w-4 mr-2" />
                                                    Hủy
                                                </Button>
                                                <Button
                                                    type="button"
                                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                                    onClick={handleSubmit}
                                                    disabled={submitting || selectedItems.length === 0}
                                                >
                                                    <PackageCheck className="h-4 w-4 mr-2" />
                                                    {submitting ? 'Đang xử lý...' : 'Xác nhận nhận hàng'}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </>
                        ) : (
                            <Card>
                                <CardContent className="p-8 text-center text-gray-500">
                                    <PackageCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                    <p>Chọn một đơn đặt hàng NSX từ danh sách bên trái để nhận hàng</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
