import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ArrowLeft, RefreshCw, AlertTriangle, Search, Package, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { nowHanoiLocal, hanoiToISO, formatDate, formatTime } from '../lib/dateUtils';
import { formatCurrency } from '../lib/utils';

// Types
interface Product {
    id: number;
    product_type: string;
    status: string;
    last_price: number;
    store_id: number;
    is_ordered?: boolean;
    is_delivered?: boolean;
    customer_name?: string;
    store_name?: string;
    store?: { id: number; name: string };
}

interface Customer {
    id: number;
    name: string;
    phone_number: string;
    cccd: string;
}

interface TransactionItem {
    id: number;
    product_id: number;
    price_at_time: number;
    product: Product;
}

interface Transaction {
    id: number;
    type: string;
    created_at: string;
    transaction_code?: string;
    customer?: Customer;
    store?: { id: number; name: string };
    staff?: { id: number; staff_name: string };
    items: TransactionItem[];
    order_status?: string;
}

interface Staff {
    id: number;
    staff_name: string;
}

interface Store {
    id: number;
    name: string;
}

// ─── Product Picker Component ────────────────────────────────────────
function ProductPicker({
    label,
    selectedProduct,
    onSelect,
    onClear,
    customers,
    availableProducts,
}: {
    label: string;
    selectedProduct: Product | null;
    onSelect: (product: Product) => void;
    onClear: () => void;
    customers: Customer[];
    availableProducts: Product[];
}) {
    const [mode, setMode] = useState<'customer' | 'inventory'>('customer');
    const [searchCustomer, setSearchCustomer] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerTxs, setCustomerTxs] = useState<Transaction[]>([]);
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
    const [loadingTxs, setLoadingTxs] = useState(false);

    // Filter customers
    const filteredCustomers = searchCustomer.length > 0
        ? customers.filter(c =>
            c.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
            (c.phone_number && c.phone_number.includes(searchCustomer)) ||
            (c.cccd && c.cccd.includes(searchCustomer))
        )
        : [];

    const fetchCustomerTxs = async (customerId: number) => {
        setLoadingTxs(true);
        try {
            const res = await axios.get(`/api/v1/transactions/customer/${customerId}?tx_type=Đơn cọc`);
            setCustomerTxs(res.data);
        } catch (e) {
            console.error("Failed to fetch customer transactions", e);
        } finally {
            setLoadingTxs(false);
        }
    };

    const handleSelectCustomer = (c: Customer) => {
        setSelectedCustomer(c);
        setSearchCustomer(c.name);
        setSelectedTx(null);
        fetchCustomerTxs(c.id);
    };

    const handleSelectTx = (tx: Transaction) => {
        setSelectedTx(selectedTx?.id === tx.id ? null : tx);
    };

    const handlePickProduct = (product: Product) => {
        onSelect(product);
    };

    const resetCustomerSearch = () => {
        setSearchCustomer('');
        setSelectedCustomer(null);
        setCustomerTxs([]);
        setSelectedTx(null);
    };

    // If product already selected, show compact card
    if (selectedProduct) {
        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-gray-700">{label}</h3>
                    <button onClick={onClear} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className={`border-2 rounded-lg p-4 ${selectedProduct.status === 'Đã bán'
                        ? 'border-red-200 bg-red-50'
                        : 'border-green-200 bg-green-50'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-lg">#{selectedProduct.id}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${selectedProduct.status === 'Đã bán'
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : 'bg-green-100 text-green-700 border border-green-200'
                            }`}>
                            {selectedProduct.status}
                        </span>
                    </div>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Loại:</span>
                            <span className="font-medium">{selectedProduct.product_type}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Giá:</span>
                            <span className="font-medium">{formatCurrency(selectedProduct.last_price || 0)}</span>
                        </div>
                        {selectedProduct.customer_name && (
                            <div className="flex justify-between text-yellow-700">
                                <span>Khách hàng:</span>
                                <span className="font-medium">{selectedProduct.customer_name}</span>
                            </div>
                        )}
                        {selectedProduct.status === 'Có sẵn' && (
                            <div className="flex justify-between text-blue-700">
                                <span>Kho:</span>
                                <span className="font-medium">{selectedProduct.store?.name || selectedProduct.store_name || 'N/A'}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Product picker UI
    return (
        <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700">{label}</h3>

            {/* Mode tabs */}
            <div className="flex border-b">
                <button
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${mode === 'customer'
                            ? 'border-purple-500 text-purple-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    onClick={() => setMode('customer')}
                >
                    <Users className="h-3.5 w-3.5" />
                    Đơn khách hàng
                </button>
                <button
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${mode === 'inventory'
                            ? 'border-purple-500 text-purple-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    onClick={() => setMode('inventory')}
                >
                    <Package className="h-3.5 w-3.5" />
                    Kho hàng
                </button>
            </div>

            {mode === 'customer' ? (
                <div className="space-y-3">
                    {/* Customer search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            className="pl-10 pr-8"
                            placeholder="Tìm khách hàng..."
                            value={searchCustomer}
                            onChange={(e) => {
                                setSearchCustomer(e.target.value);
                                if (selectedCustomer) {
                                    resetCustomerSearch();
                                    setSearchCustomer(e.target.value);
                                }
                            }}
                        />
                        {selectedCustomer && (
                            <button
                                onClick={resetCustomerSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Customer dropdown */}
                    {searchCustomer && !selectedCustomer && filteredCustomers.length > 0 && (
                        <div className="max-h-32 overflow-y-auto border rounded bg-white shadow-sm">
                            {filteredCustomers.slice(0, 8).map(c => (
                                <div
                                    key={c.id}
                                    className="p-2 hover:bg-purple-50 cursor-pointer border-b last:border-b-0 text-sm"
                                    onClick={() => handleSelectCustomer(c)}
                                >
                                    <div className="font-medium">{c.name}</div>
                                    <div className="text-xs text-gray-500">{c.phone_number || ''} {c.cccd ? `• ${c.cccd}` : ''}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Customer transactions */}
                    {selectedCustomer && (
                        <div className="space-y-2">
                            {loadingTxs ? (
                                <div className="text-center py-3 text-sm text-gray-500">Đang tải...</div>
                            ) : customerTxs.length === 0 ? (
                                <div className="text-center py-3 text-sm text-gray-500">Không có đơn hàng</div>
                            ) : (
                                <div className="max-h-48 overflow-y-auto space-y-1">
                                    {customerTxs.map(tx => {
                                        const soldItems = tx.items.filter(i => i.product.status === 'Đã bán');
                                        if (soldItems.length === 0) return null;
                                        const isOpen = selectedTx?.id === tx.id;

                                        return (
                                            <div key={tx.id} className="border rounded">
                                                <div
                                                    className={`p-2 cursor-pointer transition-colors text-sm ${isOpen ? 'bg-purple-50 border-purple-200' : 'hover:bg-gray-50'}`}
                                                    onClick={() => handleSelectTx(tx)}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-medium">
                                                            {tx.transaction_code || `#${tx.id}`}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {formatDate(tx.created_at)} {formatTime(tx.created_at)}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {soldItems.length} SP chưa xử lý • {tx.store?.name || '-'}
                                                    </div>
                                                </div>
                                                {isOpen && (
                                                    <div className="border-t bg-white">
                                                        {soldItems.map(item => (
                                                            <div
                                                                key={item.product_id}
                                                                className="flex items-center justify-between px-3 py-2 hover:bg-purple-50 cursor-pointer border-b last:border-b-0 transition-colors"
                                                                onClick={() => handlePickProduct({
                                                                    ...item.product,
                                                                    customer_name: tx.customer?.name
                                                                })}
                                                            >
                                                                <div>
                                                                    <span className="font-medium text-sm">#{item.product_id}</span>
                                                                    <span className="text-sm text-gray-600 ml-2">{item.product.product_type}</span>
                                                                </div>
                                                                <span className="text-sm font-medium text-gray-700">
                                                                    {formatCurrency(item.price_at_time)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                /* Inventory mode */
                <div className="space-y-2">
                    {availableProducts.length === 0 ? (
                        <div className="text-center py-4 text-sm text-gray-500">Không có sản phẩm trong kho</div>
                    ) : (
                        <div className="max-h-64 overflow-y-auto border rounded">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2 text-left">ID</th>
                                        <th className="px-3 py-2 text-left">Loại</th>
                                        <th className="px-3 py-2 text-left">Kho</th>
                                        <th className="px-3 py-2 text-right">Giá</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {availableProducts.map(p => (
                                        <tr
                                            key={p.id}
                                            className="border-b hover:bg-green-50 cursor-pointer transition-colors"
                                            onClick={() => handlePickProduct(p)}
                                        >
                                            <td className="px-3 py-2 font-medium">#{p.id}</td>
                                            <td className="px-3 py-2">{p.product_type}</td>
                                            <td className="px-3 py-2 text-gray-600">{p.store?.name || p.store_name || '-'}</td>
                                            <td className="px-3 py-2 text-right">{formatCurrency(p.last_price || 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────
export function SwapProducts() {
    const navigate = useNavigate();

    const [product1, setProduct1] = useState<Product | null>(null);
    const [product2, setProduct2] = useState<Product | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Transaction fields
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [storeList, setStoreList] = useState<Store[]>([]);
    const [selectedStaffId, setSelectedStaffId] = useState<number>(0);
    const [selectedStoreId, setSelectedStoreId] = useState<number>(0);
    const [swapDate, setSwapDate] = useState<string>(nowHanoiLocal());

    // Shared data for pickers
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [availableProducts, setAvailableProducts] = useState<Product[]>([]);

    useEffect(() => {
        fetchStaff();
        fetchStores();
        fetchCustomers();
        fetchAvailableProducts();
    }, []);

    const fetchStaff = async () => {
        try {
            const res = await axios.get('/api/v1/staff/');
            setStaffList(res.data);
            if (res.data.length > 0) setSelectedStaffId(res.data[0].id);
        } catch (e) {
            console.error("Failed to fetch staff", e);
        }
    };

    const fetchStores = async () => {
        try {
            const res = await axios.get('/api/v1/stores/');
            setStoreList(res.data);
            if (res.data.length > 0) setSelectedStoreId(res.data[0].id);
        } catch (e) {
            console.error("Failed to fetch stores", e);
        }
    };

    const fetchCustomers = async () => {
        try {
            const res = await axios.get('/api/v1/customers/?limit=200');
            setCustomers(res.data);
        } catch (e) {
            console.error("Failed to fetch customers", e);
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

    const handleSwap = async () => {
        if (!product1 || !product2) return;
        if (!selectedStaffId) { setError('Vui lòng chọn nhân viên'); return; }
        if (!selectedStoreId) { setError('Vui lòng chọn cửa hàng'); return; }
        if (product1.id === product2.id) { setError('Không thể hoán đổi cùng một sản phẩm'); return; }

        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await axios.post('/api/v1/transactions/swap', {
                product_id_1: product1.id,
                product_id_2: product2.id,
                staff_id: selectedStaffId,
                store_id: selectedStoreId,
                created_at: hanoiToISO(swapDate)
            });
            setSuccess('Hoán đổi thành công! Giao dịch đã được ghi nhận.');
            setProduct1(null);
            setProduct2(null);
            // Refresh available products
            fetchAvailableProducts();
        } catch (e: any) {
            setError(e.response?.data?.detail || 'Lỗi khi hoán đổi');
        } finally {
            setLoading(false);
        }
    };

    const isValidSwap = product1 && product2 && product1.id !== product2.id && (
        (product1.status === 'Đã bán' && product2.status === 'Có sẵn') ||
        (product2.status === 'Đã bán' && product1.status === 'Có sẵn') ||
        (product1.status === 'Đã bán' && product2.status === 'Đã bán')
    );

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900">Hoán đổi sản phẩm</h1>
                </div>

                {/* Transaction Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Thông tin giao dịch</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Ngày giờ hoán đổi</label>
                                <Input
                                    type="datetime-local"
                                    value={swapDate}
                                    onChange={(e) => setSwapDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Nhân viên</label>
                                <select
                                    className="w-full border rounded-md px-3 py-2 text-sm"
                                    value={selectedStaffId}
                                    onChange={(e) => setSelectedStaffId(Number(e.target.value))}
                                >
                                    <option value={0} disabled>Chọn nhân viên</option>
                                    {staffList.map(s => (
                                        <option key={s.id} value={s.id}>{s.staff_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Cửa hàng</label>
                                <select
                                    className="w-full border rounded-md px-3 py-2 text-sm"
                                    value={selectedStoreId}
                                    onChange={(e) => setSelectedStoreId(Number(e.target.value))}
                                >
                                    <option value={0} disabled>Chọn cửa hàng</option>
                                    {storeList.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Product Selection - Side by Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-purple-600">Sản phẩm 1</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ProductPicker
                                label="Chọn sản phẩm 1"
                                selectedProduct={product1}
                                onSelect={(p) => { setProduct1(p); setError(''); setSuccess(''); }}
                                onClear={() => setProduct1(null)}
                                customers={customers}
                                availableProducts={availableProducts}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-purple-600">Sản phẩm 2</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ProductPicker
                                label="Chọn sản phẩm 2"
                                selectedProduct={product2}
                                onSelect={(p) => { setProduct2(p); setError(''); setSuccess(''); }}
                                onClear={() => setProduct2(null)}
                                customers={customers}
                                availableProducts={availableProducts}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Status Messages */}
                {error && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm border border-green-200">
                        {success}
                    </div>
                )}

                {/* Swap Summary & Action */}
                {product1 && product2 && (
                    <Card>
                        <CardContent className="p-4">
                            {/* Swap visual */}
                            <div className="flex items-center justify-center gap-4 py-4">
                                <div className="text-center">
                                    <div className="font-bold text-lg">#{product1.id}</div>
                                    <div className="text-sm text-gray-600">{product1.product_type}</div>
                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${product1.status === 'Đã bán'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-green-100 text-green-700'
                                        }`}>
                                        {product1.status}
                                    </span>
                                    {product1.customer_name && (
                                        <div className="text-xs text-gray-500 mt-1">{product1.customer_name}</div>
                                    )}
                                </div>

                                <RefreshCw className={`h-8 w-8 ${isValidSwap ? 'text-purple-500' : 'text-gray-300'}`} />

                                <div className="text-center">
                                    <div className="font-bold text-lg">#{product2.id}</div>
                                    <div className="text-sm text-gray-600">{product2.product_type}</div>
                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${product2.status === 'Đã bán'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-green-100 text-green-700'
                                        }`}>
                                        {product2.status}
                                    </span>
                                    {product2.customer_name && (
                                        <div className="text-xs text-gray-500 mt-1">{product2.customer_name}</div>
                                    )}
                                </div>
                            </div>

                            {!isValidSwap && (
                                <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-3 rounded-md text-sm mb-4">
                                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                    <span>
                                        {product1.id === product2.id
                                            ? 'Không thể hoán đổi cùng một sản phẩm.'
                                            : 'Hoán đổi chỉ hỗ trợ: "Đã bán" ↔ "Có sẵn" hoặc "Đã bán" ↔ "Đã bán".'}
                                    </span>
                                </div>
                            )}

                            <Button
                                onClick={handleSwap}
                                disabled={!isValidSwap || loading || !selectedStaffId || !selectedStoreId}
                                className="w-full bg-purple-600 hover:bg-purple-700"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {loading ? 'Đang xử lý...' : 'Xác nhận Hoán đổi'}
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
