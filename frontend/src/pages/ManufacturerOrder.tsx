import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Trash, Plus } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

// Types
interface Store { id: number; name: string; }
interface ManufacturerOrderItem {
    product_id?: number;
    product_type?: string;
    quantity: number;
    manufacturer_price: number;
    // For UI display
    display_name?: string;
}

interface Product {
    id: number;
    product_type: string;
    status: string;
    last_price: number;
    store_id: number;
    // UI Helpers
    customer_name?: string;
    order_date?: string;
    store_name?: string;
}

interface TransactionItem {
    id: number;
    product: Product;
    price_at_time: number;
}

interface Transaction {
    id: number;
    created_at: string;
    customer?: { name: string };
    items: TransactionItem[];
}


export function ManufacturerOrder() {
    const navigate = useNavigate();

    // State
    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStore, setSelectedStore] = useState<number>(0);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 16));
    const [orderCode, setOrderCode] = useState('');

    // Items
    const [orderItems, setOrderItems] = useState<ManufacturerOrderItem[]>([]);

    // Item Inputs
    const [mode, setMode] = useState<'existing' | 'new'>('existing');

    // Existing Product - Transaction Flow
    const [searchDate, setSearchDate] = useState<string>(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedTxId, setSelectedTxId] = useState<number | null>(null);
    const [txProducts, setTxProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // New Product Inputs
    const [newItemType, setNewItemType] = useState('1 lượng');

    // Shared Inputs
    const [quantity, setQuantity] = useState(1);
    const [price, setPrice] = useState(0);

    // Fetch Data
    useEffect(() => {
        fetchStores();
    }, []);

    useEffect(() => {
        if (searchDate) {
            fetchTransactions();
        }
    }, [searchDate]);

    useEffect(() => {
        if (selectedTxId) {
            const tx = transactions.find(t => t.id === selectedTxId);
            if (tx) {
                const prods = tx.items.map(item => ({
                    ...item.product,
                    customer_name: tx.customer?.name,
                    order_date: tx.created_at
                }));
                // Filter out nulls if any product is missing
                setTxProducts(prods.filter(p => p && p.id));
            }
        } else {
            setTxProducts([]);
        }
    }, [selectedTxId, transactions]);

    const fetchTransactions = async () => {
        try {
            const res = await axios.get(`/api/v1/transactions/?start_date=${searchDate}&end_date=${searchDate}`);
            setTransactions(res.data);
        } catch (e) {
            console.error("Failed to fetch transactions", e);
        }
    };


    const fetchStores = async () => {
        try {
            const res = await axios.get('/api/v1/stores/');
            setStores(res.data);
            if (res.data.length > 0) setSelectedStore(res.data[0].id);
        } catch (e) {
            console.error("Failed to fetch stores", e);
        }
    };

    const addItem = () => {
        if (price <= 0) {
            alert("Price must be > 0");
            return;
        }

        if (mode === 'existing') {
            if (!selectedProduct) {
                alert("Please select a product");
                return;
            }
            if (quantity !== 1) {
                alert("For existing unique products, quantity must be 1. Add multiple items for different products.");
                return;
            }

            setOrderItems([...orderItems, {
                product_id: selectedProduct.id,
                quantity: 1,
                manufacturer_price: price,
                display_name: `${selectedProduct.product_type} #${selectedProduct.id} ${selectedProduct.customer_name ? `(${selectedProduct.customer_name} - ${selectedProduct.order_date ? new Date(selectedProduct.order_date).toLocaleDateString() : ''})` : ''}`
            }]);
            setSelectedProduct(null);
        } else {
            setOrderItems([...orderItems, {
                product_type: newItemType,
                quantity: quantity,
                manufacturer_price: price,
                display_name: `${newItemType} (New)`
            }]);
        }

        // Reset common fields
        setQuantity(1);
        setPrice(0);
    };

    const removeItem = (index: number) => {
        setOrderItems(orderItems.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!selectedStore) {
            alert("Please select a store");
            return;
        }
        if (!orderCode) {
            alert("Please enter Order Code");
            return;
        }

        try {
            const payload = {
                staff_id: 1, // HARDCODED
                store_id: selectedStore,
                items: orderItems,
                created_at: new Date(selectedDate).toISOString(),
                code: orderCode
            };
            console.log("Submitting:", payload);
            await axios.post('/api/v1/transactions/manufacturer-order', payload);
            alert("Manufacturer Order Created Successfully!");
            navigate('/dashboard'); // Or to list
        } catch (e) {
            alert("Error creating order");
            console.error(e);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <h1 className="text-3xl font-bold text-gray-900">New Manufacturer Order (Ancarat)</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Store & Info */}
                    <Card>
                        <CardHeader><CardTitle>Order Info</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Order Code</label>
                                <Input
                                    value={orderCode}
                                    onChange={(e) => setOrderCode(e.target.value)}
                                    placeholder="e.g. MFR-2023-001"
                                />
                            </div>
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

                    {/* Add Items */}
                    <Card>
                        <CardHeader><CardTitle>Add Products</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-4 border-b pb-2">
                                <button
                                    className={`text-sm font-medium pb-1 ${mode === 'existing' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                                    onClick={() => setMode('existing')}
                                >
                                    Existing Product
                                </button>
                                <button
                                    className={`text-sm font-medium pb-1 ${mode === 'new' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                                    onClick={() => setMode('new')}
                                >
                                    New Product
                                </button>
                            </div>

                            {mode === 'existing' ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Look up Date</label>
                                        <Input
                                            type="date"
                                            value={searchDate}
                                            onChange={(e) => setSearchDate(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Select Transaction</label>
                                        <select
                                            className="w-full rounded-md border border-gray-300 p-2"
                                            value={selectedTxId || ''}
                                            onChange={(e) => setSelectedTxId(Number(e.target.value) || null)}
                                        >
                                            <option value="">-- Select Transaction --</option>
                                            {transactions.map(tx => (
                                                <option key={tx.id} value={tx.id}>
                                                    #{tx.id} - {tx.customer?.name || 'Unknown'} ({new Date(tx.created_at).toLocaleTimeString()})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedTxId && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Select Product from Transaction</label>
                                            <select
                                                className="w-full rounded-md border border-gray-300 p-2"
                                                value={selectedProduct?.id || ''}
                                                onChange={(e) => {
                                                    const pid = Number(e.target.value);
                                                    const p = txProducts.find(prod => prod.id === pid);
                                                    setSelectedProduct(p || null);
                                                    if (p) setPrice(p.last_price || 0);
                                                }}
                                            >
                                                <option value="">-- Select Product --</option>
                                                {txProducts.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        #{p.id} {p.product_type} ({p.status}) - {formatCurrency(p.last_price)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {selectedProduct && (
                                        <div className="bg-blue-50 p-2 rounded text-blue-800 text-sm mt-2">
                                            <div>
                                                Selected: <strong>#{selectedProduct.id} {selectedProduct.product_type}</strong>
                                                <span className="ml-2 text-xs bg-blue-200 px-1 rounded">{selectedProduct.status}</span>
                                            </div>
                                            <div className="text-xs text-blue-600 mt-1">
                                                Last Price: {formatCurrency(selectedProduct.last_price)}
                                            </div>
                                            {selectedProduct.customer_name && (
                                                <div className="mt-2 pt-2 border-t border-blue-200 text-xs text-gray-700">
                                                    <div><strong>Customer Order Info:</strong></div>
                                                    <div>Customer: {selectedProduct.customer_name}</div>
                                                    <div>Store: {selectedProduct.store_name}</div>
                                                    <div>Date: {selectedProduct.order_date ? new Date(selectedProduct.order_date).toLocaleDateString() : '-'}</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Product Type</label>
                                    <select
                                        className="w-full rounded-md border border-gray-300 p-2"
                                        value={newItemType}
                                        onChange={(e) => setNewItemType(e.target.value)}
                                    >
                                        <option value="1 lượng">1 lượng</option>
                                        <option value="5 lượng">5 lượng</option>
                                        <option value="1 kg">1 kg</option>
                                        <option value="khác">Khác</option>
                                    </select>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <div className="w-24">
                                    <label className="block text-sm font-medium mb-1">Qty</label>
                                    <Input
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => setQuantity(Number(e.target.value))}
                                        disabled={mode === 'existing'} // Force 1 for existing
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium mb-1">Mfr Price</label>
                                    <Input
                                        type="number"
                                        value={price}
                                        onChange={(e) => setPrice(Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <Button onClick={addItem} className="w-full">
                                <Plus className="w-4 h-4 mr-2" /> Add to Order
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Order Summary */}
                <Card>
                    <CardHeader><CardTitle>Order Items ({orderItems.length})</CardTitle></CardHeader>
                    <CardContent>
                        {orderItems.length > 0 ? (
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-2 text-left">Product</th>
                                            <th className="p-2 text-right">Qty</th>
                                            <th className="p-2 text-right">Price</th>
                                            <th className="p-2 text-right">Total</th>
                                            <th className="p-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orderItems.map((item, idx) => (
                                            <tr key={idx} className="border-t">
                                                <td className="p-2">{item.display_name}</td>
                                                <td className="p-2 text-right">{item.quantity}</td>
                                                <td className="p-2 text-right">{formatCurrency(item.manufacturer_price)}</td>
                                                <td className="p-2 text-right">{formatCurrency(item.manufacturer_price * item.quantity)}</td>
                                                <td className="p-2 text-center">
                                                    <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700">
                                                        <Trash className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 font-bold">
                                        <tr>
                                            <td colSpan={3} className="p-2 text-right">Total:</td>
                                            <td className="p-2 text-right">
                                                {formatCurrency(orderItems.reduce((sum, item) => sum + (item.manufacturer_price * item.quantity), 0))}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">No items added yet.</div>
                        )}

                        <div className="mt-6 flex justify-end">
                            <Button className="w-40 text-lg py-6" onClick={handleSubmit} disabled={orderItems.length === 0}>
                                Submit Order
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
