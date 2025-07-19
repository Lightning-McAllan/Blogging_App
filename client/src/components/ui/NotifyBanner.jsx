import { useEffect, useState } from 'react';
import { Info, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

const NotifyBanner = ({ 
    message, 
    subMessage,
    type = 'info', 
    duration = 3000, 
    onClose,
    onRetry,
    canRetry = false,
    isRetrying = false,
    persistent = false
}) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (persistent) return; // Don't auto-close persistent banners
        
        const timeout = setTimeout(() => {
            setVisible(false);
            onClose?.();
        }, duration);

        return () => clearTimeout(timeout);
    }, [duration, onClose, persistent]);

    if (!visible) return null;

    // Configuration for different notification types
    const typeConfig = {
        info: {
            icon: Info,
            bgColor: 'bg-[#2A2E36]',
            borderColor: 'border-blue-500',
            iconColor: 'text-blue-500',
            textColor: 'text-white'
        },
        success: {
            icon: CheckCircle,
            bgColor: 'bg-[#2A2E36]',
            borderColor: 'border-green-500',
            iconColor: 'text-green-500',
            textColor: 'text-white'
        },
        error: {
            icon: XCircle,
            bgColor: 'bg-[#2A2E36]',
            borderColor: 'border-red-500',
            iconColor: 'text-red-500',
            textColor: 'text-white'
        },
        warning: {
            icon: AlertTriangle,
            bgColor: 'bg-[#2A2E36]',
            borderColor: 'border-yellow-500',
            iconColor: 'text-yellow-500',
            textColor: 'text-white'
        }
    };

    const config = typeConfig[type] || typeConfig.info;
    const IconComponent = config.icon;

    return (
        <div className="fixed bottom-5 right-5 z-50">
            <div className={`flex items-center ${config.bgColor} border-l-4 ${config.borderColor} ${config.textColor} px-4 py-3 rounded-lg shadow-lg w-[350px] animate-bounce-in`}>
                <IconComponent className={`${config.iconColor} mr-3 w-5 h-5 flex-shrink-0`} />
                <div className="flex-grow">
                    <p className="text-sm font-medium">{message}</p>
                    {subMessage && (
                        <p className="text-xs opacity-80 mt-1">{subMessage}</p>
                    )}
                </div>
                
                {/* Retry button for retryable errors */}
                {canRetry && onRetry && (
                    <button
                        onClick={onRetry}
                        disabled={isRetrying}
                        className={`ml-2 p-1 rounded hover:bg-gray-600 transition-colors flex-shrink-0 ${
                            isRetrying ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title="Retry"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                    </button>
                )}
                
                {/* Close button */}
                <button
                    onClick={() => {
                        setVisible(false);
                        onClose?.();
                    }}
                    className="ml-2 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                    title="Close"
                >
                    ×
                </button>
            </div>
        </div>
    );
};

export default NotifyBanner;