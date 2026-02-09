import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ArrowLeft, ArrowRight, Store as StoreIcon } from 'lucide-react';

// Types
interface Product {
    id: number;
    product_type: string;
    status: string;
    last_price: number;
    store_id: number;
    store_name?: string;
}

interface Store {
    id: number;
    name: string;
    location?: string;
}

interface StoreWithProducts extends Store {
    products: Product[];
}

export function StoreList() {
    const navigate = useNavigate();

    const [stores, setStores] = useState<StoreWithProducts[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [moveError, setMoveError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Get all stores
            const storesRes = await axios.get('/api/v1/stores/');
            const storesList = storesRes.data;

            // Get available products for each store
            const storesWithProducts: StoreWithProducts[] = await Promise.all(
                storesList.map(async (store: Store) => {
                    try {
                        const productsRes = await axios.get(`/api/v1/products/store/${store.id}`);
                        return { ...store, products: productsRes.data };
                    } catch {
                        return { ...store, products: [] };
                    }
                })
            );

            setStores(storesWithProducts);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const handleMoveProduct = async (productId: number, newStoreId: number) => {
        setMoveError(null);
        try {
            await axios.post(`/api/v1/products/${productId}/move`, null, {
                params: { new_store_id: newStoreId }
            });
            setSelectedProduct(null);
            await fetchData(); // Refresh the data
        } catch (error: any) {
            setMoveError(error.response?.data?.detail || 'Failed to move product');
        }
    };

    const getTotalValue = (products: Product[]) => {
        return products.reduce((sum, p) => sum + (p.last_price || 0), 0);
    };

    const totalProducts = stores.reduce((sum, s) => sum + s.products.length, 0);
    const totalValue = stores.reduce((sum, s) => sum + getTotalValue(s.products), 0);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900">Store Inventory</h1>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stores.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Available Products</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{totalProducts}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalValue)}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Move Product Modal */}
                {selectedProduct && (
                    <Card className="border-2 border-blue-500">
                        <CardHeader>
                            <CardTitle className="text-blue-600">
                                Move Product #{selectedProduct.id}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4">
                                <p><strong>Type:</strong> {selectedProduct.product_type}</p>
                                <p><strong>Price:</strong> {formatCurrency(selectedProduct.last_price || 0)}</p>
                                <p><strong>Current Store:</strong> {selectedProduct.store_name}</p>
                            </div>
                            {moveError && (
                                <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                                    {moveError}
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                                <span className="text-sm font-medium py-2">Move to:</span>
                                {stores
                                    .filter(s => s.id !== selectedProduct.store_id)
                                    .map(store => (
                                        <Button
                                            key={store.id}
                                            variant="outline"
                                            onClick={() => handleMoveProduct(selectedProduct.id, store.id)}
                                        >
                                            <ArrowRight className="h-4 w-4 mr-1" />
                                            {store.name}
                                        </Button>
                                    ))
                                }
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setSelectedProduct(null);
                                        setMoveError(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Store List */}
                {loading ? (
                    <div className="text-center py-8">Loading...</div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {stores.map(store => (
                            <Card key={store.id}>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <StoreIcon className="h-5 w-5 text-blue-500" />
                                        <CardTitle>{store.name}</CardTitle>
                                        <span className="ml-auto text-sm font-normal text-gray-500">
                                            {store.products.length} products
                                        </span>
                                    </div>
                                    {store.location && (
                                        <p className="text-sm text-gray-500">{store.location}</p>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    {store.products.length === 0 ? (
                                        <div className="text-center py-4 text-gray-400">
                                            No available products
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left">ID</th>
                                                        <th className="px-3 py-2 text-left">Type</th>
                                                        <th className="px-3 py-2 text-right">Price</th>
                                                        <th className="px-3 py-2 text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {store.products.map(product => (
                                                        <tr key={product.id} className="border-b hover:bg-gray-50">
                                                            <td className="px-3 py-2">#{product.id}</td>
                                                            <td className="px-3 py-2">{product.product_type}</td>
                                                            <td className="px-3 py-2 text-right font-medium">
                                                                {formatCurrency(product.last_price || 0)}
                                                            </td>
                                                            <td className="px-3 py-2 text-center">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setSelectedProduct({
                                                                        ...product,
                                                                        store_name: store.name
                                                                    })}
                                                                    className="text-blue-600 hover:text-blue-800"
                                                                >
                                                                    Move
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-gray-100">
                                                    <tr>
                                                        <td colSpan={2} className="px-3 py-2 font-bold">Total</td>
                                                        <td className="px-3 py-2 text-right font-bold text-blue-600">
                                                            {formatCurrency(getTotalValue(store.products))}
                                                        </td>
                                                        <td></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
