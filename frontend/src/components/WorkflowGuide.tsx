import { MoveRight, ArrowRight, ArrowDown } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';

interface StepProps {
    title: string;
    sub?: string;
    color: 'blue' | 'purple' | 'orange' | 'green' | 'red' | 'teal' | 'pink' | 'indigo' | 'yellow';
}

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const arrowVariants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: { opacity: 1, scale: 1 }
};

function Step({ title, sub, color }: StepProps) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-100',
        purple: 'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-100',
        orange: 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-100',
        green: 'bg-green-50 text-green-700 border-green-200 ring-1 ring-green-100',
        red: 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-100',
        teal: 'bg-teal-50 text-teal-700 border-teal-200 ring-1 ring-teal-100',
        pink: 'bg-pink-50 text-pink-700 border-pink-200 ring-1 ring-pink-100',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-100',
        yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200 ring-1 ring-yellow-100',
    };

    return (
        <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.05, boxShadow: "0px 5px 15px rgba(0,0,0,0.1)" }}
            className={`flex flex-col items-center justify-center p-3 rounded-lg ${colorClasses[color]} w-40 md:w-48 text-center min-h-[80px] shadow-sm cursor-default transition-shadow z-10 bg-white bg-opacity-95`}
        >
            <span className="font-bold text-sm block mb-1">{title}</span>
            {sub && <span className="text-xs opacity-80 block">{sub}</span>}
        </motion.div>
    );
}

function ArrowHorizontal() {
    return (
        <motion.div variants={arrowVariants} className="text-gray-300 px-2">
            <MoveRight className="w-6 h-6" />
        </motion.div>
    );
}

function ArrowVertical() {
    return (
        <motion.div variants={arrowVariants} className="text-gray-300 py-2">
            <ArrowDown className="w-6 h-6" />
        </motion.div>
    );
}

export function WorkflowGuide() {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 }
        }
    };

    return (
        <div className="mt-8 space-y-6">
            <div className="flex items-center gap-3 border-b pb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                    <ArrowRight className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Quy trình Tổng hợp</h2>
                    <p className="text-sm text-gray-500">Sơ đồ luồng xử lý đơn hàng NSX và Khách hàng</p>
                </div>
            </div>

            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={containerVariants}
                className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 relative overflow-x-auto min-w-full"
            >
                {/* 1. Common Start */}
                <div className="flex flex-col items-center min-w-[800px]">
                    <div className="flex items-center">
                        <Step color="blue" title="Khách hàng cọc" sub="(Đơn cọc KH)" />
                        <ArrowHorizontal />
                        <Step color="purple" title="Admin đặt hàng" sub="(Đơn cọc NSX)" />
                    </div>

                    {/* Fork Connector */}
                    <div className="h-12 w-full max-w-4xl relative flex justify-center">
                        {/* Vertical line from parent */}
                        <div className="h-full w-0.5 bg-gray-300"></div>
                        {/* Horizontal line spanning branches centers (approx 50%) */}
                        <div className="absolute bottom-0 w-[50%] h-0.5 bg-gray-300"></div>
                        {/* Vertical lines to children */}
                        <div className="absolute bottom-0 w-[50%] flex justify-between">
                            <div className="h-3 w-0.5 bg-gray-300 translate-y-0.5"></div>
                            <div className="h-3 w-0.5 bg-gray-300 translate-y-0.5"></div>
                        </div>
                    </div>

                    {/* Main Branches */}
                    <div className="flex justify-between w-full max-w-4xl relative">

                        {/* LEFT: Standard Flow */}
                        <div className="flex flex-col items-center flex-1 pt-4">
                            <motion.div variants={itemVariants} className="mb-4 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm z-20">
                                Quy trình Giao hàng
                            </motion.div>

                            <Step color="orange" title="Nhận hàng NSX" sub="(Cửa hàng đợi nhận)" />
                            <ArrowVertical />
                            <Step color="green" title="Giao hàng KH" sub="(Đưa hàng cho khách)" />
                        </div>

                        {/* RIGHT: Buyback Flow */}
                        <div className="flex flex-col items-center flex-1 pt-4">
                            <motion.div variants={itemVariants} className="mb-4 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm z-20">
                                Quy trình Mua lại
                            </motion.div>

                            <Step color="red" title="Mua lại đơn KH" sub="(Khách hàng bán cọc)" />

                            {/* Inner Fork Connector */}
                            <div className="h-8 w-full max-w-lg relative flex justify-center">
                                <div className="h-full w-0.5 bg-gray-300"></div>
                                <div className="absolute bottom-0 w-[50%] h-0.5 bg-gray-300"></div>
                                <div className="absolute bottom-0 w-[50%] flex justify-between">
                                    <div className="h-3 w-0.5 bg-gray-300 translate-y-0.5"></div>
                                    <div className="h-3 w-0.5 bg-gray-300 translate-y-0.5"></div>
                                </div>
                            </div>

                            {/* Inner Branches */}
                            <div className="flex justify-between w-full max-w-lg pt-4">
                                {/* Left Sub: Sell back NSX */}
                                <div className="flex flex-col items-center flex-1 px-2">
                                    <Step color="pink" title="Bán lại NSX" sub="(Bán lại đơn NSX)" />
                                </div>

                                {/* Right Sub: Stock & Resell */}
                                <div className="flex flex-col items-center flex-1 px-2">
                                    <Step color="teal" title="Cho đơn vào kho" sub="(Nhập kho)" />
                                    <ArrowVertical />
                                    <Step color="blue" title="Bán khách khác" sub="(Đơn cọc KH)" />
                                    <ArrowVertical />
                                    <Step color="orange" title="Nhận hàng NSX" sub="(Cửa hàng đợi nhận)" />
                                    <ArrowVertical />
                                    <Step color="green" title="Giao hàng KH" sub="(Đưa hàng cho khách)" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
