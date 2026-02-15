import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Search, ArrowLeft, Users, Edit, Save, X } from 'lucide-react';

interface Customer {
    id: number;
    name: string;
    phone_number: string;
    cccd: string;
    address: string;
}

export function Customers() {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [editForm, setEditForm] = useState<Partial<Customer>>({});

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const res = await axios.get('/api/v1/customers/?limit=1000');
            setCustomers(res.data);
        } catch (e) {
            console.error("Failed to fetch customers", e);
        }
    };

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer);
        setEditForm(customer);
    };

    const handleSave = async () => {
        if (!editingCustomer) return;
        try {
            await axios.put(`/api/v1/customers/${editingCustomer.id}`, editForm);
            alert("Cập nhật thông tin khách hàng thành công");
            setEditingCustomer(null);
            fetchCustomers();
        } catch (e) {
            console.error("Failed to update customer", e);
            alert("Lỗi khi cập nhật thông tin khách hàng");
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone_number && c.phone_number.includes(searchQuery)) ||
        (c.cccd && c.cccd.includes(searchQuery))
    );

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900">
                        <Users className="inline-block mr-2 h-8 w-8 text-indigo-600" />
                        Danh sách khách hàng
                    </h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Tìm kiếm và Quản lý</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4 mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    className="pl-10"
                                    placeholder="Tìm kiếm theo tên, số điện thoại, CCCD..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto border rounded-lg">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-100 text-gray-700 font-medium">
                                    <tr>
                                        <th className="p-3">ID</th>
                                        <th className="p-3">Tên</th>
                                        <th className="p-3">Số điện thoại</th>
                                        <th className="p-3">CCCD</th>
                                        <th className="p-3">Địa chỉ</th>
                                        <th className="p-3 text-center">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {filteredCustomers.map(customer => (
                                        <tr key={customer.id} className="hover:bg-gray-50">
                                            <td className="p-3 font-medium">#{customer.id}</td>
                                            <td className="p-3">{customer.name}</td>
                                            <td className="p-3">{customer.phone_number || '-'}</td>
                                            <td className="p-3">{customer.cccd || '-'}</td>
                                            <td className="p-3 truncate max-w-xs">{customer.address || '-'}</td>
                                            <td className="p-3 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(customer)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredCustomers.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-4 text-center text-gray-500">
                                                Không tìm thấy khách hàng nào
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Edit Modal */}
            {editingCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <h3 className="text-xl font-bold text-gray-900">Chỉnh sửa thông tin khách hàng</h3>
                            <button onClick={() => setEditingCustomer(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                                <Input
                                    value={editForm.name || ''}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                                <Input
                                    value={editForm.phone_number || ''}
                                    onChange={e => setEditForm({ ...editForm, phone_number: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">CCCD</label>
                                <Input
                                    value={editForm.cccd || ''}
                                    onChange={e => setEditForm({ ...editForm, cccd: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                                <Input
                                    value={editForm.address || ''}
                                    onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                            <Button variant="ghost" onClick={() => setEditingCustomer(null)}>
                                Hủy bỏ
                            </Button>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSave}>
                                <Save className="h-4 w-4 mr-2" />
                                Lưu thay đổi
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
