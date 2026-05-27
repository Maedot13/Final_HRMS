import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { leaveApi } from '../../api/leave';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import {
    FiCalendar, FiClock, FiUser, FiMessageSquare,
    FiFile, FiEye, FiDownload, FiMaximize2, FiZoomIn, FiXCircle
} from 'react-icons/fi';

interface LeaveDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    leaveId: number | null;
}

export function LeaveDetailModal({ isOpen, onClose, leaveId }: LeaveDetailModalProps) {
    const { data: leave, isLoading } = useQuery({
        queryKey: ['leaveDetail', leaveId],
        queryFn: async () => {
            if (!leaveId) return null;
            const res = await leaveApi.getById(leaveId);
            return res.data;
        },
        enabled: !!leaveId && isOpen,
    });

    const [zoomLevel, setZoomLevel] = useState(1);
    const [isImageFullscreen, setIsImageFullscreen] = useState(false);
    const [showPdfViewer, setShowPdfViewer] = useState(false);

    if (!isOpen) return null;

    const handleClose = () => {
        setZoomLevel(1);
        setIsImageFullscreen(false);
        setShowPdfViewer(false);
        onClose();
    };

    const statusVariants: Record<string, 'info' | 'approved' | 'rejected' | 'neutral' | 'warning'> = {
        PENDING: 'warning',
        APPROVED: 'approved',
        REJECTED: 'rejected',
        CANCELLED: 'neutral',
    };

    const handleDownload = async (url: string, fileName: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
            toast.success('File download started.');
        } catch (error) {
            // Fallback for CORS limits
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    // Parse Document Metadata and Details
    const docDetails = (() => {
        if (!leave) return null;
        if (leave.leaveDocument) {
            return {
                fileName: leave.leaveDocument.fileName,
                fileType: leave.leaveDocument.fileType,
                fileUrl: leave.leaveDocument.fileUrl,
            };
        }
        if (leave.attachmentUrl) {
            const url = leave.attachmentUrl;
            const fileName = url.substring(url.lastIndexOf('/') + 1);
            const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
            let fileType = 'application/octet-stream';
            if (['.jpg', '.jpeg', '.png'].includes(ext)) {
                fileType = `image/${ext.replace('.', '') === 'jpg' ? 'jpeg' : ext.replace('.', '')}`;
            } else if (ext === '.pdf') {
                fileType = 'application/pdf';
            }
            return { fileName, fileType, fileUrl: url };
        }
        return null;
    })();

    const isImage = docDetails?.fileType.startsWith('image/') || false;
    const isPDF = docDetails?.fileType === 'application/pdf' || false;

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Leave Request Details" size="lg">
            {isLoading ? (
                <div className="py-16 flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : leave ? (
                <div className="space-y-6 pt-2">
                    {/* Status Banner */}
                    <div className={`rounded-lg p-4 flex items-center justify-between ${
                        leave.status === 'APPROVED' ? 'bg-green-50' :
                        leave.status === 'REJECTED' ? 'bg-red-50' :
                        leave.status === 'PENDING' ? 'bg-amber-50' : 'bg-gray-50'
                    }`}>
                        <div className="flex items-center gap-3">
                            <FiCalendar className="w-5 h-5 text-gray-500" />
                            <div>
                                <span className="capitalize font-medium text-gray-900">
                                    {leave.leaveType?.toLowerCase().replace('_', ' ')} Leave
                                </span>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {leave.days ?? Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} day(s)
                                </p>
                            </div>
                        </div>
                        <Badge variant={statusVariants[leave.status] || 'neutral'}>
                            {leave.status}
                        </Badge>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-start gap-2">
                            <FiUser className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                                <span className="text-gray-500 block text-xs">Employee</span>
                                <span className="font-medium text-gray-900">
                                    {leave.employee?.name || 'You'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <FiClock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                                <span className="text-gray-500 block text-xs">Period</span>
                                <span className="font-medium text-gray-900">
                                    {format(new Date(leave.startDate), 'MMM d, yyyy')} — {format(new Date(leave.endDate), 'MMM d, yyyy')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <FiMessageSquare className="w-4 h-4 text-gray-400" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</span>
                        </div>
                        <p className="text-sm text-gray-800 leading-relaxed">
                            {leave.reason || 'No reason provided.'}
                        </p>
                    </div>

                    {/* Reviewer Comment (if exists) */}
                    {leave.reviewComment && (
                        <div className={`rounded-lg p-4 ${leave.status === 'REJECTED' ? 'bg-red-50' : 'bg-green-50'}`}>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                                Reviewer Comment
                            </span>
                            <p className="text-sm text-gray-800">{leave.reviewComment}</p>
                        </div>
                    )}

                    {/* Secure Cloudinary Document Attachment Display */}
                    {docDetails && (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                    <FiFile className="w-5 h-5 text-primary shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Supporting Document</p>
                                        <p className="text-sm font-semibold text-gray-800 truncate">{docDetails.fileName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleDownload(docDetails.fileUrl, docDetails.fileName)}
                                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm"
                                        title="Download Document"
                                    >
                                        <FiDownload className="w-4 h-4" />
                                    </button>
                                    {isPDF && (
                                        <button
                                            type="button"
                                            onClick={() => setShowPdfViewer(!showPdfViewer)}
                                            className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all shadow-sm
                                                ${showPdfViewer 
                                                    ? 'bg-primary text-white border-primary' 
                                                    : 'bg-white text-gray-600 border-gray-200 hover:text-primary hover:border-primary'
                                                }`}
                                            title={showPdfViewer ? "Hide Preview" : "Preview PDF"}
                                        >
                                            <FiEye className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Image Preview & Zoom/Expand */}
                            {isImage && (
                                <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-white p-2">
                                    <img
                                        src={docDetails.fileUrl}
                                        alt={docDetails.fileName}
                                        className={`w-full max-h-60 object-contain rounded transition-transform duration-200 cursor-pointer ${
                                            zoomLevel === 1.5 ? 'scale-150' : zoomLevel === 2 ? 'scale-200' : 'scale-100'
                                        }`}
                                        onClick={() => setIsImageFullscreen(true)}
                                    />
                                    <div className="absolute bottom-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm rounded-lg p-1">
                                        <button
                                            type="button"
                                            onClick={() => setZoomLevel(z => z === 1 ? 1.5 : z === 1.5 ? 2 : 1)}
                                            className="p-1 text-white hover:text-primary transition-colors"
                                            title="Zoom Image"
                                        >
                                            <FiZoomIn className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsImageFullscreen(true)}
                                            className="p-1 text-white hover:text-primary transition-colors"
                                            title="Full Screen"
                                        >
                                            <FiMaximize2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* PDF Viewer inside an iframe */}
                            {isPDF && showPdfViewer && (
                                <div className="rounded-lg overflow-hidden border border-gray-200 bg-white h-96">
                                    <iframe
                                        src={`${docDetails.fileUrl}#toolbar=0&navpanes=0`}
                                        title="PDF Document Viewer"
                                        className="w-full h-full border-none"
                                    ></iframe>
                                </div>
                            )}

                            {/* Unsupported Format Graceful Display */}
                            {!isImage && !isPDF && (
                                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                                    <span>This file format cannot be previewed inline. Please download to view.</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Timestamps */}
                    <div className="border-t border-gray-100 pt-4 text-xs text-gray-400 flex justify-between">
                        <span>Created: {leave.createdAt ? format(new Date(leave.createdAt), 'MMM d, yyyy HH:mm') : '—'}</span>
                        {leave.updatedAt && (
                            <span>Updated: {format(new Date(leave.updatedAt), 'MMM d, yyyy HH:mm')}</span>
                        )}
                    </div>
                </div>
            ) : (
                <div className="py-10 text-center text-gray-500">Failed to load leave details.</div>
            )}

            {/* Lightbox / Fullscreen Image Viewer */}
            {isImageFullscreen && docDetails && (
                <div 
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-4 transition-all duration-300"
                    onClick={() => setIsImageFullscreen(false)}
                >
                    <button
                        type="button"
                        onClick={() => setIsImageFullscreen(false)}
                        className="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        title="Close Fullscreen"
                    >
                        <FiXCircle className="w-6 h-6" />
                    </button>
                    <div 
                        className="relative max-w-4xl max-h-[80vh] overflow-auto rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={docDetails.fileUrl}
                            alt={docDetails.fileName}
                            className="max-w-full max-h-[80vh] object-contain rounded-lg"
                        />
                    </div>
                    <div className="mt-4 flex items-center gap-4 text-white text-sm">
                        <span className="font-medium truncate max-w-xs">{docDetails.fileName}</span>
                        <button
                            type="button"
                            onClick={() => handleDownload(docDetails.fileUrl, docDetails.fileName)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/80 text-white font-medium transition-colors"
                        >
                            <FiDownload className="w-4 h-4" /> Download
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
