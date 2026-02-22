
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { ArrowLeft, Save } from 'lucide-react';
import { formatCurrency } from '../lib/utils';


interface Store { id: number; name: string; }
interface Customer { id: number; name: string; phone_number: string; }
interface TransactionItem {
    id: number;
    product_type: string;
    product: { product_type: string; id: number };
    quantity: number;
    price_at_time: number;
}
interface Transaction {
    id: number;
    transaction_code: string;
    created_at: string;
    store_id: number;
    customer_id: number;
    customer: Customer;
    payment_method: string;
    cash_amount: number;
    bank_transfer_amount: number;
    items: TransactionItem[];
}

export function EditOrder() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<Transaction | null>(null);
    const [stores, setStores] = useState<Store[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);

    // Form State
    const [selectedStore, setSelectedStore] = useState<number>(0);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [searchCustomer, setSearchCustomer] = useState('');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'mixed'>('cash');
    const [cashAmount, setCashAmount] = useState<number>(0);
    // bank amount is derived or stored? stored.

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [orderRes, storesRes, customersRes] = await Promise.all([
                    axios.get(`/api/v1/transactions/${id}`),
                    axios.get('/api/v1/stores/'),
                    axios.get('/api/v1/customers/?limit=1000') // Fetch all for search
                ]);

                const orderData = orderRes.data;
                setOrder(orderData);
                setStores(storesRes.data);
                setCustomers(customersRes.data);

                // Init Form
                setSelectedStore(orderData.store_id);
                setSelectedCustomer(orderData.customer);
                if (orderData.customer) setSearchCustomer(orderData.customer.name);

                // Date formatting for input datetime-local
                // orderData.created_at is ISO. Input needs "YYYY-MM-DDTHH:mm" locally?
                // Using helper if available, else raw substring
                if (orderData.created_at) {
                    // Assuming created_at is strictly ISO from backend
                    const dateObj = new Date(orderData.created_at);
                    // Adjust to local time for input
                    // This is tricky. Let's use existing Utils or simple offset
                    // If backend sends UTC, we want to show Hanoi time.
                    // Let's assume input expects local time string.
                    // A simple way to fmt for datetime-local:
                    const tzOffset = dateObj.getTimezoneOffset() * 60000; // in ms
                    const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().slice(0, 16);
                    setSelectedDate(localISOTime);
                }

                setPaymentMethod((orderData.payment_method as any) || 'cash');
                setCashAmount(orderData.cash_amount || 0);

            } catch (error) {
                console.error("Failed to load order", error);
                alert("Không thể tải đơn hàng");
                navigate('/edit-orders');
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchData();
    }, [id, navigate]);

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
        (c.phone_number && c.phone_number.includes(searchCustomer))
    );

    const handleUpdate = async () => {
        if (!selectedStore || !selectedCustomer || !selectedDate) {
            alert("Vui lòng điền đầy đủ thông tin");
            return;
        }

        // Calculate total from items to validate payment
        const totalAmount = order?.items.reduce((sum, item) => sum + item.price_at_time, 0) || 0;
        let bankAmount = 0;

        if (paymentMethod === 'mixed') {
            bankAmount = totalAmount - cashAmount;
        } else if (paymentMethod === 'bank_transfer') {
            bankAmount = totalAmount;
        }
        // cashAmount is already set for 'cash' (it's ignored by backend logic usually? No, explicitly sent)
        const finalCash = paymentMethod === 'cash' ? totalAmount : cashAmount;

        try {
            const payload = {
                store_id: selectedStore,
                customer_id: selectedCustomer.id,
                created_at: new Date(selectedDate).toISOString(),
                payment_method: paymentMethod,
                cash_amount: finalCash,
                bank_transfer_amount: bankAmount
            };

            await axios.put(`/api/v1/transactions/order/${id}`, payload);
            alert("Cập nhật thành công!");
            navigate('/edit-orders');
        } catch (error) {
            console.error(error);
            alert("Cập nhật thất bại");
        }
    };

    if (loading) return <div className="p-6">Loading...</div>;
    if (!order) return <div className="p-6">Order not found</div>;

    const totalAmount = order.items.reduce((sum, item) => sum + item.price_at_time, 0);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => navigate('/edit-orders')}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Sửa đơn hàng {order.transaction_code || `#${order.id}`}
                        </h1>
                    </div>
                    <Button onClick={handleUpdate}>
                        <Save className="h-4 w-4 mr-2" /> Lưu thay đổi
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader><CardTitle>Thông tin chung</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Cửa hàng</label>
                                <select
                                    className="w-full rounded-md border border-gray-300 p-2"
                                    value={selectedStore}
                                    onChange={e => setSelectedStore(Number(e.target.value))}
                                >
                                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Ngày tạo</label>
                                <Input
                                    type="datetime-local"
                                    value={selectedDate}
                                    onChange={e => setSelectedDate(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Khách hàng</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Tìm khách hàng</label>
                                <Input
                                    placeholder="Tên hoặc SĐT..."
                                    value={searchCustomer}
                                    onChange={e => {
                                        setSearchCustomer(e.target.value);
                                        // Don't clear selectedCustomer immediately to allow editing text without losing selection
                                    }}
                                />
                                {searchCustomer && searchCustomer !== selectedCustomer?.name && (
                                    <div className="mt-2 max-h-40 overflow-y-auto border rounded bg-white absolute z-10 w-full max-w-sm shadow-lg">
                                        {filteredCustomers.map(c => (
                                            <div
                                                key={c.id}
                                                className="p-2 hover:bg-gray-100 cursor-pointer"
                                                onClick={() => {
                                                    setSelectedCustomer(c);
                                                    setSearchCustomer(c.name);
                                                }}
                                            >
                                                {c.name} - {c.phone_number}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {selectedCustomer && (
                                <div className="bg-green-50 p-2 rounded text-green-800 text-sm">
                                    Đang chọn: <strong>{selectedCustomer.name}</strong> - {selectedCustomer.phone_number}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Thanh toán</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2">
                                    <input type="radio" name="payment" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} /> Tiền mặt
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="radio" name="payment" checked={paymentMethod === 'bank_transfer'} onChange={() => setPaymentMethod('bank_transfer')} /> Chuyển khoản
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="radio" name="payment" checked={paymentMethod === 'mixed'} onChange={() => setPaymentMethod('mixed')} /> Tiền mặt + CK
                                </label>
                            </div>

                            {paymentMethod === 'mixed' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Số tiền mặt</label>
                                    <Input
                                        type="number"
                                        value={cashAmount}
                                        onChange={e => setCashAmount(Number(e.target.value))}
                                    />
                                    <div className="text-sm text-gray-500 mt-1">
                                        Chuyển khoản: {formatCurrency(totalAmount - cashAmount)}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader><CardTitle>Sản phẩm (Chỉ xem)</CardTitle></CardHeader>
                    <CardContent>
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-2 text-left">ID</th>
                                    <th className="p-2 text-left">Loại</th>
                                    <th className="p-2 text-right">Giá</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.map(item => (
                                    <tr key={item.id} className="border-t">
                                        <td className="p-2 font-medium">#{item.product?.id}</td>
                                        <td className="p-2">{item.product?.product_type || item.product_type}</td>
                                        <td className="p-2 text-right">{formatCurrency(item.price_at_time)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="font-bold bg-gray-50">
                                <tr>
                                    <td colSpan={2} className="p-2 text-right">Tổng:</td>
                                    <td className="p-2 text-right">{formatCurrency(totalAmount)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
