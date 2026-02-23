import { useRef, useState } from 'react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { Button } from './ui/Button';
import { FileText, Download, X } from 'lucide-react';

// Types matching the Orders page
interface Product {
    product_type: string;
    status: string;
    last_price: number;
    store_id: number;
}

interface TransactionItem {
    id: number;
    transaction_id: number;
    product_id: number;
    price_at_time: number;
    product: Product;
    swapped: boolean;
    original_product_id: number | null;
    original_product: Product | null;
}

interface Customer {
    id: number;
    name: string;
    phone_number: string;
    cccd?: string;
    address?: string;
}

interface Store {
    id: number;
    name: string;
}

interface Staff {
    id: number;
    staff_name: string;
    role: string;
}

interface Transaction {
    id: number;
    type: string;
    created_at: string;
    transaction_code?: string;
    payment_method: string;
    cash_amount?: number;
    bank_transfer_amount?: number;
    items: TransactionItem[];
    customer?: Customer;
    store?: Store;
    staff?: Staff;
    order_status?: string;
}

interface ContractGeneratorProps {
    order: Transaction;
}

// Helper: convert number to Vietnamese words
function numberToVietnameseWords(n: number): string {
    if (n === 0) return 'Không đồng';

    const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const units = ['', 'nghìn', 'triệu', 'tỷ'];

    function readGroup(num: number): string {
        const h = Math.floor(num / 100);
        const t = Math.floor((num % 100) / 10);
        const o = num % 10;
        let result = '';

        if (h > 0) {
            result += ones[h] + ' trăm ';
            if (t === 0 && o > 0) result += 'lẻ ';
        }

        if (t > 1) {
            result += ones[t] + ' mươi ';
            if (o === 1) result += 'mốt ';
            else if (o === 5) result += 'lăm ';
            else if (o > 0) result += ones[o] + ' ';
        } else if (t === 1) {
            result += 'mười ';
            if (o === 5) result += 'lăm ';
            else if (o > 0) result += ones[o] + ' ';
        } else if (o > 0) {
            result += ones[o] + ' ';
        }

        return result.trim();
    }

    const groups: number[] = [];
    let temp = Math.floor(n);
    while (temp > 0) {
        groups.push(temp % 1000);
        temp = Math.floor(temp / 1000);
    }

    let result = '';
    for (let i = groups.length - 1; i >= 0; i--) {
        if (groups[i] > 0) {
            result += readGroup(groups[i]) + ' ' + units[i] + ' ';
        }
    }

    result = result.trim();
    // Capitalize first letter
    result = result.charAt(0).toUpperCase() + result.slice(1) + ' đồng';
    return result;
}

function formatVND(amount: number): string {
    return new Intl.NumberFormat('vi-VN').format(amount);
}

function formatContractDate(dateStr: string): { day: string; month: string; year: string; time: string } {
    const d = new Date(dateStr);
    return {
        day: String(d.getDate()).padStart(2, '0'),
        month: String(d.getMonth() + 1).padStart(2, '0'),
        year: String(d.getFullYear()),
        time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    };
}

function getProductLabel(productType: string): { name: string; purity: string } {
    // Map product_type to display labels
    if (productType.includes('5 lượng') || productType.includes('5L')) {
        return { name: 'Bạc Ancarat 999 5L', purity: '999' };
    } else if (productType.includes('1 lượng') || productType.includes('1L')) {
        return { name: 'Bạc Ancarat 999 1L', purity: '999' };
    } else if (productType.includes('1 kg') || productType.includes('1KG')) {
        return { name: 'Bạc Ancarat 999 1KG', purity: '999' };
    }
    return { name: productType, purity: '999' };
}

function getWeightPerUnit(productType: string): number {
    if (productType.includes('5 lượng') || productType.includes('5L')) return 50000; // 50.000 chỉ (5 lượng = 50 chỉ, display as 50.000 for milligrams format)
    if (productType.includes('1 lượng') || productType.includes('1L')) return 10000;
    if (productType.includes('1 kg') || productType.includes('1KG')) return 265000;
    return 0;
}

// Group items by product type for contract table
interface GroupedItem {
    productType: string;
    label: string;
    purity: string;
    quantity: number;
    weightPerUnit: number;
    totalWeight: number;
    pricePerUnit: number;
    totalPrice: number;
}

