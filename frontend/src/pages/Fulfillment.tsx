import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Trash, Search, ArrowLeft, Package } from 'lucide-react';
import { formatDate, formatTime, nowHanoiLocal, hanoiToISO } from '../lib/dateUtils';

// Types
interface Store { id: number; name: string; }
interface Customer { id: number; name: string; phone_number: string; cccd: string; }
interface Staff { id: number; staff_name: string; }
interface Product { id: number; product_type: string; status: string; last_price: number; is_delivered?: boolean; product_code?: string; }
interface TransactionItem { id: number; product_id: number; price_at_time: number; product: Product; }
interface Transaction {
    id: number;
    type: string;
    created_at: string;
    customer: Customer;
    store: Store;
    staff: Staff;
    items: TransactionItem[];
    order_status?: string;
    transaction_code?: string;
}

interface FulfillmentItem {
    product_id: number;
    product_code?: string;
    product_type: string;
    price: number;
    is_delivered?: boolean;
    status: string;
}

const getProductBadgeClass = (status: string) => {
    switch (status) {
        case 'Đã bán': return 'bg-blue-100 text-blue-800';
        case 'Có sẵn': return 'bg-green-100 text-green-800';
        case 'Đã đặt hàng': return 'bg-purple-100 text-purple-800';
        case 'Đã giao': return 'bg-teal-100 text-teal-800';
        case 'Đã bán lại NSX': return 'bg-red-100 text-red-800';
        case 'Đã nhận hàng NSX': return 'bg-orange-100 text-orange-800';
        case 'Mua lại': return 'bg-indigo-100 text-indigo-800';
        default: return 'bg-gray-100 text-gray-600';
    }
};

