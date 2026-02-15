import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Trash } from 'lucide-react';
import { nowHanoiLocal, hanoiToISO } from '../lib/dateUtils';

// Types
interface Store { id: number; name: string; }
interface Customer { id: number; name: string; phone_number: string; cccd: string; }
interface OrderItem { product_type: string; quantity: number; price: number; is_new: boolean; product_id?: number; }
interface AvailableProduct { id: number; product_type: string; last_price: number; store_id: number; store_name: string; }

export function NewOrder() {
    const navigate = useNavigate();

    // State
    const [stores, setStores] = useState<Store[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);

    const [selectedStore, setSelectedStore] = useState<number>(0);
    const [selectedDate, setSelectedDate] = useState<string>(nowHanoiLocal());
    const [searchCustomer, setSearchCustomer] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: '', phone_number: '', cccd: '', address: '' });

    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash');
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

    // New Item State
    const [newItemType, setNewItemType] = useState('1 lượng');
    const [newItemParams, setNewItemParams] = useState({ quantity: 1, price: 0 });

    // Available Products State
    const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([]);
    const [selectedAvailableProduct, setSelectedAvailableProduct] = useState<AvailableProduct | null>(null);
    const [itemMode, setItemMode] = useState<'new' | 'available'>('new');

    // Fetch Data
    useEffect(() => {
        fetchStores();
        fetchCustomers();
        fetchAvailableProducts();
    }, []);

    const fetchStores = async () => {
        try {
            const res = await axios.get('/api/v1/stores/');
            setStores(res.data);
            if (res.data.length > 0) setSelectedStore(res.data[0].id);
        } catch (e) {
            console.error("Failed to fetch stores", e);
        }
    };

    const fetchAvailableProducts = async () => {
        try {
            const res = await axios.get('/api/v1/products/available');
            setAvailableProducts(res.data);
        } catch (e) {
            console.error("Failed to fetch available products", e);
        }
    };

    const fetchCustomers = async () => {
        try {
            // Mocking search via list for now
            const res = await axios.get('/api/v1/customers/?limit=100');
            setCustomers(res.data);
        } catch (e) { console.error(e); }
    };

    const createCustomer = async () => {
        try {
            const res = await axios.post('/api/v1/customers/', newCustomer);
            const created = res.data;
            setCustomers([...customers, created]);
            setSelectedCustomer(created);
            setSearchCustomer(created.name);
            setIsCreatingCustomer(false);
            alert("Tạo khách hàng thành công");
        } catch (e) {
            console.error(e);
            alert("Tạo khách hàng thất bại");
        }
    };

    // Filter customers for display
    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
        (c.phone_number && c.phone_number.includes(searchCustomer))
    );

    const addItem = () => {
        if (itemMode === 'new') {
            if (newItemParams.price <= 0) {
                alert("Giá phải lớn hơn 0");
                return;
            }
            setOrderItems([...orderItems, {
                product_type: newItemType,
                quantity: newItemParams.quantity,
                price: newItemParams.price,
                is_new: true
            }]);
            setNewItemParams({ ...newItemParams, quantity: 1 });
        } else {
            // Available product mode
            if (!selectedAvailableProduct) {
                alert("Vui lòng chọn sản phẩm có sẵn");
                return;
            }
            if (newItemParams.price <= 0) {
                alert("Giá phải lớn hơn 0");
                return;
            }
            setOrderItems([...orderItems, {
                product_type: selectedAvailableProduct.product_type,
                quantity: 1, // Available products are individual items
                price: newItemParams.price,
                is_new: false,
                product_id: selectedAvailableProduct.id
            }]);
            // Remove the selected product from available list
            setAvailableProducts(availableProducts.filter(p => p.id !== selectedAvailableProduct.id));
            setSelectedAvailableProduct(null);
        }
    };

    const removeItem = (index: number) => {
        setOrderItems(orderItems.filter((_, i) => i !== index));
    };

    const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleSubmit = async () => {
        if (!selectedCustomer) {
            alert("Vui lòng chọn khách hàng");
            return;
        }
        if (!selectedStore) {
            alert("Vui lòng chọn cửa hàng");
            return;
        }

        try {
            const payload = {
                staff_id: 1, // HARDCODED for now as AuthContext lacks ID
                customer_id: selectedCustomer.id,
                store_id: selectedStore,
                items: orderItems,
                created_at: hanoiToISO(selectedDate),
                payment_method: paymentMethod
            };
            console.log("Submitting:", payload);
            await axios.post('/api/v1/transactions/order', payload);
            alert("Tạo đơn hàng thành công");
            navigate('/dashboard');
        } catch (e) {
            alert("Tạo đơn hàng thất bại");
            console.error(e);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <h1 className="text-3xl font-bold text-gray-900">Create New Order</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Store & Date */}
                    <Card>
                        <CardHeader><CardTitle>Store & Date</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Store</label>
                                <select
                                    className="w-full rounded-md border border-gray-300 p-2"
                                    value={selectedStore}
                                    onChange={(e) => setSelectedStore(Number(e.target.value))}
                                >
                                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Date</label>
                                <Input
                                    type="datetime-local"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Customer */}
                    <Card>
                        <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {!isCreatingCustomer ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Search Customer</label>
                                        <Input
                                            placeholder="Name or Phone..."
                                            value={searchCustomer}
                                            onChange={(e) => {
                                                setSearchCustomer(e.target.value);
                                                setSelectedCustomer(null); // Reset selection on search
                                            }}
                                        />
                                        {searchCustomer && !selectedCustomer && (
                                            <div className="mt-2 max-h-40 overflow-y-auto border rounded bg-white">
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
                                                {filteredCustomers.length === 0 && (
                                                    <div className="p-2 text-gray-500">No customers found.</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <Button variant="secondary" onClick={() => setIsCreatingCustomer(true)}>
                                        + Tạo khách hàng mới
                                    </Button>
                                </>
                            ) : (
                                <div className="space-y-3 border p-3 rounded">
                                    <h4 className="font-semibold">Khách hàng mới</h4>
                                    <Input placeholder="Tên" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} />
                                    <Input placeholder="Số điện thoại" value={newCustomer.phone_number} onChange={e => setNewCustomer({ ...newCustomer, phone_number: e.target.value })} />
                                    <Input placeholder="CCCD" value={newCustomer.cccd} onChange={e => setNewCustomer({ ...newCustomer, cccd: e.target.value })} />
                                    <Input placeholder="Địa chỉ" value={newCustomer.address} onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })} />
                                    <div className="flex gap-2">
                                        <Button onClick={createCustomer}>Lưu</Button>
                                        <Button variant="ghost" onClick={() => setIsCreatingCustomer(false)}>Cancel</Button>
                                    </div>
                                </div>
                            )}
                            {selectedCustomer && (
                                <div className="bg-green-50 p-2 rounded text-green-800 text-sm">
                                    Selected: <strong>{selectedCustomer.name}</strong> ({selectedCustomer.phone_number})
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Items */}
                <Card>
                    <CardHeader><CardTitle>Items</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {/* Mode Selection */}
                        <div className="flex gap-4 mb-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="itemMode"
                                    checked={itemMode === 'new'}
                                    onChange={() => setItemMode('new')}
                                />
                                <span>Sản phẩm mới</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="itemMode"
                                    checked={itemMode === 'available'}
                                    onChange={() => setItemMode('available')}
                                />
                                <span>Sản phẩm có sẵn trong kho</span>
                            </label>
                        </div>

                        <div className="flex gap-2 items-end flex-wrap">
                            {itemMode === 'new' ? (
                                <>
                                    <div className="w-1/3 min-w-[150px]">
                                        <label className="block text-sm font-medium mb-1">Loại</label>
                                        <select
                                            className="w-full rounded-md border border-gray-300 p-2"
                                            value={newItemType}
                                            onChange={(e) => setNewItemType(e.target.value)}
                                        >
                                            <option value="1 lượng">1 lượng</option>
                                            <option value="5 lượng">5 lượng</option>
                                            <option value="1 kg">1 kg</option>
                                        </select>
                                    </div>
                                    <div className="w-20">
                                        <label className="block text-sm font-medium mb-1">Số lượng</label>
                                        <Input
                                            type="number"
                                            value={newItemParams.quantity}
                                            onChange={(e) => setNewItemParams({ ...newItemParams, quantity: Number(e.target.value) })}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="w-2/3 min-w-[250px]">
                                    <label className="block text-sm font-medium mb-1">Select Available Product</label>
                                    <select
                                        className="w-full rounded-md border border-gray-300 p-2"
                                        value={selectedAvailableProduct?.id || ''}
                                        onChange={(e) => {
                                            const pid = Number(e.target.value);
                                            const p = availableProducts.find(prod => prod.id === pid);
                                            setSelectedAvailableProduct(p || null);
                                            if (p) setNewItemParams({ ...newItemParams, price: p.last_price || 0 });
                                        }}
                                    >
                                        <option value="">-- Chọn sản phẩm --</option>
                                        {availableProducts.map(p => (
                                            <option key={p.id} value={p.id}>
                                                #{p.id} {p.product_type} - {p.store_name || 'N/A'} - {p.last_price?.toLocaleString()} VND
                                            </option>
                                        ))}
                                    </select>
                                    {selectedAvailableProduct && (
                                        <div className="mt-2 text-sm text-blue-600">
                                            Đã chọn: #{selectedAvailableProduct.id} {selectedAvailableProduct.product_type}
                                            | Cửa hàng: {selectedAvailableProduct.store_name}
                                            | Giá cuối: {selectedAvailableProduct.last_price?.toLocaleString()} VND
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="w-1/3 min-w-[150px]">
                                <label className="block text-sm font-medium mb-1">Giá (VND)</label>
                                <Input
                                    type="number"
                                    value={newItemParams.price}
                                    onChange={(e) => setNewItemParams({ ...newItemParams, price: Number(e.target.value) })}
                                />
                            </div>
                            <Button onClick={addItem}>Add Item</Button>
                        </div>

                        {orderItems.length > 0 && (
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-2 text-left">ID</th>
                                            <th className="p-2 text-left">Loại</th>
                                            <th className="p-2 text-right">Số lượng</th>
                                            <th className="p-2 text-right">Giá</th>
                                            <th className="p-2 text-right">Tổng</th>
                                            <th className="p-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orderItems.map((item, idx) => (
                                            <tr key={idx} className="border-t">
                                                <td className="p-2">
                                                    {item.product_id ? (
                                                        <span className="text-blue-600 font-medium">#{item.product_id}</span>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">New</span>
                                                    )}
                                                </td>
                                                <td className="p-2">{item.product_type}</td>
                                                <td className="p-2 text-right">{item.quantity}</td>
                                                <td className="p-2 text-right">{item.price.toLocaleString()}</td>
                                                <td className="p-2 text-right">{(item.price * item.quantity).toLocaleString()}</td>
                                                <td className="p-2 text-center">
                                                    <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700">
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

                {/* Payment & Submit */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <label className="block text-sm font-medium mb-2">Phương thức thanh toán</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="payment"
                                            checked={paymentMethod === 'cash'}
                                            onChange={() => setPaymentMethod('cash')}
                                        />
                                        <span>Tiền mặt</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="payment"
                                            checked={paymentMethod === 'bank_transfer'}
                                            onChange={() => setPaymentMethod('bank_transfer')}
                                        />
                                        <span>Chuyển khoản</span>
                                    </label>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Tổng tiền</p>
                                <p className="text-3xl font-bold text-blue-600">{totalAmount.toLocaleString()} VND</p>
                            </div>
                        </div>

                        <Button className="w-full text-lg py-6" onClick={handleSubmit} disabled={orderItems.length === 0 || !selectedCustomer}>
                            Tạo đơn hàng
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
