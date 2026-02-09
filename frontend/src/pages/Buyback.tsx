import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Trash, Search, ArrowLeft } from 'lucide-react';

// Types
interface Store { id: number; name: string; }
interface Customer { id: number; name: string; phone_number: string; cccd: string; }
interface Staff { id: number; staff_name: string; }
interface Product { id: number; product_type: string; status: string; last_price: number; }
interface TransactionItem { id: number; product_id: number; price_at_time: number; product: Product; }
interface Transaction {
    id: number;
    type: string;
    created_at: string;
    customer: Customer;
    store: Store;
    staff: Staff;
    items: TransactionItem[];
}

interface BuybackItem {
    product_id: number;
    product_type: string;
    original_price: number;
    buyback_price: number;
}

export function Buyback() {
    const navigate = useNavigate();

    // State
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchCustomer, setSearchCustomer] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    const [customerTransactions, setCustomerTransactions] = useState<Transaction[]>([]);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    const [buybackItems, setBuybackItems] = useState<BuybackItem[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 16));
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash');

    // Fetch customers on mount
    useEffect(() => {
        fetchCustomers();
    }, []);

    // Fetch customer transactions when customer is selected
    useEffect(() => {
        if (selectedCustomer) {
            fetchCustomerTransactions(selectedCustomer.id);
        } else {
            setCustomerTransactions([]);
            setSelectedTransaction(null);
            setBuybackItems([]);
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

    const fetchCustomerTransactions = async (customerId: number) => {
        try {
            // Get only sale transactions for this customer
            const res = await axios.get(`/api/v1/transactions/customer/${customerId}?tx_type=sale`);
            setCustomerTransactions(res.data);
        } catch (e) {
            console.error("Failed to fetch customer transactions", e);
        }
    };

    // Filter customers for display
    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
        (c.phone_number && c.phone_number.includes(searchCustomer)) ||
        (c.cccd && c.cccd.includes(searchCustomer))
    );

    const selectTransaction = (tx: Transaction) => {
        setSelectedTransaction(tx);
        // Pre-populate buyback items from transaction items
        // Only include items that have status 'sold'
        const items: BuybackItem[] = tx.items
            .filter(item => item.product.status === 'sold')
            .map(item => ({
                product_id: item.product_id,
                product_type: item.product.product_type,
                original_price: item.price_at_time,
                buyback_price: item.price_at_time // Default to original price
            }));
        setBuybackItems(items);
    };

    const updateBuybackPrice = (productId: number, price: number) => {
        setBuybackItems(items =>
            items.map(item =>
                item.product_id === productId
                    ? { ...item, buyback_price: price }
                    : item
            )
        );
    };

    const removeItem = (productId: number) => {
        setBuybackItems(items => items.filter(item => item.product_id !== productId));
    };

    const totalAmount = buybackItems.reduce((sum, item) => sum + item.buyback_price, 0);

    const handleSubmit = async () => {
        if (!selectedTransaction) {
            alert("Please select a transaction");
            return;
        }
        if (buybackItems.length === 0) {
            alert("Please add at least one item to buyback");
            return;
        }

        try {
            const payload = {
                original_transaction_id: selectedTransaction.id,
                staff_id: selectedTransaction.staff?.id || 1,
                store_id: selectedTransaction.store?.id || 1,
                items: buybackItems.map(item => ({
                    product_id: item.product_id,
                    buyback_price: item.buyback_price
                })),
                created_at: new Date(selectedDate).toISOString(),
                payment_method: paymentMethod
            };

            await axios.post('/api/v1/transactions/buyback', payload);
            alert("Buyback completed successfully!");
            navigate('/dashboard');
        } catch (e: unknown) {
            const error = e as { response?: { data?: { detail?: string } } };
            alert(`Error: ${error.response?.data?.detail || 'Failed to process buyback'}`);
            console.error(e);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900">Buyback</h1>
                </div>

                {/* Customer Search */}
                <Card>
                    <CardHeader><CardTitle>Find Customer</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                className="pl-10"
                                placeholder="Search by name, phone, or CCCD..."
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
                                    <div className="p-3 text-gray-500">No customers found</div>
                                )}
                            </div>
                        )}

                        {selectedCustomer && (
                            <div className="bg-green-50 p-3 rounded text-green-800">
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
                        <CardHeader><CardTitle>Customer Orders</CardTitle></CardHeader>
                        <CardContent>
                            {customerTransactions.length === 0 ? (
                                <p className="text-gray-500">No orders found for this customer</p>
                            ) : (
                                <div className="space-y-2">
                                    {customerTransactions.map(tx => (
                                        <div
                                            key={tx.id}
                                            className={`p-3 border rounded cursor-pointer transition-colors ${selectedTransaction?.id === tx.id
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'hover:bg-gray-50'
                                                }`}
                                            onClick={() => selectTransaction(tx)}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-medium">Order #{tx.id}</div>
                                                    <div className="text-sm text-gray-500">
                                                        {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString()}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        Store: {tx.store?.name || 'N/A'} | Staff: {tx.staff?.staff_name || 'N/A'}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-medium text-blue-600">
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
                                                    <span key={item.id} className={`inline-block mr-2 px-2 py-0.5 rounded text-xs ${item.product.status === 'sold'
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        #{item.product_id} {item.product.product_type} ({item.product.status})
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Buyback Items */}
                {selectedTransaction && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Buyback Items</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Date & Time</label>
                                    <Input
                                        type="datetime-local"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Store (from order)</label>
                                    <Input
                                        value={selectedTransaction.store?.name || 'N/A'}
                                        disabled
                                        className="bg-gray-100"
                                    />
                                </div>
                            </div>

                            {buybackItems.length === 0 ? (
                                <p className="text-gray-500">No items available for buyback (all items may have been bought back already)</p>
                            ) : (
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="p-2 text-left">Product</th>
                                                <th className="p-2 text-right">Original Price</th>
                                                <th className="p-2 text-right">Buyback Price</th>
                                                <th className="p-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {buybackItems.map(item => (
                                                <tr key={item.product_id} className="border-t">
                                                    <td className="p-2">
                                                        <span className="font-medium">#{item.product_id}</span> {item.product_type}
                                                    </td>
                                                    <td className="p-2 text-right text-gray-500">
                                                        {formatCurrency(item.original_price)}
                                                    </td>
                                                    <td className="p-2 text-right">
                                                        <Input
                                                            type="number"
                                                            className="w-32 text-right inline-block"
                                                            value={item.buyback_price}
                                                            onChange={(e) => updateBuybackPrice(item.product_id, Number(e.target.value))}
                                                        />
                                                    </td>
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

                {/* Payment & Submit */}
                {buybackItems.length > 0 && (
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Payment Method</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="payment"
                                                checked={paymentMethod === 'cash'}
                                                onChange={() => setPaymentMethod('cash')}
                                            />
                                            <span>Cash</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="payment"
                                                checked={paymentMethod === 'bank_transfer'}
                                                onChange={() => setPaymentMethod('bank_transfer')}
                                            />
                                            <span>Bank Transfer</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">Total Buyback Amount</p>
                                    <p className="text-3xl font-bold text-green-600">{formatCurrency(totalAmount)}</p>
                                </div>
                            </div>

                            <Button
                                className="w-full text-lg py-6"
                                onClick={handleSubmit}
                                disabled={buybackItems.length === 0}
                            >
                                Complete Buyback
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
