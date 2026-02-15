import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Search, ArrowLeft, Users, Edit, Save, X, Plus, Trash2, Key } from 'lucide-react';

interface Staff {
    id: number;
    staff_name: string;
    username: string;
    role: string;
    is_active?: boolean;
}

interface StaffForm {
    staff_name: string;
    username: string;
    role: string;
    password?: string;
}

export function UsersPage() {
    const navigate = useNavigate();
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
    const [formData, setFormData] = useState<StaffForm>({
        staff_name: '',
        username: '',
        role: 'staff',
        password: ''
    });

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            const res = await axios.get('/api/v1/staff/');
            setStaffList(res.data);
        } catch (e) {
            console.error("Failed to fetch staff", e);
        }
    };

    const handleEdit = (staff: Staff) => {
        setEditingStaff(staff);
        setFormData({
            staff_name: staff.staff_name,
            username: staff.username,
            role: staff.role,
            password: '' // Don't fill password on edit
        });
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingStaff(null);
        setFormData({
            staff_name: '',
            username: '',
            role: 'staff',
            password: ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Bạn có chắc chắn muốn xóa người dùng này?")) return;
        try {
            await axios.delete(`/api/v1/staff/${id}`);
            alert("Xóa người dùng thành công");
            fetchStaff();
        } catch (e) {
            console.error("Failed to delete staff", e);
            alert("Lỗi khi xóa người dùng");
        }
    };

    const handleSave = async () => {
        if (!formData.staff_name || !formData.username) {
            alert("Vui lòng điền đầy đủ thông tin");
            return;
        }

        try {
            if (editingStaff) {
                // Update
                const updateData: Partial<StaffForm> = {
                    staff_name: formData.staff_name,
                    role: formData.role
                };
                if (formData.password) {
                    updateData.password = formData.password;
                }

                await axios.put(`/api/v1/staff/${editingStaff.id}`, updateData);
                alert("Cập nhật người dùng thành công");
            } else {
                // Create
                if (!formData.password) {
                    alert("Vui lòng nhập mật khẩu cho người dùng mới");
                    return;
                }
                await axios.post('/api/v1/staff/', formData);
                alert("Thêm người dùng thành công");
            }
            setIsModalOpen(false);
            fetchStaff();
        } catch (e: any) {
            console.error("Failed to save staff", e);
            alert(`Lỗi: ${e.response?.data?.detail || 'Không thể lưu thông tin người dùng'}`);
        }
    };

    const filteredStaff = staffList.filter(s =>
        s.staff_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.role.toLowerCase().includes(searchQuery.toLowerCase())
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
                        Quản lý người dùng
                    </h1>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Danh sách nhân viên</CardTitle>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleAdd}>
                            <Plus className="h-4 w-4 mr-2" />
                            Thêm người dùng
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4 mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    className="pl-10"
                                    placeholder="Tìm kiếm theo tên, username, vai trò..."
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
                                        <th className="p-3">Tên hiển thị</th>
                                        <th className="p-3">Username</th>
                                        <th className="p-3">Vai trò</th>
                                        <th className="p-3 text-center">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {filteredStaff.map(staff => (
                                        <tr key={staff.id} className="hover:bg-gray-50">
                                            <td className="p-3 font-medium">#{staff.id}</td>
                                            <td className="p-3">{staff.staff_name}</td>
                                            <td className="p-3 font-mono text-gray-600">{staff.username}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${staff.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {staff.role.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center flex justify-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(staff)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(staff.id)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredStaff.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-4 text-center text-gray-500">
                                                Không tìm thấy người dùng nào
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <h3 className="text-xl font-bold text-gray-900">
                                {editingStaff ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tên hiển thị</label>
                                <Input
                                    value={formData.staff_name}
                                    onChange={e => setFormData({ ...formData, staff_name: e.target.value })}
                                    placeholder="Ví dụ: Nguyễn Văn A"
                                />
                            </div>

                            {!editingStaff && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Username (Tên đăng nhập)</label>
                                    <Input
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        placeholder="Ví dụ: staff_nguyenvana"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                                <select
                                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="staff">Staff</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {editingStaff ? 'Mật khẩu mới (Để trống nếu không đổi)' : 'Mật khẩu'}
                                </label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        type="password"
                                        className="pl-10"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        placeholder={editingStaff ? "Nhập để đổi mật khẩu" : "Nhập mật khẩu"}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                                Hủy bỏ
                            </Button>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSave}>
                                <Save className="h-4 w-4 mr-2" />
                                {editingStaff ? 'Cập nhật' : 'Thêm mới'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