export function Fulfillment() {
    const navigate = useNavigate();

    // State
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchCustomer, setSearchCustomer] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    const [customerTransactions, setCustomerTransactions] = useState<Transaction[]>([]);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    const [fulfillmentItems, setFulfillmentItems] = useState<FulfillmentItem[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(nowHanoiLocal());
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);

    const [showWarningModal, setShowWarningModal] = useState(false);

    // Fetch data on mount
    useEffect(() => {
        fetchStaff();
    }, []);

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchCustomer) {
                fetchCustomers(searchCustomer);
            } else {
                setCustomers([]);
            }
        }, 300); // 300ms delay

        return () => clearTimeout(timer);
    }, [searchCustomer]);

    // Fetch customer transactions when customer is selected
    useEffect(() => {
        if (selectedCustomer) {
            fetchCustomerTransactions(selectedCustomer.id);
            setSearchCustomer(selectedCustomer.name);
        } else {
            setCustomerTransactions([]);
            setSelectedTransaction(null);
            setFulfillmentItems([]);
        }
    }, [selectedCustomer]);

    const fetchCustomers = async (query: string) => {
        setIsSearching(true);
        try {
            const res = await axios.get(`/api/v1/customers/?search=${query}&limit=20`);
            setCustomers(res.data);
        } catch (e) {
            console.error("Failed to fetch customers", e);
        } finally {
            setIsSearching(false);
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

    const fetchCustomerTransactions = async (customerId: number) => {
        if (customerId == null || customerId === undefined) {
            setCustomerTransactions([]);
            return;
        }
        try {
            const res = await axios.get(`/api/v1/transactions/customer/${Number(customerId)}`);
            const allTransactions: Transaction[] = Array.isArray(res.data) ? res.data : [];

            // Filter only 'Đơn cọc' on frontend
            const saleTransactions = allTransactions.filter((tx: Transaction) => tx.type?.trim() === 'Đơn cọc');

            setCustomerTransactions(saleTransactions);
        } catch (e) {
            console.error("Không thể lấy danh sách giao dịch", e);
            setCustomerTransactions([]);
        }
    };

    const selectTransaction = (tx: Transaction) => {
        const isCompleted = tx.order_status === 'managed' || tx.order_status === 'Mua lại' || tx.order_status === 'Đã giao' || tx.order_status === 'Bán lại NSX';
        if (isCompleted) {
            // Don't select if already processed
            return;
        }

        setSelectedTransaction(tx);
        // Strict filtering: Only items with 'Đã nhận hàng NSX' status can be fulfilled/delivered to customer
        const items: FulfillmentItem[] = tx.items
            .filter(item => item.product.status === 'Đã nhận hàng NSX')
            .map(item => ({
                product_id: item.product_id,
                product_code: item.product.product_code,
                product_type: item.product.product_type,
                price: item.price_at_time,
                is_delivered: item.product.is_delivered,
                status: item.product.status
            }));
        setFulfillmentItems(items);
    };

    const removeItem = (productId: number) => {
        setFulfillmentItems(items => items.filter(item => item.product_id !== productId));
    };

    const totalAmount = fulfillmentItems.reduce((sum, item) => sum + item.price, 0);

    const handleSubmit = async () => {
        if (!selectedTransaction) {
            alert("Vui lòng chọn đơn hàng");
            return;
        }
        if (fulfillmentItems.length === 0) {
            alert("Vui lòng thêm ít nhất một sản phẩm");
            return;
        }
        if (!selectedStaffId) {
            alert("Vui lòng chọn nhân viên");
            return;
        }

        // Check for non-delivered items
        const hasUndeliveredItems = fulfillmentItems.some(item => item.status !== 'Đã nhận hàng NSX');
        if (hasUndeliveredItems) {
            setShowWarningModal(true);
            return;
        }

        await processFulfillment();
    };

    const processFulfillment = async () => {
        try {
            const payload = {
                original_transaction_id: selectedTransaction!.id,
                staff_id: selectedStaffId,
                store_id: selectedTransaction!.store?.id || 1,
                items: fulfillmentItems.map(item => ({
                    product_id: item.product_id
                })),
                created_at: hanoiToISO(selectedDate)
            };

            await axios.post('/api/v1/transactions/fulfillment', payload);
            alert("Đã giao hàng thành công");
            navigate('/dashboard');
        } catch (e: unknown) {
            const error = e as { response?: { data?: { detail?: string } } };
            alert(`Error: ${error.response?.data?.detail || 'Failed to process fulfillment'}`);
            console.error(e);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
    };

    // Helper to check if order is processable
    const isProcessable = (tx: Transaction) => {
        const isCompleted = tx.order_status === 'managed' || tx.order_status === 'Mua lại' || tx.order_status === 'Đã giao' || tx.order_status === 'Bán lại NSX';
        const hasReadyItems = tx.items.some(item => item.product.status === 'Đã nhận hàng NSX');
        return !isCompleted && hasReadyItems;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 relative">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900">
                        <Package className="inline-block mr-2 h-8 w-8 text-purple-600" />
                        Trả hàng cho khách hàng
                    </h1>
                </div>

                <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl border border-yellow-200 text-sm flex items-start gap-3">
                    <div className="font-bold shrink-0">⚠️ Lưu ý:</div>
                    <div>Chỉ mua lại đơn cọc ở đây, mua lại bạc vật lý trên phần mềm vàng.</div>
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
                                <span className="font-semibold text-gray-700">Giao hàng:</span>
                                <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap min-w-[90px] text-center">Đã nhận hàng NSX</span>
                                <span className="text-gray-400">→</span>
                                <span className="text-gray-600">Giao cho khách hàng</span>
                                <span className="text-gray-400">→</span>
                                <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap min-w-[90px] text-center">Đã giao</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Customer Search */}
                <Card>
                    <CardHeader><CardTitle>Tìm khách hàng</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                className="pl-10"
                                placeholder="Tìm kiếm theo tên, số điện thoại, CCCD..."
                                value={searchCustomer}
                                onChange={(e) => {
                                    setSearchCustomer(e.target.value);
                                    if (selectedCustomer && e.target.value !== selectedCustomer.name) {
                                        setSelectedCustomer(null);
                                    }
                                }}
                            />
                            {isSearching && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                                </div>
                            )}
                        </div>

                        {searchCustomer && !selectedCustomer && customers.length > 0 && (
                            <div className="max-h-48 overflow-y-auto border rounded bg-white">
                                {customers.map(c => (
                                    <div
                                        key={c.id}
                                        className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                                        onClick={() => {
                                            setSelectedCustomer(c);
                                        }}
                                    >
                                        <div className="font-medium">{c.name}</div>
                                        <div className="text-sm text-gray-500">
                                            Phone: {c.phone_number || 'N/A'} | CCCD: {c.cccd || 'N/A'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {searchCustomer && !selectedCustomer && customers.length === 0 && !isSearching && (
                            <div className="p-3 text-gray-500 border rounded bg-white">
                                Không tìm thấy khách hàng
                            </div>
                        )}

                        {selectedCustomer && (
                            <div className="bg-purple-50 p-3 rounded text-purple-800">
                                <div className="font-medium">Thông tin khách hàng: {selectedCustomer.name}</div>
                                <div className="text-sm">
                                    Số điện thoại: {selectedCustomer.phone_number || 'N/A'} | CCCD: {selectedCustomer.cccd || 'N/A'}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Customer Orders */}
                {selectedCustomer && (
                    <Card>
                        <CardHeader><CardTitle>Đơn hàng</CardTitle></CardHeader>
                        <CardContent>
                            {customerTransactions.length === 0 ? (
                                <p className="text-gray-500">Không có đơn hàng cho khách hàng này</p>
                            ) : (
                                <div className="space-y-2">
                                    {customerTransactions.map(tx => {
                                        const processable = isProcessable(tx);
                                        return (
                                            <div
                                                key={tx.id}
                                                className={`p-3 border rounded transition-colors ${!processable
                                                    ? 'bg-gray-100 cursor-not-allowed opacity-70'
                                                    : selectedTransaction?.id === tx.id
                                                        ? 'border-purple-500 bg-purple-50 cursor-pointer'
                                                        : 'hover:bg-gray-50 cursor-pointer'
                                                    }`}
                                                onClick={() => processable && selectTransaction(tx)}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-medium">
                                                                {tx.transaction_code ? (
                                                                    <span>{tx.transaction_code} <span className="text-gray-400 text-[0.65rem] leading-tight align-middle px-1 bg-gray-100 rounded-sm"> Đơn hàng số #{tx.id}</span></span>
                                                                ) : (
                                                                    <span>Đơn số #{tx.id}</span>
                                                                )}
                                                            </div>
                                                            {tx.order_status && (
                                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tx.order_status === 'Đã giao' ? 'bg-green-100 text-green-800' :
                                                                    tx.order_status === 'Mua lại' ? 'bg-blue-100 text-blue-800' :
                                                                        'bg-gray-200 text-gray-800'
                                                                    }`}>
                                                                    {tx.order_status.toUpperCase()}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {formatDate(tx.created_at)} {formatTime(tx.created_at)}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            Cửa hàng: {tx.store?.name || 'N/A'} | Nhân viên: {tx.staff?.staff_name || 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-medium text-purple-600">
                                                            {formatCurrency(tx.items.reduce((sum, item) => sum + item.price_at_time, 0))}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {tx.items.length} sản phẩm
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-3 flex flex-wrap gap-2 text-sm text-gray-600">
                                                    {tx.items.map(item => (
                                                        <div key={item.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-gray-50 border border-gray-100">
                                                            <span className="text-gray-500">Sản phẩm #{item.product_id}</span>
                                                            <span className="text-gray-300">|</span>
                                                            <span className="text-gray-600 font-medium">Loại: {item.product.product_type}</span>
                                                            <span className="text-gray-300">|</span>
                                                            <span className="text-gray-500">Trạng thái: </span>
                                                            <span className={`px-2 py-0.5 rounded font-semibold whitespace-nowrap text-center ${getProductBadgeClass(item.product.status || '')}`}>
                                                                {item.product.status}
                                                            </span>
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
                )}

                {/* Fulfillment Items */}
                {selectedTransaction && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Chi tiết giao hàng</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Ngày giờ</label>
                                    <Input
                                        type="datetime-local"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Nhân viên</label>
                                    <select
                                        className="w-full h-12 px-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500"
                                        value={selectedStaffId || ''}
                                        onChange={(e) => setSelectedStaffId(Number(e.target.value))}
                                    >
                                        {staffList.map(s => (
                                            <option key={s.id} value={s.id}>{s.staff_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Cửa hàng (từ đơn hàng)</label>
                                    <Input
                                        value={selectedTransaction.store?.name || 'N/A'}
                                        disabled
                                        className="bg-gray-100"
                                    />
                                </div>
                            </div>

                            {fulfillmentItems.length === 0 ? (
                                <p className="text-gray-500">Không có sản phẩm cần giao</p>
                            ) : (
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-purple-100">
                                            <tr>
                                                <th className="p-2 text-left">Sản phẩm (Mã SP)</th>
                                                <th className="p-2 text-left">Loại</th>
                                                <th className="p-2 text-left">Trạng thái</th>
                                                <th className="p-2 text-right">Giá</th>
                                                <th className="p-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {fulfillmentItems.map(item => (
                                                <tr key={item.product_id} className={`border-t ${!item.is_delivered ? 'bg-orange-50' : ''}`}>
                                                    <td className="p-2">
                                                        <span className="font-medium">#{item.product_id}</span>
                                                        {item.product_code && <span className="font-mono ml-1 text-[10px] text-gray-500">({item.product_code})</span>}
                                                    </td>
                                                    <td className="p-2">{item.product_type}</td>
                                                    <td className="p-2">
                                                        {item.status === 'Đã nhận hàng NSX' ? (
                                                            <span className="text-green-600 font-medium">Đã nhận hàng NSX</span>
                                                        ) : (
                                                            <span className="text-orange-600 font-medium">{item.status}</span>
                                                        )}
                                                    </td>
                                                    <td className="p-2 text-right">{formatCurrency(item.price)}</td>
                                                    <td className="p-2 text-center">
                                                        <button
                                                            onClick={() => removeItem(item.product_id)}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Submit */}
                {fulfillmentItems.length > 0 && (
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <p className="text-sm text-gray-500">Sản phẩm cần giao</p>
                                    <p className="text-2xl font-bold text-purple-600">{fulfillmentItems.length} sản phẩm</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">Tổng giá trị đơn hàng</p>
                                    <p className="text-3xl font-bold text-purple-600">{formatCurrency(totalAmount)}</p>
                                </div>
                            </div>

                            <Button
                                type="button"
                                className="w-full text-lg py-6 bg-purple-600 hover:bg-purple-700"
                                onClick={handleSubmit}
                                disabled={fulfillmentItems.length === 0}
                            >
                                <Package className="mr-2 h-5 w-5" />
                                Hoàn thành giao hàng
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Warning Modal */}
            {showWarningModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-white/30 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 text-orange-600 mb-4">
                            <div className="p-2 bg-orange-100 rounded-full">
                                <Package className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-bold">Cảnh báo</h3>
                        </div>

                        <p className="text-gray-700 mb-6">
                            Đơn đặt hàng chưa nhận được để trả hàng cho khách, bạn có muốn tiếp tục?
                        </p>

                        <div className="flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setShowWarningModal(false)}
                                className="text-gray-600"
                            >
                                Hủy bỏ
                            </Button>
                            <Button
                                type="button"
                                className="bg-orange-600 hover:bg-orange-700 text-white"
                                onClick={() => {
                                    setShowWarningModal(false);
                                    processFulfillment();
                                }}
                            >
                                Tiếp tục
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

