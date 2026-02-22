
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Edit } from 'lucide-react';
import { formatDate, formatTime, todayHanoi, startOfMonthHanoi } from '../lib/dateUtils';
import { formatCurrency } from '../lib/utils'; // Assuming this exists or define it locally

interface Transaction {
    id: number;
    transaction_code?: string;
    code?: string;
    type: string;
    created_at: string;
    customer?: { name: string; phone_number: string };
    store?: { name: string };
    items: any[];
    total_amount?: number; // Might need to calculate
}

export function EditOrderList() {
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState(startOfMonthHanoi());
    const [endDate, setEndDate] = useState(todayHanoi());
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterType, setFilterType] = useState<'all' | 'Đơn cọc' | 'Đặt hàng NSX'>('all');

    useEffect(() => {
        fetchTransactions();
    }, [startDate, endDate]);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            // Fetch both types or filter client side?
            // Backend supports filtering by type. fetching all might be too much.
            // Let's fetch separately and combine? Or just fetch without type and filter client side if backend supports all
            // Backend `get_transactions` with `tx_type=None` returns all? Yes.

            const res = await axios.get('/api/v1/transactions/', {
                params: {
                    start_date: startDate,
                    end_date: endDate,
                    limit: 200 // Increase limit
                }
            });

            // Filter only relevant types
            const relevant = res.data.filter((t: Transaction) =>
                t.type === 'Đơn cọc' || t.type === 'Đặt hàng NSX'
            );

            setTransactions(relevant);
        } catch (error) {
            console.error("Error fetching transactions:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredTransactions = transactions.filter(t => {
        if (filterType === 'all') return true;
        return t.type === filterType;
    });

    const calculateTotal = (items: any[]) => {
        return items.reduce((sum, item) => sum + (item.price_at_time || 0), 0);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900">Chỉnh sửa đơn hàng</h1>
                </div>

                <Card>
                    <CardContent className="p-4 space-y-4">
                        <div className="flex flex-wrap gap-4 items-end">
                            <div>
                                <label className="block text-sm font-medium mb-1">Ngày bắt đầu</label>
                                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Ngày kết thúc</label>
                                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                            <Button onClick={fetchTransactions}>Tìm kiếm</Button>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant={filterType === 'all' ? undefined : 'outline'}
                                onClick={() => setFilterType('all')}
                            >
                                Tất cả
                            </Button>
                            <Button
                                variant={filterType === 'Đơn cọc' ? undefined : 'outline'}
                                onClick={() => setFilterType('Đơn cọc')}
                            >
                                Đơn cọc KH
                            </Button>
                            <Button
                                variant={filterType === 'Đặt hàng NSX' ? undefined : 'outline'}
                                onClick={() => setFilterType('Đặt hàng NSX')}
                            >
                                Đơn cọc NSX
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-100 text-gray-700 uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Mã đơn</th>
                                        <th className="px-4 py-3">Loại</th>
                                        <th className="px-4 py-3">Ngày tạo</th>
                                        <th className="px-4 py-3">Khách hàng / Code NSX</th>
                                        <th className="px-4 py-3">Cửa hàng</th>
                                        <th className="px-4 py-3 text-right">Tổng tiền</th>
                                        <th className="px-4 py-3 text-center">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={7} className="text-center py-4">Đang tải...</td></tr>
                                    ) : filteredTransactions.length === 0 ? (
                                        <tr><td colSpan={7} className="text-center py-4 text-gray-500">Không có dữ liệu</td></tr>
                                    ) : (
                                        filteredTransactions.map(t => (
                                            <tr key={t.id} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium">
                                                    {t.transaction_code || `#${t.id}`}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${t.type === 'Đơn cọc' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                                                        }`}>
                                                        {t.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {formatDate(t.created_at)} {formatTime(t.created_at)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {t.type === 'Đơn cọc' ? (
                                                        <div>
                                                            <div className="font-medium">{t.customer?.name || '-'}</div>
                                                            <div className="text-xs text-gray-500">{t.customer?.phone_number}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{t.code || '-'}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">{t.store?.name || '-'}</td>
                                                <td className="px-4 py-3 text-right font-medium">
                                                    {formatCurrency(calculateTotal(t.items))}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => navigate(
                                                            t.type === 'Đơn cọc'
                                                                ? `/edit-order/${t.id}`
                                                                : `/edit-manufacturer-order/${t.id}`
                                                        )}
                                                    >
                                                        <Edit className="h-4 w-4 mr-1" /> Sửa
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