function groupItems(items: TransactionItem[]): GroupedItem[] {
    const groups: Record<string, GroupedItem> = {};
    for (const item of items) {
        const type = item.product.product_type;
        const { name, purity } = getProductLabel(type);
        const weight = getWeightPerUnit(type);
        if (!groups[type]) {
            groups[type] = {
                productType: type,
                label: name,
                purity,
                quantity: 0,
                weightPerUnit: weight,
                totalWeight: 0,
                pricePerUnit: item.price_at_time,
                totalPrice: 0
            };
        }
        groups[type].quantity += 1;
        groups[type].totalWeight += weight;
        groups[type].totalPrice += item.price_at_time;
    }
    return Object.values(groups);
}


export function ContractGenerator({ order }: ContractGeneratorProps) {
    const [showPreview, setShowPreview] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const contractRef = useRef<HTMLDivElement>(null);

    const date = formatContractDate(order.created_at);
    const contractId = order.transaction_code || `HD-${date.day}-${date.month}-${date.year}-${String(order.id).padStart(5, '0')}`;
    const customer = order.customer;
    const grouped = groupItems(order.items);
    const totalQty = grouped.reduce((s, g) => s + g.quantity, 0);
    const totalWeight = grouped.reduce((s, g) => s + g.totalWeight, 0);
    const totalPrice = grouped.reduce((s, g) => s + g.totalPrice, 0);
    const totalInWords = numberToVietnameseWords(totalPrice);

    const handleDownloadPdf = async () => {
        if (!contractRef.current) return;
        setIsGenerating(true);
        try {
            const opt = {
                margin: 0,
                filename: `HopDong_${contractId}.pdf`,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
            };
            await html2pdf().set(opt).from(contractRef.current).save();
        } catch (e) {
            console.error('Failed to generate PDF', e);
            alert('Lỗi khi tạo PDF');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
            <Button
                variant="ghost"
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 h-auto"
                onClick={() => setShowPreview(true)}
                title="Tạo hợp đồng"
            >
                <FileText className="h-4 w-4" />
            </Button>

            {/* Modal Overlay */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowPreview(false);
                    }}
                >
                    <div className="bg-gray-100 rounded-lg shadow-2xl max-w-[900px] w-full mx-4 relative">
                        {/* Toolbar */}
                        <div className="sticky top-0 z-10 bg-white border-b px-6 py-3 flex items-center justify-between rounded-t-lg">
                            <h2 className="text-lg font-bold text-gray-800">Xem trước hợp đồng</h2>
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={handleDownloadPdf}
                                    disabled={isGenerating}
                                    className="bg-green-600 hover:bg-green-700 text-white text-sm"
                                >
                                    <Download className="h-4 w-4 mr-1" />
                                    {isGenerating ? 'Đang tạo...' : 'Tải PDF'}
                                </Button>
                                <Button variant="ghost" onClick={() => setShowPreview(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Contract Content */}
                        <div className="p-4">
                            <div ref={contractRef}>
                                <div style={{
                                    backgroundColor: 'white',
                                    maxWidth: '800px',
                                    margin: '0 auto',
                                    padding: '40px 50px',
                                    fontFamily: '"Times New Roman", Times, serif',
                                    lineHeight: 1.4,
                                    color: '#000',
                                    fontSize: '14px',
                                    textAlign: 'left'
                                }}>
                                    {/* Contract ID */}
                                    <div style={{ textAlign: 'right', fontSize: '14px' }}>
                                        Số: {contractId}
                                    </div>

                                    {/* Header */}
                                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                        <h2 style={{ margin: '5px 0', fontSize: '18px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                                            CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM
                                        </h2>
                                        <p style={{ margin: '2px 0', fontWeight: 'bold' }}>Độc lập - Tự do - Hạnh phúc</p>
                                        <div style={{ width: '150px', borderBottom: '1px solid black', margin: '5px auto' }}></div>
                                    </div>

                                    {/* Title */}
                                    <div style={{ textAlign: 'center', marginTop: '30px', marginBottom: '20px' }}>
                                        <h1 style={{ fontSize: '20px', marginBottom: '5px', fontWeight: 'bold' }}>
                                            HỢP ĐỒNG BÁN HÀNG TRẢ CHẬM
                                        </h1>
                                        <h1 style={{ fontSize: '20px', marginBottom: '5px', fontWeight: 'bold' }}>
                                            KIÊM XÁC NHẬN THU TIỀN
                                        </h1>
                                    </div>

                                    {/* Info */}
                                    <div style={{ marginBottom: '10px' }}>
                                        <p><strong>Hôm nay, ngày {date.day}/{date.month}/{date.year} tại địa điểm:</strong></p>
                                        <p>154 Nguyễn Thuỵ, Phường Nghĩa Lộ, Quảng Ngãi, Việt Nam</p>

                                        <p><strong>Chúng tôi gồm có:</strong></p>

                                        <div style={{ marginBottom: '5px' }}>
                                            <strong>Bên A (Bên bán): Doanh nghiệp Tư nhân Vàng Bạc Hoa Tùng</strong><br />
                                            Đại diện: Ông Bùi Tấn Anh Thảo - Chủ doanh nghiệp<br />
                                            Địa chỉ: Số 209 Nguyễn Thụy, Nghĩa Lộ, Quảng Ngãi<br />
                                            Ngân hàng: Vietcombank - DNTN Hiệu Vàng Hoa Tùng | Số TK: 1047400973
                                        </div>

                                        <div style={{ marginTop: '15px', marginBottom: '5px' }}>
                                            <strong>Bên B (Bên mua):</strong>{' '}
                                            {customer?.name || '.....................................................................................................'}<br />
                                            CCCD/Hộ chiếu số: {customer?.cccd || '......................................'}{' '}
                                            Ngày cấp: .................... Nơi cấp: CCS<br />
                                            Địa chỉ thường trú:{' '}
                                            {customer?.address || '...................................................................................................'}<br />
                                            Điện thoại:{' '}
                                            {customer?.phone_number || '................................................................................................................'}
                                        </div>
                                    </div>

                                    <p>Sau khi thoả thuận cùng nhau ký kết hợp đồng mua hàng với các điều khoản sau:</p>

                                    {/* Điều 1 */}
                                    <span style={{ fontWeight: 'bold', textDecoration: 'underline', marginTop: '15px', display: 'block' }}>
                                        Điều 1: Số lượng giao dịch: Bên B đồng ý mua của bên A chi tiết như sau:
                                    </span>
                                    <table style={{
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        margin: '15px 0',
                                        fontSize: '14px'
                                    }}>
                                        <thead>
                                            <tr>
                                                <th style={thStyle}>STT</th>
                                                <th style={thStyle}>Tên hàng</th>
                                                <th style={thStyle}>HL vàng/bạc</th>
                                                <th style={thStyle}>SL(cái)</th>
                                                <th style={thStyle}>KL/1SP (lượng/kg)</th>
                                                <th style={thStyle}>Tổng KL (lượng/kg)</th>
                                                <th style={thStyle}>Đơn giá/lượng (VND)</th>
                                                <th style={thStyle}>Thành tiền (VND)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {grouped.map((g, idx) => (
                                                <tr key={idx}>
                                                    <td style={tdStyle}>{idx + 1}</td>
                                                    <td style={tdStyle}>{g.label}</td>
                                                    <td style={tdStyle}>{g.purity}</td>
                                                    <td style={tdStyle}>{g.quantity}</td>
                                                    <td style={tdStyle}>
                                                        {(g.productType.includes('1KG') || g.productType.includes('1 kg')) ? '1 KG' :
                                                            (g.productType.includes('5L') || g.productType.includes('5 lượng')) ? '5 Lượng' :
                                                                (g.productType.includes('1L') || g.productType.includes('1 lượng')) ? '1 Lượng' :
                                                                    formatVND(g.weightPerUnit)}
                                                    </td>
                                                    <td style={tdStyle}>
                                                        {(g.productType.includes('1KG') || g.productType.includes('1 kg')) ? `${g.quantity} KG` :
                                                            (g.productType.includes('5L') || g.productType.includes('5 lượng')) ? `${g.quantity * 5} Lượng` :
                                                                (g.productType.includes('1L') || g.productType.includes('1 lượng')) ? `${g.quantity} Lượng` :
                                                                    formatVND(g.totalWeight)}
                                                    </td>
                                                    <td style={tdStyle}>{formatVND(g.pricePerUnit)}</td>
                                                    <td style={tdStyle}>{formatVND(g.totalPrice)}</td>
                                                </tr>
                                            ))}
                                            <tr style={{ fontWeight: 'bold' }}>
                                                <td style={tdStyle} colSpan={3}>Tổng cộng:</td>
                                                <td style={tdStyle}>{totalQty}</td>
                                                <td style={tdStyle}></td>
                                                <td style={tdStyle}>
                                                    {(() => {
                                                        let totalKg = 0;
                                                        let totalLuong = 0;
                                                        let otherWeight = 0;

                                                        grouped.forEach(g => {
                                                            if (g.productType.includes('1KG') || g.productType.includes('1 kg')) {
                                                                totalKg += g.quantity;
                                                            } else if (g.productType.includes('5L') || g.productType.includes('5 lượng')) {
                                                                totalLuong += g.quantity * 5;
                                                            } else if (g.productType.includes('1L') || g.productType.includes('1 lượng')) {
                                                                totalLuong += g.quantity;
                                                            } else {
                                                                otherWeight += g.totalWeight;
                                                            }
                                                        });

                                                        const parts = [];
                                                        if (totalKg > 0) parts.push(`${totalKg} KG`);
                                                        if (totalLuong > 0) parts.push(`${totalLuong} Lượng`);
                                                        if (otherWeight > 0) parts.push(formatVND(otherWeight));

                                                        return parts.length > 0 ? parts.join(', ') : formatVND(totalWeight);
                                                    })()}
                                                </td>
                                                <td style={tdStyle}></td>
                                                <td style={tdStyle}>{formatVND(totalPrice)}</td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    <p><strong>Thành tiền (bằng chữ):</strong> {totalInWords}.</p>

                                    {/* Điều 2 */}
                                    <span style={{ fontWeight: 'bold', textDecoration: 'underline', marginTop: '15px', display: 'block' }}>
                                        Điều 2: Thời hạn giao hàng và phương thức thanh toán:
                                    </span>
                                    <ul style={{ paddingLeft: '20px' }}>
                                        <li>
                                            <strong>Phương thức chốt giá:</strong> Đơn giá bán được xác định vào thời điểm {date.time} ngày {date.day}/{date.month}/{date.year} sau
                                            khi hai bên đạt được thỏa thuận qua hình thức: Trực tiếp
                                        </li>
                                        <li>
                                            <strong>Phương thức thanh toán:</strong> Bên B giao cho bên A 100% tổng số tiền của hợp đồng khi hợp
                                            đồng này được lập.
                                        </li>
                                        <li>
                                            <strong>Thời hạn giao hàng:</strong> Bên A trả hàng cho bên B vào <strong>sau 100 ngày</strong> (Quý
                                            khách phải mang theo CCCD/VNeID).
                                        </li>
                                    </ul>

                                    {/* Điều 3 */}
                                    <span style={{ fontWeight: 'bold', textDecoration: 'underline', marginTop: '15px', display: 'block' }}>
                                        Điều 3: Những cam kết chung:
                                    </span>
                                    <ol style={{ paddingLeft: '20px' }}>
                                        <li>Bên A chỉ trả hàng cho bên B khi bên B xuất trình CCCD/VNeID có thông tin ghi đúng như trong hợp đồng này.</li>
                                        <li>Bên A có trách nhiệm trả hàng đúng thời hạn cam kết.</li>
                                        <li>Bên A chỉ trả hàng cho chính chủ, không giải quyết các trường hợp lấy hộ.</li>
                                    </ol>

                                    {/* Điều 4 */}
                                    <span style={{ fontWeight: 'bold', textDecoration: 'underline', marginTop: '15px', display: 'block' }}>
                                        Điều 4: Hiệu lực thỏa thuận:
                                    </span>
                                    <p>Hợp đồng có giá trị kể từ ngày ký và tự động hết hiệu lực khi hai bên hoàn tất nghĩa vụ giao nhận.</p>

                                    {/* Signatures */}
                                    <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between' }}>
                                        <div style={{ textAlign: 'center', width: '45%' }}>
                                            <strong>BÊN B</strong><br />
                                            (Ký, ghi rõ họ tên)
                                        </div>
                                        <div style={{ textAlign: 'center', width: '45%' }}>
                                            <strong>BÊN A</strong><br />
                                            (Ký tên và đóng dấu)
                                            <div style={{
                                                height: '100px',
                                                color: '#ccc',
                                                fontStyle: 'italic',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                (Đã thu tiền)
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Shared table cell styles for inline rendering (required for html2pdf)
const thStyle: React.CSSProperties = {
    border: '1px solid black',
    padding: '8px',
    textAlign: 'center',
    fontWeight: 'bold',
    backgroundColor: '#f9f9f9'
};

const tdStyle: React.CSSProperties = {
    border: '1px solid black',
    padding: '8px',
    textAlign: 'center'
};
