
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { ArrowLeft, Save } from 'lucide-react';
import { formatCurrency } from '../lib/utils';


interface Store { id: number; name: string; }
interface Transaction {
    id: number;
    transaction_code: string;
    code: string; // manual code
    created_at: string;
    store_id: number;
    store: Store;
    items: any[];
}

export function EditManufacturerOrder() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<Transaction | null>(null);
    const [stores, setStores] = useState<Store[]>([]);

    // Form State
    const [selectedStore, setSelectedStore] = useState<number>(0);
    const [orderCode, setOrderCode] = useState('');
    const [selectedDate, setSelectedDate] = useState<string>('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [orderRes, storesRes] = await Promise.all([
                    axios.get(`/api/v1/transactions/${id}`),
                    axios.get('/api/v1/stores/')
                ]);

                const orderData = orderRes.data;
                setOrder(orderData);
                setStores(storesRes.data);

                // Init Form
                setSelectedStore(orderData.store_id); // Note: store_id might be missing in some fetch responses depending on backend schema, assume present
                setOrderCode(orderData.code || '');

                if (orderData.created_at) {
                    const dateObj = new Date(orderData.created_at);
                    const tzOffset = dateObj.getTimezoneOffset() * 60000;
                    const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().slice(0, 16);
                    setSelectedDate(localISOTime);
                }

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

    const handleUpdate = async () => {
        if (!selectedStore || !orderCode || !selectedDate) {
            alert("Vui lòng điền đầy đủ thông tin");
            return;
        }

        try {
            const payload = {
                store_id: selectedStore,
                code: orderCode, // Manual code
                created_at: new Date(selectedDate).toISOString(),
            };

            await axios.put(`/api/v1/transactions/manufacturer-order/${id}`, payload);
            alert("Cập nhật thành công!");
            navigate('/edit-orders');
        } catch (error) {
            console.error(error);
            alert("Cập nhật thất bại");
        }
    };

    if (loading) return <div className="p-6">Loading...</div>;
    if (!order) return <div className="p-6">Order not found</div>;

    const totalAmount = order.items.reduce((sum, item) => sum + (item.price_at_time || 0), 0);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" onClick={() => navigate('/edit-orders')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Sửa đơn hàng NSX {order.transaction_code || `#${order.id}`}
                    </h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader><CardTitle>Thông tin chung</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Mã đơn NSX (Code)</label>
                                <Input
                                    value={orderCode}
                                    onChange={e => setOrderCode(e.target.value)}
                                />
                            </div>
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
                            <Button className="w-full mt-4" onClick={handleUpdate}>
                                <Save className="h-4 w-4 mr-2" /> Lưu thay đổi
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Sản phẩm (Chỉ xem)</CardTitle></CardHeader>
                        <CardContent>
                            <div className="max-h-96 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-100 sticky top-0">
                                        <tr>
                                            <th className="p-2 text-left">ID</th>
                                            <th className="p-2 text-left">Loại</th>
                                            <th className="p-2 text-right">Giá nhập</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {order.items.map(item => (
                                            <tr key={item.id} className="border-b">
                                                <td className="p-2 font-medium">#{item.product?.id}</td>
                                                <td className="p-2">{item.product?.product_type}</td>
                                                <td className="p-2 text-right">{formatCurrency(item.price_at_time)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="font-bold bg-gray-50 sticky bottom-0">
                                        <tr>
                                            <td colSpan={2} className="p-2 text-right">Tổng:</td>
                                            <td className="p-2 text-right">{formatCurrency(totalAmount)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
