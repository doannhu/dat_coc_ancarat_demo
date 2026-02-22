import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../lib/utils';
import { todayHanoi } from '../lib/dateUtils';
import { ArrowLeft, TrendingUp, TrendingDown, Wallet, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FinancialStats {
    money_in: number;
    money_in_breakdown: {
        customer_order: number;
        sell_to_mfr: number;
        cash: number;
        bank_transfer: number;
    };
    money_out: number;
    money_out_breakdown: {
        buy_back_customer: number;
        order_from_mfr: number;
    };
}

export function FinancialManagement() {
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState(todayHanoi());
    const [endDate, setEndDate] = useState(todayHanoi());
    const [stats, setStats] = useState<FinancialStats | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchStats();
    }, [startDate, endDate]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/v1/transactions/financial-stats?start_date=${startDate}&end_date=${endDate}`);
            setStats(res.data);
        } catch (error) {
            console.error("Failed to fetch financial stats", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900">Quản lý tài chính</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Bộ lọc thời gian</CardTitle>
                    </CardHeader>
                    <CardContent className="flex gap-4 items-end">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Ngày bắt đầu</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Ngày kết thúc</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Money In */}
                        <Card className="border-l-4 border-l-green-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-base font-medium">Tiền vào (Money In)</CardTitle>
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600 mb-4">{formatCurrency(stats.money_in)}</div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between border-b pb-1">
                                        <span className="text-gray-500">Khách đặt hàng</span>
                                        <span className="font-medium">{formatCurrency(stats.money_in_breakdown.customer_order)}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1">
                                        <span className="text-gray-500">Bán lại cho NSX</span>
                                        <span className="font-medium">{formatCurrency(stats.money_in_breakdown.sell_to_mfr)}</span>
                                    </div>

                                    <div className="pt-2">
                                        <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Hình thức thanh toán</div>
                                        <div className="flex justify-between items-center py-1">
                                            <div className="flex items-center gap-2">
                                                <Wallet className="h-4 w-4 text-gray-400" />
                                                <span className="text-gray-600">Tiền mặt</span>
                                            </div>
                                            <span className="font-medium">{formatCurrency(stats.money_in_breakdown.cash)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1">
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="h-4 w-4 text-gray-400" />
                                                <span className="text-gray-600">Chuyển khoản</span>
                                            </div>
                                            <span className="font-medium">{formatCurrency(stats.money_in_breakdown.bank_transfer)}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Money Out */}
                        <Card className="border-l-4 border-l-red-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-base font-medium">Tiền ra (Money Out)</CardTitle>
                                <TrendingDown className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600 mb-4">{formatCurrency(stats.money_out)}</div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between border-b pb-1">
                                        <span className="text-gray-500">Mua lại từ khách</span>
                                        <span className="font-medium">{formatCurrency(stats.money_out_breakdown.buy_back_customer)}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1">
                                        <span className="text-gray-500">Đặt hàng NSX</span>
                                        <span className="font-medium">{formatCurrency(stats.money_out_breakdown.order_from_mfr)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
