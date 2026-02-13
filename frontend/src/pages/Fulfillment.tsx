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
interface Product { id: number; product_type: string; status: string; last_price: number; is_delivered?: boolean; }
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
}

interface FulfillmentItem {
    product_id: number;
    product_type: string;
    price: number;
    is_delivered?: boolean;
}

export function Fulfillment() {
    const navigate = useNavigate();

    // State
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchCustomer, setSearchCustomer] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    const [customerTransactions, setCustomerTransactions] = useState<Transaction[]>([]);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    const [fulfillmentItems, setFulfillmentItems] = useState<FulfillmentItem[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(nowHanoiLocal());
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);

    const [showWarningModal, setShowWarningModal] = useState(false);

    // Fetch data on mount
    useEffect(() => {
        fetchCustomers();
        fetchStaff();
    }, []);

    // Fetch customer transactions when customer is selected
    useEffect(() => {
        if (selectedCustomer) {
            fetchCustomerTransactions(selectedCustomer.id);
        } else {
            setCustomerTransactions([]);
            setSelectedTransaction(null);
            setFulfillmentItems([]);
        }
    }, [selectedCustomer]);

    const fetchCustomers = async () => {
        try {
            const res = await axios.get('/api/v1/customers/?limit=200');
            setCustomers(res.data);
        } catch (e) {
            console.error("Failed to fetch customers", e);
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
        try {
            // Fetch all transactions for customer; filter to sale orders (Đơn cọc) on the client
            // so we avoid any backend tx_type encoding mismatch
            const res = await axios.get(`/api/v1/transactions/customer/${customerId}`);
            const list = Array.isArray(res.data) ? res.data : [];
            const saleOnly = list.filter((tx: Transaction) => tx.type === 'Đơn cọc');
            setCustomerTransactions(saleOnly);
        } catch (e) {
            console.error("Failed to fetch customer transactions", e);
            setCustomerTransactions([]);
        }
    };

    // Filter customers for display
    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
        (c.phone_number && c.phone_number.includes(searchCustomer)) ||
        (c.cccd && c.cccd.includes(searchCustomer))
    );

    const selectTransaction = (tx: Transaction) => {
        if (tx.order_status === 'managed' || tx.order_status === 'Mua lại' || tx.order_status === 'Đã giao' || tx.order_status === 'Bán lại NSX') {
            // Don't select if already processed
            return;
        }

        setSelectedTransaction(tx);
        // Pre-populate fulfillment items from transaction items
        // Only include items that have status 'sold' (not yet delivered)
        const items: FulfillmentItem[] = tx.items
            .filter(item => item.product.status === 'Đã bán')
            .map(item => ({
                product_id: item.product_id,
                product_type: item.product.product_type,
                price: item.price_at_time,
                is_delivered: item.product.is_delivered
            }));
        setFulfillmentItems(items);
    };

    const removeItem = (productId: number) => {
        setFulfillmentItems(items => items.filter(item => item.product_id !== productId));
    };

    const totalAmount = fulfillmentItems.reduce((sum, item) => sum + item.price, 0);

    const handleSubmit = async () => {
        if (!selectedTransaction) {
            alert("Please select a transaction");
            return;
        }
        if (fulfillmentItems.length === 0) {
            alert("Please add at least one item to fulfill");
            return;
        }
        if (!selectedStaffId) {
            alert("Please select a staff member");
            return;
        }

        // Check for non-delivered items
        const hasUndeliveredItems = fulfillmentItems.some(item => !item.is_delivered);
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
            alert("Fulfillment completed successfully! Products delivered to customer.");
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
        return !tx.order_status; // Processable if status is null/undefined
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
                                    if (selectedCustomer) {
                                        setSelectedCustomer(null);
                                    }
                                }}
                            />
                        </div>

                        {searchCustomer && !selectedCustomer && (
                            <div className="max-h-48 overflow-y-auto border rounded bg-white">
                                {filteredCustomers.map(c => (
                                    <div
                                        key={c.id}
                                        className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                                        onClick={() => {
                                            setSelectedCustomer(c);
                                            setSearchCustomer(c.name);
                                        }}
                                    >
                                        <div className="font-medium">{c.name}</div>
                                        <div className="text-sm text-gray-500">
                                            Phone: {c.phone_number || 'N/A'} | CCCD: {c.cccd || 'N/A'}
                                        </div>
                                    </div>
                                ))}
                                {filteredCustomers.length === 0 && (
                                    <div className="p-3 text-gray-500">Không tìm thấy khách hàng</div>
                                )}
                            </div>
                        )}

                        {selectedCustomer && (
                            <div className="bg-purple-50 p-3 rounded text-purple-800">
                                <div className="font-medium">Selected: {selectedCustomer.name}</div>
                                <div className="text-sm">
                                    Phone: {selectedCustomer.phone_number || 'N/A'} | CCCD: {selectedCustomer.cccd || 'N/A'}
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
                                                            <div className="font-medium">Order #{tx.id}</div>
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
                                                            Store: {tx.store?.name || 'N/A'} | Staff: {tx.staff?.staff_name || 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-medium text-purple-600">
                                                            {formatCurrency(tx.items.reduce((sum, item) => sum + item.price_at_time, 0))}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {tx.items.length} item(s)
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Show items preview */}
                                                <div className="mt-2 text-sm text-gray-600">
                                                    {tx.items.map(item => (
                                                        <span key={item.id} className={`inline-block mr-2 px-2 py-0.5 rounded text-xs ${item.product.status === 'Đã bán'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : item.product.status === 'Đã giao'
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-gray-100 text-gray-500'
                                                            }`}>
                                                            #{item.product_id} {item.product.product_type} ({item.product.status})
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
                                    <label className="block text-sm font-medium mb-1">Staff</label>
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
                                                <th className="p-2 text-left">Sản phẩm</th>
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
                                                    </td>
                                                    <td className="p-2">{item.product_type}</td>
                                                    <td className="p-2">
                                                        {item.is_delivered ? (
                                                            <span className="text-green-600 font-medium">Có sẵn trong kho</span>
                                                        ) : (
                                                            <span className="text-orange-600 font-medium">Chưa nhận được hàng từ NSX</span>
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
                                variant="ghost"
                                onClick={() => setShowWarningModal(false)}
                                className="text-gray-600"
                            >
                                Hủy bỏ
                            </Button>
                            <Button
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

